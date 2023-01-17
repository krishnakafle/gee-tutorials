//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.1 Exploring images
//  Section:      Practice problem (Assignment 5)
//  Author:       Jeff Howarth 
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var image = ee.Image('LANDSAT/LT05/C02/T1_L2/LT05_118038_20000606');

Map.addLayer(
    image,
    {
        bands: ['SR_B1'],
        min: 8000,
        max: 17000
    },
    'Layer 1'
);

Map.addLayer(
    image.select('SR_B1'),
    {
        min: 8000,
        max: 17000
    },
    'Layer 2'
);



