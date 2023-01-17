//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F2.1 Interpreting an Image: Classification
//  Checkpoint:   F21a
//  Author:       Andréa Puzzi Nicolau, Karen Dyson, David Saah, Nicholas Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

