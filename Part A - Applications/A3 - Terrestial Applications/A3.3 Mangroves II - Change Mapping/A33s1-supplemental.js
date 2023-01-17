//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.3 Mangroves
//  Section:      Supplemental (Assignment 1)
//  Author:       Celio de Sousa, David Lagomasino, and Lola Fatoyinbo
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
 //****************************************
//STEP 1 - TEMPORAL AND SPATIAL PARAMETERS
//****************************************

//Temporal
var year = 2020; // Year
var startDay = (year)+'-01-01'; // beginning of date filter | month-day
var endDay = (year)+'-12-30'; // end of date filter | month-day

//Spatial
var aoi = ee.FeatureCollection('projects/gee-book/assets/A3-3/CoastalPrefectures5k');

//****************************
//STEP 2 - AUXILIARY FUNCTIONS
//****************************

var maskL8sr = function (image) {
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;
  var qa = image.select('pixel_qa');
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask).divide(10000)
      .select("B[0-9]*")
      .copyProperties(image, ["system:time_start"]);
};


var addIndicesL8 = function(img) {
  // NDVI (Normalized Difference Vegetation Index)
  var ndvi = img.normalizedDifference(['B5','B4']).rename('NDVI');

  // NDMI (Normalized Difference Mangrove Index - Shi et al 2016 )
  var ndmi = img.normalizedDifference(['B7','B3']).rename('NDMI');

  // MNDWI (Modified Normalized Difference Water Index - Hanqiu Xu, 2006)
  var mndwi = img.normalizedDifference(['B3','B6']).rename('MNDWI');

  // SR (Simple Ratio)
  var sr = img.select('B5').divide(img.select('B4')).rename('SR');

  // Band Ratio 6/5
  var ratio65 = img.select('B6').divide(img.select('B5')).rename('R65');

  // Band Ratio 4/6
  var ratio46 = img.select('B4').divide(img.select('B6')).rename('R46');

  // GCVI (Green Chlorophyll Vegetation Index)
  var gcvi = img.expression('(NIR/GREEN)-1',{
    'NIR':img.select('B5'),
    'GREEN':img.select('B3')
  }).rename('GCVI');

   return img
    .addBands(ndvi) // This will add each spectral index to each Landsat scene
    .addBands(ndmi)
    .addBands(mndwi)
    .addBands(sr)
    .addBands(ratio65)
    .addBands(ratio46)
    .addBands(gcvi);
};


//**************************************************************
//STEP 3 - CREATE AUXILIARY MASKS AND BANDS FOR MANGROVE MAPPING
//**************************************************************

// WATER MASK
// The objective of this mask is to remove water pixels from the Landsat composite as we are only focusing on Mangroves

// We will create a Water Mask using the Global Surface Water dataset

var globalwater = ee.Image('JRC/GSW1_0/GlobalSurfaceWater'); // Load the dataset

// The Global Water Dataset has different bands. One of them is the the frequency with which water was present (occurrence).
// Esentially, this band shows how many times a given pixel was classified as water relative to the total time span of the dataset

var occurrence = globalwater.select('occurrence'); // Select the occurrence band.

// Masks are composed by zeros and non-zero values. When you set or apply a mask to an image, the output image will keep it's original values where the mask
// has non zero values whereas the it will be masked where the mask has zero values.
// For this example, we want to create a watermask. Thus Watermask has to have zero where there is water and non zero values 
// For our mask, we want to make sure we are selecting permanent water. We want to filter the dataset for water pixels that occurred more than 50% of the time over the 35 years time spam.

var waterMask = occurrence.lt(50) // Selects lower than 50%. Automatically, values above 90% are set to 0
                          .unmask(1); // Since the water dataset only includes water, set other areas to 1 

Map.addLayer(waterMask, {}, 'Water Mask');



// ELEVATION/SLOPE MASK

// The objective of this mask is to remove pixels that are unlikely to be mangrove based on the slope. Generally, it will occur near shore where
// elevation and slope is very low.

// We will create a mask using the SRTM Elevation Data
var srtm = ee.Image('USGS/SRTMGL1_003');

var elevation = srtm.select('elevation');

// In this case, we want to create a mask where pixels that have higher altitude values are removed 
// Hence, we select everything that is UNDER 25 meters; everything else will be set to 0 automatically.
var elevMask = elevation.lte(25);
Map.addLayer(elevMask, {}, 'Elevation Mask');
Map.addLayer(ee.Image().paint(aoi, 0, 2), {palette:['red']}, 'StudyArea');

//*********************************************************
//STEP 4 - LANDSAT 8 IMAGE COLLECTION AND CLOUD-FREE MOSAIC
//*********************************************************

// Map the function over one year of data.
var collection = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
    .filterDate(startDay, endDay)
    .map(maskL8sr)
    .map(addIndicesL8);

    
var composite = collection
                .median()
                .mask(waterMask)
                .updateMask(elevMask)
                .clip(aoi);

// Display the results.
//Map.centerObject(Mangroves2016,9);
Map.addLayer(composite, {bands: ['B5', 'B6', 'B4'], min: 0, max: 0.3}, 'Composite');

//************************************************************
//STEP 5 - CREATE STRATIFICATION MAP BASED ON MANGROVE DATASET
//************************************************************

//Mangrove Strata

