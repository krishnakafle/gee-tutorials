//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.2 Scaling Up in Earth Engine
//  Checkpoint:   F62e
//  Authors:      Jillian M. Deines, Stefania Di Tommaso, Nicholas Clinton, Noel Gorelick    
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// load image collection and mosaic into single image
var assetCollection = 'projects/gee-book/assets/F6-2/s2_composite_WA';
var composite = ee.ImageCollection(assetCollection).mosaic();

// Display the results
var geometry = ee.Geometry.Point([-120.5873563817392,
    47.39035206888694
]);
Map.centerObject(geometry, 6);
var vizParams = {
    bands: ['B4_median', 'B3_median', 'B2_median'],
    min: 0,
    max: 3000
};
Map.addLayer(composite, vizParams, 'median');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


 
