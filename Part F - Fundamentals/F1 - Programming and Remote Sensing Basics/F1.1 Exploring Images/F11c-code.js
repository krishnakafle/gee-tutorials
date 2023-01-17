//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.1 Exploring images
//  Checkpoint:   F11c
//  Author:       Jeff Howarth 
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load an image from its Earth Engine ID.
var first_image = ee.Image(
    'LANDSAT/LT05/C02/T1_L2/LT05_118038_20000606');

// Inspect the image object in the Console.
print(first_image);

// Display band 1 of the image as the first map layer.
Map.addLayer(
    first_image, //  dataset to display
    {
        bands: ['SR_B1'], //  band to display
        min: 8000, //  display range  
        max: 17000
    },
    'Layer 1' //  name to show in Layer Manager
);  

// Display band 2 as the second map layer.
Map.addLayer(
    first_image,
    {
        bands: ['SR_B2'],
        min: 8000,
        max: 17000
    },
    'Layer 2',
    0, //  shown
    1 //  opacity
);

// Display band 3 as the third map layer.
Map.addLayer(
    first_image,
    {
        bands: ['SR_B3'],
        min: 8000,
        max: 17000
    },
    'Layer 3',
    1, //  shown
    0 //  opacity
);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Add a natural color layer by using the first three sensor bands for RGB.
Map.addLayer(
    first_image,
    {
        bands: ['SR_B3', 'SR_B2', 'SR_B1'],
        min: 8000,
        max: 17000
    },
    'Natural Color');
    
// Add a NIR false-color layer using NIR, red, green sensor bands for RGB.
Map.addLayer(
    first_image,
    {
        bands: ['SR_B4', 'SR_B3', 'SR_B2'],
        min: 8000,
        max: 17000
    },
    'False Color');

// Add a SWIR false-color layer using SWIR, NIR, green sensor bands for RGB.
Map.addLayer(
    first_image,
    {
        bands: ['SR_B5', 'SR_B4', 'SR_B2'],
        min: 8000,
        max: 17000
    },
    'Short wave false color');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Load a 1993 nighttime lights dataset from its Earth Engine ID.
var lights93 = ee.Image('NOAA/DMSP-OLS/NIGHTTIME_LIGHTS/F101993');

// Print image metadata to the Console.
print('Nighttime lights', lights93);

// Display the 'stable_lights' band as a map layer.
Map.addLayer(
    lights93,
    {
        bands: ['stable_lights'],
        min: 0,
        max: 63
    },
    'Lights');

// Construct an image of stable lights for 2003.
var lights03 = ee.Image('NOAA/DMSP-OLS/NIGHTTIME_LIGHTS/F152003')
    .select('stable_lights').rename('2003');

// Construct an image of stable lights for 2013.
var lights13 = ee.Image('NOAA/DMSP-OLS/NIGHTTIME_LIGHTS/F182013')
    .select('stable_lights').rename('2013');
    
// Construct an image with three bands,
// where each band represents stable lights for one year.
    
var changeImage = lights13.addBands(lights03)
    .addBands(lights93.select('stable_lights').rename('1993'));
 
// Print image metadata to the Console.
print('change image', changeImage);

// Add an RGB composite layer to the Map.
Map.addLayer(
    changeImage,
    {
        min: 0,
        max: 63
    },
    'Change composite');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
