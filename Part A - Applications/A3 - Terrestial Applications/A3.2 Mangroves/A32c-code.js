//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.2 Mangroves
//  Checkpoint:   A32c
//  Author:       Aurélie Shapiro
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Create an ee.Geometry.
var aoi = ee.Geometry.Polygon([
    [
        [88.3, 22.61],
        [90, 22.61],
        [90, 21.47],
        [88.3, 21.47]
    ]
]);

// Locate a coordinate in the aoi with land and water.
var point = ee.Geometry.Point([89.2595, 21.7317]);

// Position the map.
Map.centerObject(point, 13);
Map.addLayer(aoi, {}, 'AOI');

// Sentinel-1 wet season data.
var wetS1 = ee.Image(
    'projects/gee-book/assets/A3-2/wet_season_tscan_2020');
// Sentinel-1 dry season data.
var dryS1 = ee.Image(
    'projects/gee-book/assets/A3-2/dry_season_tscan_2020');
// Sentinel-2 mosaic.
var S2 = ee.Image('projects/gee-book/assets/A3-2/Sundarbans_S2_2020');

//Visualize the input data.
var s1VisParams = {
    bands: ['VV_min', 'VH_min', 'VVVH_ratio_min'],
    min: -36,
    max: 3
};
var s2VisParams = {
    bands: ['swir1', 'nir', 'red'],
    min: 82,
    max: 3236
};

Map.addLayer(dryS1, s1VisParams, 'S1 dry', false);
Map.addLayer(wetS1, s1VisParams, 'S1 wet', false);
Map.addLayer(S2, s2VisParams, 'S2 2020');

var NDVI = S2.normalizedDifference(['nir', 'red']).rename(['NDVI']);

var ratio_swir1_nir = S2.expression(
        'swir1/(nir+0.1)', {
            'swir1': S2.select('swir1'),
            'nir': S2.select('nir')
        })
    .rename('ratio_swir1_nir_wet');

var data_stack = S2.addBands(NDVI).addBands(ratio_swir1_nir).addBands(
    dryS1).addBands(wetS1).addBands(S2);

print(data_stack);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

/*** 
 * This script computes surface water mask using 
 * Canny Edge detector and Otsu thresholding.
 * See the following paper for details: 
 * http://www.mdpi.com/2072-4292/8/5/386
 * 
 * Author: Gennadii Donchyts 
 * Contributors: Nicholas Clinton 
 * 
 */

/***
 * Return the DN that maximizes interclass variance in B5 (in the region).
 */
var otsu = function(histogram) {
    histogram = ee.Dictionary(histogram);

    var counts = ee.Array(histogram.get('histogram'));
    var means = ee.Array(histogram.get('bucketMeans'));
    var size = means.length().get([0]);
    var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
    var sum = means.multiply(counts).reduce(ee.Reducer.sum(), [0])
        .get([0]);
    var mean = sum.divide(total);

    var indices = ee.List.sequence(1, size);

    // Compute between sum of squares, where each mean partitions the data.
    var bss = indices.map(function(i) {
        var aCounts = counts.slice(0, 0, i);
        var aCount = aCounts.reduce(ee.Reducer.sum(), [0])
            .get([0]);
        var aMeans = means.slice(0, 0, i);
        var aMean = aMeans.multiply(aCounts)
            .reduce(ee.Reducer.sum(), [0]).get([0])
            .divide(aCount);
        var bCount = total.subtract(aCount);
        var bMean = sum.subtract(aCount.multiply(aMean))
            .divide(bCount);
        return aCount.multiply(aMean.subtract(mean).pow(
            2)).add(
            bCount.multiply(bMean.subtract(mean).pow(
                2)));
    });

    // Return the mean value corresponding to the maximum BSS.
    return means.sort(bss).get([-1]);
};

/***
 * Compute a threshold using Otsu method (bimodal).
 */