//First, let's load the global mangrove dataset for the year 2000
var dataset = ee.FeatureCollection('projects/gee-book/assets/A3-3/Mangroves2000');
var mangrove = ee.Image(1).clip(dataset);

//All other classes Strata

// First we create an image of zeros where values 1 will be added where there is a pixel from the composite, including the mangrove areas
var nonmangrove = ee.Image(0).where(composite.select('B1'),2).selfMask()
// Now we have an image of values of 1 where there is composite. Now we set this image to zero where there is pixel of mangrove
var strata = nonmangrove.where(mangrove,1).rename('landcover');

Map.addLayer (strata, {palette:['#B3E283','#E8E46E'], min:1, max:2}, 'Strata')

// Selecting samples based on the strata created above

var stratified = strata.addBands(ee.Image.pixelLonLat()).stratifiedSample({
      numPoints: 1,
      classBand: 'landcover',
      scale: 30,
      region: aoi,
      classValues:[1,2],     // 
      classPoints:[1000,1000]  // Insert the number of points per class. 
    }).map(function(f) { // set these points to geometry and get their coordinates
       return f.setGeometry(ee.Geometry.Point([f.get('longitude'), f.get('latitude')]))
    });

var paletteSamples = ee.List([
  'FFFFFF',  //NULL
  '01937C', // Mangrove
  'B6C867', // Non-Mangrove
 ]);

// We use this function to colorize the samples based on the palette
var features = stratified.map(function(f) {
  var landcover = f.get('landcover');
  return ee.Feature(ee.Geometry.Point([f.get('longitude'), f.get('latitude')]), f.toDictionary())
      .set({style: {color: paletteSamples.get(landcover) }}); 
});

// Add the features / sample location into the map with the style set above
Map.addLayer(features.style({styleProperty: "style"}),{}, 'Samples/Location')

//************************************************************
//STEP 6 - CLASSIFICATION
//************************************************************

// First, we will select the predictors to assign to each sample point in the sample sets
var bands = ['B5','B6','B7','NDVI','MNDWI','SR'];

// Create the sample sets
// Automatic
var samplesAutomatic = composite.select(bands).sampleRegions({
  collection: stratified,
  properties: ['landcover'],
  scale: 30,
  geometries: true,
});

// Create the sample set with the samples you selected manually via geometry
var manualpoints = MangroveTraining.merge(NonMangroveTraining);
var samplesManual = composite.select(bands).sampleRegions({
  collection: manualpoints,       
  properties: ['landcover'], 
  scale: 30,
  geometries: true,
});

// Create the Ground Truth sample set that will be used to validate the land cover classification maps
var groundtruth = ee.FeatureCollection('users/celiohelder/TutorialAssets/GroundTruth');
Map.addLayer(groundtruth)

var samplesgroundtruth = composite.select(bands).sampleRegions({
  collection: groundtruth,       // Set of geometries selected in 4.1
  properties: ['landcover'], // Label from each geometry
  scale: 30,
  geometries: true,
});


// Train two classifiers: one with the samples collected automatically via stratification and one with the samples you selected manually
var RandomForest1 = ee.Classifier.smileRandomForest(200,5).train({
  features: samplesAutomatic, 
  classProperty: 'landcover', 
  inputProperties: bands
});

var RandomForest2 = ee.Classifier.smileRandomForest(200,5).train({
  features: samplesManual, 
  classProperty: 'landcover', 
  inputProperties: bands
});


// Classify the Landsat 8 Composite using the two classifiers to produce 2 land cover maps

var classifiedrf1 = composite.select(bands)           // select the predictors
                            .classify(RandomForest1); // apply the Random Forest trained with the automatically selected samples

var classifiedrf2 = composite.select(bands)           // select the predictors
                            .classify(RandomForest2); // apply the Random Forest classifier trained with mannually selected samples

// Color palette for the classification outputs
var paletteMAP = [
  '01937C', // Mangrove
  'B6C867', // Non-Mangrove
];

// Add the classifications to the map editor
Map.addLayer (classifiedrf1, {min: 1, max: 2, palette:paletteMAP}, 'Classification Automatic Samples');
Map.addLayer (classifiedrf2, {min: 1, max: 2, palette:paletteMAP}, 'Classification Manual Samples');


var validation1 = samplesgroundtruth.classify(RandomForest1);
var validation2 = samplesgroundtruth.classify(RandomForest2);
var testAccuracy1 = validation1.errorMatrix('landcover', 'classification');
var testAccuracy2 = validation2.errorMatrix('landcover', 'classification');
var kappa1 = testAccuracy1.kappa();
var kappa2 = testAccuracy2.kappa();

print('Overall Accuracy Map 1: ', testAccuracy1.accuracy());
print('Overall Accuracy Map 2: ', testAccuracy2.accuracy());
print('Kappa: ', kappa1);
print('Kappa: ', kappa2);

print('Validation error matrix Map1: ', testAccuracy1);
print('Validation error matrix Map2: ', testAccuracy2);

var legend = ui.Panel({
  style: {
    position: 'bottom-left', // Position in the map
    padding: '8px 15px'      // Padding (border) size
  }
});
var makeRow = function(color, name) {
  // Create the label that is actually the colored boxes that represent each class
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the label color box height and width.
      padding: '8px', 
      margin: '0 0 4px 0'
    }
  });
  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};
legend.add(makeRow('01937C', 'Mangrove'));
legend.add(makeRow('B6C867', 'Non-mangrove'));

//Map.add (legend);



