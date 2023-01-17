//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.1 Exploring images
//  Checkpoint:   F11a
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


