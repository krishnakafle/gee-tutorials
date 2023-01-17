//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.3 Mangroves II - Change Mapping
//  Checkpoint:   A33b
//  Authors:      Celio de Sousa, David Lagomasino, and Lola Fatoyinbo
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// STEP 1 - ADD THE MAPS
var areaOfstudy = ee.FeatureCollection(
    'projects/gee-book/assets/A3-3/Border5km');
var mangrove2000 = ee.Image(
    'projects/gee-book/assets/A3-3/MangroveGuinea2000_v2');
var mangrove2020 = ee.Image(
    'projects/gee-book/assets/A3-3/MangroveGuinea2020_v2');

Map.setCenter(-13.6007, 9.6295, 10); 
// Sets the map center to Conakry, Guinea
Map.addLayer(areaOfstudy, {}, 'Area of Study');
Map.addLayer(mangrove2000, {
    palette: '#16a596'
}, 'Mangrove Extent 2000');
Map.addLayer(mangrove2020, {
    palette: '#9ad3bc'
}, 'Mangrove Extent 2020');

// STEP 2 -  MAP TO MAP CHANGE

var mang2020 = mangrove2020.unmask(0);
var mang2000 = mangrove2000.unmask(0);
var change = mang2020.subtract(mang2000)
    .clip(areaOfstudy);

var paletteCHANGE = [
    'red', // Loss/conversion
    'white', // No Change
    'green', // Gain/Expansion
];

Map.addLayer(change, {
    min: -1,
    max: 1,
    palette: paletteCHANGE
}, 'Changes 2000-2020');

// Calculate the area of each pixel
var gain = change.eq(1);
var loss = change.eq(-1);

var gainArea = gain.multiply(ee.Image.pixelArea().divide(1000000));
var lossArea = loss.multiply(ee.Image.pixelArea().divide(1000000));

// Sum all the areas
var statsgain = gainArea.reduceRegion({
    reducer: ee.Reducer.sum(),
    scale: 30,
    maxPixels: 1e14
});

var statsloss = lossArea.reduceRegion({
    reducer: ee.Reducer.sum(),
    scale: 30,
    maxPixels: 1e14
});

print(statsgain.get('classification'),
    'km² of new mangroves in 2020 in Guinea');
print(statsloss.get('classification'),
    'of mangrove was lost in 2020 in Guinea');

Map.addLayer(gain.selfMask(), {
    palette: 'green'
}, 'Gains');
Map.addLayer(loss.selfMask(), {
    palette: 'red'
}, 'Loss');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// SECTION 2

// STEP 1 - SET THE BASELINE EXTENT AND BUFFER

var buffer = 1000; // In meters 
var extentBuffer = mangrove2000.focal_max(buffer, 'circle', 'meters');
Map.addLayer(mangrove2000, {
    palette: '#000000'
}, 'Baseline', false);
Map.addLayer(extentBuffer, {
    palette: '#0e49b5',
    opacity: 0.3
}, 'Mangrove Buffer', false);

// STEP 2 - HARMONIZING LANDSAT 5/7/8 IMAGE COLLECTIONS

// 2.1 Temporal parameters
var startYear = 1984;
var endyear = 2020;
var startDay = '01-01';
var endDay = '12-31';

// 2.2 Harmonization function.
// Slopes and interceps were retrieved from Roy et. al (2016)
var harmonizationRoy = function(oli) {
    var slopes = ee.Image.constant([0.9785, 0.9542, 0.9825,
        1.0073, 1.0171, 0.9949
    ]);
    var itcp = ee.Image.constant([-0.0095, -0.0016, -0.0022, -
        0.0021, -0.0030, 0.0029
    ]);
    var y = oli.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7'], [
            'B1', 'B2', 'B3', 'B4', 'B5', 'B7'
        ])
        .resample('bicubic')
        .subtract(itcp.multiply(10000)).divide(slopes)
        .set('system:time_start', oli.get('system:time_start'));
    return y.toShort();
};

// 2.3 Retrieve a particular sensor function
var getSRcollection = function(year, startDay, endYear, endDay,
    sensor) {
    var srCollection = ee.ImageCollection('LANDSAT/' + sensor +
            '/C01/T1_SR')
        .filterDate(year + '-' + startDay, endYear + '-' + endDay)
        .map(function(img) {
            var dat;
            if (sensor == 'LC08') {
                dat = harmonizationRoy(img.unmask());
            } else {
                dat = img.select(['B1', 'B2', 'B3', 'B4',
                        'B5', 'B7'
                    ])
                    .unmask()
                    .resample('bicubic')
                    .set('system:time_start', img.get(
                        'system:time_start'));
            }
            // Cloud, cloud shadow and snow mask.
            var qa = img.select('pixel_qa');
            var mask = qa.bitwiseAnd(8).eq(0).and(
                qa.bitwiseAnd(16).eq(0)).and(
                qa.bitwiseAnd(32).eq(0));
            return dat.mask(mask);
        });
    return srCollection;
};

