//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.2 Urban Environments
//  Checkpoint:   A12h
//  Author:       Michelle Stuhlmacher and Ran Goldblatt
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Map.centerObject(bu, 13);

// Surface reflectance function from example:
function maskL457sr(image) {
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111',
        2)).eq(0);
    var saturationMask = image.select('QA_RADSAT').eq(0);

    // Apply the scaling factors to the appropriate bands.
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-
        0.2);
    var thermalBand = image.select('ST_B6').multiply(0.00341802).add(
        149.0);

    // Replace the original bands with the scaled ones and apply the masks.
    return image.addBands(opticalBands, null, true)
        .addBands(thermalBand, null, true)
        .updateMask(qaMask)
        .updateMask(saturationMask);
}

// Map the function over one year of data.
var collection = L7.filterDate('2020-01-01', '2021-01-01').map(
    maskL457sr);
var landsat7_2020 = collection.median();

Map.addLayer(landsat7_2020, {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 0,
    max: 0.3
}, 'landsat 7, 2020');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

var lc = nbu.merge(bu);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'ST_B6',
    'SR_B7'
];

var training = landsat7_2020.select(bands).sampleRegions({
    collection: lc,
    properties: ['class'],
    scale: 30
});

// Create a random forest classifier with 20 trees.
var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 20
}).train({ // Train the classifier.
    // Use the examples we got when we sampled the pixels.
    features: training,
    // This is the class that we want to predict.
    classProperty: 'class',
    // The bands the classifier will use for training and classification.
    inputProperties: bands
});

// Apply the classifier on the 2020 image.
var classified20 = landsat7_2020.select(bands).classify(classifier);

Map.addLayer(classified20.mask(classified20), {
    palette: ['#ff4218'],
    opacity: 0.6
}, 'built-up, 2020');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

var landsat7_2010 = L7.filterDate('2010-01-01', '2010-12-31')
    .map(maskL457sr).median();

// Apply the classifier to the 2010 image.
var classified10 = landsat7_2010.select(bands).classify(
    classifier);
Map.addLayer(classified10.mask(classified10), {
    palette: ['#f1ff21'],
    opacity: 0.6
}, 'built-up, 2010');

var difference = classified20.subtract(classified10);

Map.addLayer(difference.mask(difference), {
    palette: ['#315dff'],
    opacity: 0.6
}, 'difference');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------