function computeThresholdUsingOtsu(image, scale, bounds,
    cannyThreshold,
    cannySigma, minValue, debug) {
    // Clip image edges.
    var mask = image.mask().gt(0)
        .focal_min(ee.Number(scale).multiply(3), 'circle', 'meters');

    // Detect sharp changes.
    var edge = ee.Algorithms.CannyEdgeDetector(image, cannyThreshold,
        cannySigma);
    edge = edge.multiply(mask);

    // Buffer around NDWI edges.
    var edgeBuffer = edge
        .focal_max(ee.Number(scale).multiply(1), 'square', 'meters');
    var imageEdge = image.mask(edgeBuffer);

    // Compute threshold using Otsu thresholding.
    var buckets = 100;
    var hist = ee.Dictionary(ee.Dictionary(imageEdge
            .reduceRegion({
                reducer: ee.Reducer.histogram(buckets),
                geometry: bounds,
                scale: scale,
                maxPixels: 1e9
            }))
        .values()
        .get(0));

    var threshold = ee.Number(ee.Algorithms.If({
        condition: hist.contains('bucketMeans'),
        trueCase: otsu(hist),
        falseCase: 0.3
    }));

    if (debug) {
        Map.addLayer(edge.mask(edge), {
            palette: ['ff0000']
        }, 'edges', false);
        print('Threshold: ', threshold);
        print(ui.Chart.image.histogram(image, bounds, scale,
            buckets));
        print(ui.Chart.image.histogram(imageEdge, bounds, scale,
            buckets));
    }

    return minValue !== 'undefined' ? threshold.max(minValue) :
        threshold;
}

var bounds = ee.Geometry(Map.getBounds(true));

var image = data_stack;
print('image', image);

var ndwi_for_water = image.normalizedDifference(['green', 'nir']);
var debug = true;
var scale = 10;
var cannyThreshold = 0.9;
var cannySigma = 1;
var minValue = -0.1;
var th = computeThresholdUsingOtsu(ndwi_for_water, scale, bounds,
    cannyThreshold, cannySigma, minValue, debug);

print('th', th);

function getEdge(mask) {
    return mask.subtract(mask.focal_min(1));
}

var water_mask = ndwi_for_water.mask(ndwi_for_water.gt(th));

th.evaluate(function(th) {
  Map.addLayer(water_mask, {palette: '0000ff'}, 'water mask (th=' + th + ')');
});  

// Create land mask area.
var land = water_mask.unmask();
var land_mask = land.eq(0);
Map.addLayer(land_mask, {}, 'Land mask', false);

// Remove areas with elevation greater than mangrove elevation threshold.
var elev_thresh = 40;
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var elev_mask = dem.lte(elev_thresh);
var land_mask = land_mask.updateMask(elev_mask);

// Load global mangrove dataset as reference for training.
var mangrove_ref = ee.ImageCollection('LANDSAT/MANGROVE_FORESTS')
    .filterBounds(aoi)
    .first()
    .clip(aoi);
Map.addLayer(mangrove_ref, {
    palette: 'Green'
}, 'Reference Mangroves', false);

// Buffer around known mangrove area with a specified distance.
var buffer_dist = 1000;
var mang_buffer = mangrove_ref
    .focal_max(buffer_dist, 'square', 'meters')
    .rename('mangrove_buffer');
Map.addLayer(mang_buffer, {}, 'Mangrove Buffer', false);

// Mask land from mangrove buffer.
var area_to_classify = mang_buffer.updateMask(land_mask).selfMask();
Map.addLayer(area_to_classify,
    {},
    'Mangrove buffer with water and elevation mask',
    false);
var image_to_classify = data_stack.updateMask(area_to_classify);
Map.addLayer(image_to_classify,
    {
        bands: ['swir1', 'nir', 'red'],
        min: 82,
        max: 3236
    },
    'Masked Data Stack',
    false);
    
// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// Create training data from existing data
// Class values: mangrove = 1, not mangrove = 0
var ref_mangrove = mangrove_ref.unmask();
var mangroveVis = {
    min: 0,
    max: 1,
    palette: ['grey', 'green']
};
Map.addLayer(ref_mangrove, mangroveVis, 'mangrove = 1');

// Class values: not mangrove = 1 and mangrove = 0
var notmang = ref_mangrove.eq(0);
var notMangroveVis = {
    min: 0,
    max: 1,
    palette: ['grey', 'red'] 
};
Map.addLayer(notmang, notMangroveVis, 'not mangrove = 1', false);

