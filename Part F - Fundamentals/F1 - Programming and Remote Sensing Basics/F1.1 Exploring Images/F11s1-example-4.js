//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.1 Exploring images
//  Section:      Practice problem (Assignment 4)
//  Author:       Jeff Howarth
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load the practice image from the Earth Engine ID.
var practice_image = ee.Image(
    'LANDSAT/LT05/C02/T1_L2/LT05_022039_20050907');

// Print image metadata to the Console.
print(practice_image);

// Center the Map on the image.
Map.centerObject(practice_image, 9);

// Add a natural color composite to the Map.
Map.addLayer(
    practice_image,
    {
        bands: ['SR_B3', 'SR_B2', 'SR_B1'],
        min: 8000,
        max: 17000
    },
    'Natural color'
);

// Add an NIR false color composite to the Map.
Map.addLayer(
    practice_image,
    {
        bands: ['SR_B4', 'SR_B3', 'SR_B2'],
        min: 8000,
        max: 17000
    },
    'NIR false color'
);

// Add a SWIR false color composite to the Map.
Map.addLayer(
    practice_image,
    {
        bands: ['SR_B5', 'SR_B4', 'SR_B2'],
        min: 8000,
        max: 17000
    },
    'SWIR false color'
);