// 2.4 Combining the collections functio
var getCombinedSRcollection = function(year, startDay, endYear,
    endDay) {
    var lt5 = getSRcollection(year, startDay, endYear, endDay,
        'LT05');
    var le7 = getSRcollection(year, startDay, endYear, endDay,
        'LE07');
    var lc8 = getSRcollection(year, startDay, endYear, endDay,
        'LC08');
    var mergedCollection = ee.ImageCollection(le7.merge(lc8)
        .merge(lt5));
    return mergedCollection;
};

// 2.5 Calculating vegetation indices.
var addIndices = function(image) {
    var ndvi = image.normalizedDifference(['B4', 'B3']).rename(
        'NDVI');
    var evi = image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
            'NIR': image.select('B4'),
            'RED': image.select('B3'),
            'BLUE': image.select('B1')
        }).rename('EVI');
    var savi = image.expression(
        '((NIR - RED) / (NIR + RED + 0.5) * (0.5 + 1))', {
            'NIR': image.select('B4'),
            'RED': image.select('B3'),
            'BLUE': image.select('B1')
        }).rename('SAVI');
    var ndmi = image.normalizedDifference(['B7', 'B2']).rename(
        'NDMI');
    var ndwi = image.normalizedDifference(['B5', 'B4']).rename(
        'NDWI');
    var mndwi = image.normalizedDifference(['B2', 'B5']).rename(
        'MNDWI');
    return image.addBands(ndvi)
        .addBands(evi)
        .addBands(savi)
        .addBands(ndmi)
        .addBands(ndwi)
        .addBands(mndwi);
};

// 2.6 Apply the indices function to the collection
var collectionSR_wIndex = getCombinedSRcollection(startYear, startDay,
    endyear, endDay).map(addIndices);
var collectionL5L7L8 = collectionSR_wIndex.filterBounds(areaOfstudy);

// STEP 3 - VEGETATION INDEX ANOMALY

var index = 'NDVI';
var ref_start = '1984-01-01'; // Start of the period
var ref_end = '1999-12-31'; // End of the period

var reference = collectionL5L7L8
    .filterDate(ref_start, ref_end)
    .select(index)
    .sort('system:time_start', true);
print('Number of images in Reference Collection', reference.size());

// 3.2 Compute the Mean value for the vegetation index 
// (and other stats) for the reference period.
var mean = reference.mean().mask(extentBuffer);
var median = reference.median().mask(extentBuffer);
var max = reference.max().mask(extentBuffer);
var min = reference.min().mask(extentBuffer);

var period_start = '2000-01-01'; // Full period
var period_end = '2020-12-31';

// 3.4 Anomaly calculation
var anomalyfunction = function(image) {
    return image.subtract(mean)
        .set('system:time_start', image.get('system:time_start'));
};

var series = collectionL5L7L8.filterDate(period_start, period_end)
    .map(anomalyfunction);

// Sum the values of the series.
var seriesSum = series.select(index).sum().mask(extentBuffer);
var numImages = series.select(index).count().mask(extentBuffer);
var anomaly = seriesSum.divide(numImages);

var visAnon = {
    min: -0.20,
    max: 0.20,
    palette: ['#481567FF', '#482677FF', '#453781FF', '#404788FF',
        '#39568CFF', '#33638DFF', '#2D708EFF', '#287D8EFF',
        '#238A8DFF',
        '#1F968BFF', '#20A387FF', '#29AF7FFF', '#3CBB75FF',
        '#55C667FF',
        '#73D055FF', '#95D840FF', '#B8DE29FF', '#DCE319FF',
        '#FDE725FF'
    ]
};
Map.addLayer(anomaly, visAnon, index + ' anomaly');

var thresholdLoss = -0.05;
var lossfromndvi = anomaly.lte(thresholdLoss)
    .selfMask()
    .updateMask(
        mangrove2000
    ); // Only show the losses within the mangrove extent of year 2000

Map.addLayer(lossfromndvi, {
    palette: ['orange']
}, 'Loss from Anomaly 00-20');

var thresholdGain = 0.20;
var gainfromndvi = anomaly.gte(thresholdGain)
    .selfMask()
    .updateMask(
        extentBuffer
    ); // Only show the gains within the mangrove extent buffer of year 2000

Map.addLayer(gainfromndvi, {
    palette: ['blue']
}, 'Gain from Anomaly 00-20');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------