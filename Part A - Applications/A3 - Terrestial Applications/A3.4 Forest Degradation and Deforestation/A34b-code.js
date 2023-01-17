//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.4 Forest Degradation and Deforestation
//  Checkpoint:   A34b
//  Author:       Carlos Souza Jr., Karis Tenneson, John Dilger, 
//                Crystal Wespestad, Eric Bullock
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// SMA Model - Section 1

// Define the Landsat endmembers (source: Souza et al. 2005)
// They can be applied to Landsat 5, 7, 8, and potentially 9.
var endmembers = [
    [0.0119, 0.0475, 0.0169, 0.625, 0.2399, 0.0675], // GV
    [0.1514, 0.1597, 0.1421, 0.3053, 0.7707, 0.1975], // NPV
    [0.1799, 0.2479, 0.3158, 0.5437, 0.7707, 0.6646], // Soil
    [0.4031, 0.8714, 0.79, 0.8989, 0.7002, 0.6607] // Cloud
];

// Select a Landsat 5 scene on which to apply the SMA model.
var image = ee.Image('LANDSAT/LT05/C02/T1_L2/LT05_226068_19840411')
    .multiply(0.0000275).add(-0.2);

// Center the map on the image object.
Map.centerObject(image, 10);

// Define and select the Landsat bands to apply the SMA model.
// use ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'] for Landsat 5 and 7.
// use ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'] for Landsat 8.
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
image = image.select(bands);

// Unmixing image using Singular Value Decomposition. 
var getSMAFractions = function(image, endmembers) {
    var unmixed = ee.Image(image)
        .select([0, 1, 2, 3, 4,
            5
        ]) // Use the visible, NIR, and SWIR bands only!
        .unmix(endmembers)
        .max(0) // Remove negative fractions, mostly Soil.
        .rename('GV', 'NPV', 'Soil', 'Cloud');
    return ee.Image(unmixed.copyProperties(image));
};

// Calculate GVS and NDFI and add them to image fractions.
// Run the SMA model passing the Landsat image and the endmembers.
var sma = getSMAFractions(image, endmembers);

Map.addLayer(sma, {
    bands: ['NPV', 'GV', 'Soil'],
    min: 0,
    max: 0.45
}, 'sma');

// Calculate the Shade and GV shade-normalized (GVs) fractions from the SMA bands.
var Shade = sma.reduce(ee.Reducer.sum())
    .subtract(1.0)
    .abs()
    .rename('Shade');

var GVs = sma.select('GV')
    .divide(Shade.subtract(1.0).abs())
    .rename('GVs');

// Add the new bands to the SMA image variable.
sma = sma.addBands([Shade, GVs]);

// Calculate the NDFI using image expression.	
var NDFI = sma.expression(
    '(GVs - (NPV + Soil))  / (GVs + NPV + Soil)', {
        'GVs': sma.select('GVs'),
        'NPV': sma.select('NPV'),
        'Soil': sma.select('Soil')
    }).rename('NDFI');

// Add the NDFI band to the SMA image.
sma = sma.addBands(NDFI);

// Define NDFI color table.
var palettes = require(
    'projects/gee-edu/book:Part A - Applications/A3 - Terrestrial Applications/A3.4 Forest Degradation and Deforestation/modules/palettes'
);
var ndfiColors = palettes.ndfiColors;

var imageVis = {
    'bands': ['SR_B5', 'SR_B4', 'SR_B3'],
    'min': 0,
    'max': 0.4
};

// Add the Landsat color composite to the map.
Map.addLayer(image, imageVis, 'Landsat 5 RGB-543', true);

// Add the fraction images to the map.
Map.addLayer(sma.select('Soil'), {
    min: 0,
    max: 0.2
}, 'Soil');
Map.addLayer(sma.select('GV'), {
    min: 0,
    max: 0.6
}, 'GV');
Map.addLayer(sma.select('NPV'), {
    min: 0,
    max: 0.2
}, 'NPV');
Map.addLayer(sma.select('Shade'), {
    min: 0,
    max: 0.8
}, 'Shade');
Map.addLayer(sma.select('GVs'), {
    min: 0,
    max: 0.9
}, 'GVs');
Map.addLayer(sma.select('NDFI'), {
    palette: ndfiColors
}, 'NDFI');

var getWaterMask = function(sma) {
    var waterMask = (sma.select('Shade').gte(0.65))
        .and(sma.select('GV').lte(0.15))
        .and(sma.select('Soil').lte(0.05));
    return waterMask.rename('Water');
};

// You can use the variable below to get the cloud mask.
var cloud = sma.select('Cloud').gte(0.1);
var water = getWaterMask(sma);

var cloudWaterMask = cloud.max(water);
Map.addLayer(cloudWaterMask.selfMask(),
    {
        min: 1,
        max: 1,
        palette: 'blue'
    },
    'Cloud and water mask');

// Mask NDFI.
var maskedNDFI = sma.select('NDFI').updateMask(cloudWaterMask.not());
Map.addLayer(maskedNDFI, {
    palette: ndfiColors
}, 'NDFI');

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

// Select two Landsat 5 scenes on which to apply the SMA model.

