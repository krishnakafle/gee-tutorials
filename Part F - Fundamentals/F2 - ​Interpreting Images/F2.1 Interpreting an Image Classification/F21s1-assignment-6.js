// Create an Earth Engine Point object over Milan.
var pt = ee.Geometry.Point([9.453, 45.424]);

// Filter the Landsat 8 collection and select the least cloudy image.
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(pt)
    .filterDate('2019-01-01', '2020-01-01')
    .sort('CLOUD_COVER')
    .first();

// Add NDVI and NDWI as bands.
var ndvi = landsat.normalizedDifference(['SR_B5', 'SR_B4']).rename('ndvi');
var ndwi = landsat.normalizedDifference(['SR_B5', 'SR_B6']).rename('ndwi');
var landsat = landsat.addBands(ndvi).addBands(ndwi);

// Center the map on that image.
Map.centerObject(landsat, 8);

// Add Landsat image to the map.
var visParams = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 7000, max: 12000};
Map.addLayer(landsat, visParams, 'Landsat 8 image');

// Combine training feature collections. Here we are using 100 points per class. 
// See imports at the top.
var trainingFeatures = ee.FeatureCollection([
  forest, developed, water, herbaceous
]).flatten();

// Define the prediction bands.
var predictionBands = [
  'SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'ST_B10', 
  'ndvi', 'ndwi'
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
  min: 0, max: 3, palette: ['589400', 'ff0000', '1a11ff', 'd0741e']
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
var RFclassified = landsat.select(predictionBands).classify(RFclassifier);

// Add classified image to the map.
Map.addLayer(RFclassified, classificationVis, 'RF classified');

//////////////// Unsupervised classification ////////////////

// Make the training dataset.
var training = landsat.sample({
  region: landsat.geometry(),
  scale: 30,
  numPixels: 1000,
  tileScale: 8
});

// Instantiate the clusterer and train it.
var clusterer = ee.Clusterer.wekaKMeans(4).train(training);

// Cluster the input using the trained clusterer.
var Kclassified = landsat.cluster(clusterer);

// Display the clusters with random colors.
Map.addLayer(Kclassified.randomVisualizer(), {}, 'K-means classified - random colors');

// Display the clusters with same palette as supervised classification
// herbaceous is 0, water is 1, forest is 2, developed is 3.
Map.addLayer(Kclassified, 
             {min: 0, max: 3, palette: ['d0741e','1a11ff','589400', 'ff0000']}, 
             'K-means classified');
