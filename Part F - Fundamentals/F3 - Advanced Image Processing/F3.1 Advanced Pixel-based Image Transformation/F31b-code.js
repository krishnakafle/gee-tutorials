//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.1 Advanced Pixel-Based Image Transformations
//  Checkpoint:   F31b
//  Authors:      Karen, Andrea, Nick, and David
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Examine the true-color Landsat 8 images for the 2013 Rim Fire.
var burnImage = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(ee.Geometry.Point(-120.083, 37.850))
    .filterDate('2013-09-15', '2013-09-27')
    .sort('CLOUD_COVER')
    .first();

Map.centerObject(ee.Geometry.Point(-120.083, 37.850), 11);

var rgbParams = {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 0.3
};
Map.addLayer(burnImage, rgbParams, 'True-Color Burn Image');

// Calculate BAI.
var bai = burnImage.expression(
    '1.0 / ((0.1 - RED)**2 + (0.06 - NIR)**2)', {
        'NIR': burnImage.select('B5'),
        'RED': burnImage.select('B4'),
    });

// Display the BAI image.
var burnPalette = ['green', 'blue', 'yellow', 'red'];
Map.addLayer(bai, {
    min: 0,
    max: 400,
    palette: burnPalette
}, 'BAI');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------