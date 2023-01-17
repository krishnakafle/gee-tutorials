//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F2.1 Interpreting an Image: Classification
//  Checkpoint:   F21b
//  Author:       Andréa Puzzi Nicolau, Karen Dyson, David Saah, Nicholas Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Create an Earth Engine Point object over Milan.
var pt = ee.Geometry.Point([9.453, 45.424]);

// Filter the Landsat 8 collection and select the least cloudy image.
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(pt)
    .filterDate('2019-01-01', '2020-01-01')
    .sort('CLOUD_COVER')
    .first();

// Center the map on that image.
Map.centerObject(landsat, 8);

// Add Landsat image to the map.
var visParams = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 7000,
    max: 12000
};
Map.addLayer(landsat, visParams, 'Landsat 8 image');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Combine training feature collections.
var trainingFeatures = ee.FeatureCollection([
    forest, developed, water, herbaceous
]).flatten();

// Define prediction bands.
var predictionBands = [
    'SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7',
    'ST_B10'
];

// Sample training points.
var classifierTraining = landsat.select(predictionBands)
    .sampleRegions({
        collection: trainingFeatures,
        properties: ['class'],
        scale: 30
    });
    
//////////////// CART Classifier ///////////////////

// Train a CART Classifier.
var classifier = ee.Classifier.smileCart().train({
    features: classifierTraining,
    classProperty: 'class',
    inputProperties: predictionBands
});

// Classify the Landsat image.
var classified = landsat.select(predictionBands).classify(classifier);

// Define classification image visualization parameters.
var classificationVis = {
    min: 0,
    max: 3,
    palette: ['589400', 'ff0000', '1a11ff', 'd0741e']
};

// Add the classified image to the map.
Map.addLayer(classified, classificationVis, 'CART classified');

/////////////// Random Forest Classifier /////////////////////

// Train RF classifier.
var RFclassifier = ee.Classifier.smileRandomForest(50).train({
    features: classifierTraining,
    classProperty: 'class',
    inputProperties: predictionBands
});

// Classify Landsat image.
var RFclassified = landsat.select(predictionBands).classify(
    RFclassifier);

// Add classified image to the map.
Map.addLayer(RFclassified, classificationVis, 'RF classified');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------