// Select Landsat bands used for forest change detection. 
var imageTime0 = ee.Image(
        'LANDSAT/LT05/C02/T1_L2/LT05_226068_20000509')
    .multiply(0.0000275).add(-0.2);
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
imageTime0 = imageTime0.select(bands);

// Run the SMA model.
var smaTime0 = getSMAFractions(imageTime0, endmembers);

// Center the image object.
Map.centerObject(imageTime0, 10);

// Define the visualization parameters.
var imageVis = {
    'opacity': 1,
    'bands': ['SR_B5', 'SR_B4', 'SR_B3'],
    'min': 0,
    'max': 0.4,
    'gamma': 1
};
// Scale to the expected maximum fraction values.
var fractionVis = {
    'opacity': 1,
    'min': 0.0,
    'max': 0.5
};

// Add the Landsat color composite to the map.
Map.addLayer(imageTime0, imageVis, 'Landsat 5 RGB 543', true);

// Add the fraction images to the map.
Map.addLayer(smaTime0.select('Soil'), fractionVis, 'Soil Fraction');
Map.addLayer(smaTime0.select('GV'), fractionVis, 'GV Fraction');
Map.addLayer(smaTime0.select('NPV'), fractionVis, 'NPV Fraction');

function getNDFI(smaImage) {
    // Calculate the Shade and GV shade-normalized (GVs) fractions 
    // from the SMA bands.
    var Shade = smaImage.reduce(ee.Reducer.sum())
        .subtract(1.0)
        .abs()
        .rename('Shade');

    var GVs = smaImage.select('GV')
        .divide(Shade.subtract(1.0).abs())
        .rename('GVs');

    // Add the new bands to the SMA image variable.
    smaImage = smaImage.addBands([Shade, GVs]);

    var ndfi = smaImage.expression(
        '(GVs - (NPV + Soil))  / (GVs + NPV + Soil)', {
            'GVs': smaImage.select('GVs'),
            'NPV': smaImage.select('NPV'),
            'Soil': smaImage.select('Soil')
        }
    ).rename('NDFI');

    return ndfi;
}

// Create the initial NDFI image and add it to the map.
var ndfiTime0 = getNDFI(smaTime0);
Map.addLayer(ndfiTime0,
    {
        bands: ['NDFI'],
        min: -1,
        max: 1,
        palette: ndfiColors
    },
    'NDFI t0',
    false);

// Select a second Landsat 5 scene on which to apply the SMA model.
var imageTime1 = ee.Image(
        'LANDSAT/LT05/C02/T1_L2/LT05_226068_20010629')
    .multiply(0.0000275).add(-0.2)
    .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']);
var smaTime1 = getSMAFractions(imageTime1, endmembers);

// Create the second NDFI image and add it to the map.
var ndfiTime1 = getNDFI(smaTime1);

Map.addLayer(imageTime1, imageVis, 'Landsat 5 t1 RGB-5', true);
Map.addLayer(ndfiTime1,
    {
        bands: ['NDFI'],
        min: -1,
        max: 1,
        palette: ndfiColors
    },
    'NDFI_t1',
    false);

// Combine the two NDFI images in a single variable.
var ndfi = ndfiTime0.select('NDFI')
    .addBands(ndfiTime1.select('NDFI'))
    .rename('NDFI_t0', 'NDFI_t1');

// Calculate the NDFI change.
var ndfiChange = ndfi.select('NDFI_t1')
    .subtract(ndfi.select('NDFI_t0'))
    .rename('NDFI Change');

var options = {
    title: 'NDFI Difference Histogram',
    fontSize: 20,
    hAxis: {
        title: 'Change'
    },
    vAxis: {
        title: 'Frequency'
    },
    series: {
        0: {
            color: 'green'
        }
    }
};

// Inspect the histogram of the NDFI change image to define threshold
// values for classification. Make the histogram, set the options.
var histNDFIChange = ui.Chart.image.histogram(
        ndfiChange.select('NDFI Change'), region, 30)
    .setSeriesNames(['NDFI Change'])
    .setOptions(options);

print(histNDFIChange);

// Classify the NDFI difference image based on thresholds 
// obtained from its histogram.
var changeClassification = ndfiChange.expression(
        '(b(0) >= -0.095 && b(0) <= 0.095) ? 1 :' +
        //  No forest change
        '(b(0) >= -0.250 && b(0) <= -0.095) ? 2 :' + // Logging
        '(b(0) <= -0.250) ? 3 :' + // Deforestation
        '(b(0) >= 0.095) ? 4  : 0') // Vegetation regrowth
    .updateMask(ndfi.select('NDFI_t0').gt(
        0.60)); // mask out no forest

// Use a simple threshold to get forest in the first image date. 
var forest = ndfi.select('NDFI_t0').gt(0.60);

// Add layers to map
Map.addLayer(ndfi, {
    'bands': ['NDFI_t0', 'NDFI_t1', 'NDFI_t1']
}, 'NDFI Change');
Map.addLayer(ndfiChange, {}, 'NDFI Difference');
Map.addLayer(forest, {}, 'Forest t0 ');
Map.addLayer(changeClassification, {
        palette: ['000000', '1eaf0c', 'ffc239', 'ff422f',
            '74fff9']
    },
    'Change Classification');

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------