// Define a kernel for core mangrove areas.
var kernel = ee.Kernel.circle({
    radius: 3
});

// Perform a dilation to identify core mangroves.
var mang_dilate = ref_mangrove
    .focal_min({
        kernel: kernel,
        iterations: 3
    });
var mang_dilate = mang_dilate.updateMask(mang_dilate);
var mang_dilate = mang_dilate.rename('auto_train').unmask();
Map.addLayer(mang_dilate, {}, 'Core mangrove areas to sample', false);

// Do the same for non-mangrove areas.
var kernel1 = ee.Kernel.circle({
    radius: 3
});
var notmang_dilate = notmang
    .focal_min({
        kernel: kernel1,
        iterations: 2
    });
var notmang_dilate = notmang_dilate.updateMask(notmang_dilate);
var notmang_dilate = notmang_dilate.multiply(2).unmask().rename(
    'auto_train');
Map.addLayer(notmang_dilate, {}, 'Not mangrove areas to sample',
    false);

// Core mangrove = 1, core non mangrove = 2, neither = 0.
var train_labels = notmang_dilate.add(mang_dilate).clip(aoi);
var train_labels = train_labels.int8().updateMask(area_to_classify);
var trainingVis = {
    min: 0,
    max: 2,
    palette: ['grey', 'green', 'red']
};
Map.addLayer(train_labels, trainingVis, 'Training areas', false);

// Begin Classification.
// Get image and bands for training - including automatic training band.
var trainingImage = image_to_classify.addBands(train_labels);
var trainingBands = trainingImage.bandNames();
print(trainingBands, 'training bands');

// Get training samples and classify.
// Select the number of training samples per class.
var numPoints = 2000;
var numPoints2 = 2000;

var training = trainingImage.stratifiedSample({
    numPoints: 0,
    classBand: 'auto_train',
    region: aoi,
    scale: 100,
    classValues: [1, 2],
    classPoints: [numPoints, numPoints2],
    seed: 0,
    dropNulls: true,
    tileScale: 16,
});

var validation = trainingImage.stratifiedSample({
    numPoints: 0,
    classBand: 'auto_train',
    region: aoi,
    scale: 100,
    classValues: [1, 2],
    classPoints: [numPoints, numPoints2],
    seed: 1,
    dropNulls: true,
    tileScale: 16,
});

// Create a random forest classifier and train it.
var nTrees = 50;
var classifier = ee.Classifier.smileRandomForest(nTrees)
    .train(training, 'auto_train');

var classified = image_to_classify.classify(classifier);

// Classify the test set.
var validated = validation.classify(classifier);

// Get a confusion matrix representing resubstitution accuracy.
var trainAccuracy = classifier.confusionMatrix();
print('Resubstitution error matrix: ', trainAccuracy);
print('Training overall accuracy: ', trainAccuracy.accuracy());
var testAccuracy = validated.errorMatrix('mangrove',
    'classification');
    
var dict = classifier.explain();
print('Explain:', dict);

var variable_importance = ee.Feature(null, ee.Dictionary(dict).get(
    'importance'));

// Chart variable importance.
var chart = ui.Chart.feature.byProperty(variable_importance)
    .setChartType('ColumnChart')
    .setOptions({
        title: 'Random Forest Variable Importance',
        legend: {
            position: 'none'
        },
        hAxis: {
            title: 'Bands'
        },
        vAxis: {
            title: 'Importance'
        }
    });
print(chart);

var classificationVis = {
    min: 1,
    max: 2,
    palette: ['green', 'grey']
};
Map.addLayer(classified, classificationVis,
    'Mangrove Classification');

// Clean up results to remove small patches/pixels.
var mang_only = classified.eq(1);
// Compute the number of pixels in each connected mangrove patch 
// and apply the minimum mapping unit (number of pixels).
var mang_patchsize = mang_only.connectedPixelCount();

//mask pixels based on the number of connected neighbors
var mmu = 25;
var mang_mmu = mang_patchsize.gte(mmu);
var mang_mmu = classified.updateMask(mang_mmu).toInt8();
Map.addLayer(mang_mmu, classificationVis, 'Mangrove Map MMU');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
