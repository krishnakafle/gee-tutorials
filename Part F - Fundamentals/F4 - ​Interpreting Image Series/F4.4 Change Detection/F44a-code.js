//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.4 Change Detection
//  Checkpoint:   F44a
//  Author:       Karis Tenneson, John Dilger, Crystal Wespestad, Brian Zutta,
//                Andréa P Nicolau, Karen Dyson
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .select(
        ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
        ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']
    );
    
var point = ee.Geometry.Point([-123.64, 42.96]);
Map.centerObject(point, 11);

var preImage = landsat8
    .filterBounds(point)
    .filterDate('2013-06-01', '2013-06-30')
    .sort('CLOUD_COVER', true)
    .first();
    
var postImage = landsat8
    .filterBounds(point)
    .filterDate('2020-06-01', '2020-06-30')
    .sort('CLOUD_COVER', true)
    .first();

var visParam = {
    'bands': ['swir2', 'nir', 'red'],
    'min': 7750,
    'max': 22200
};
Map.addLayer(preImage, visParam, 'pre');
Map.addLayer(postImage, visParam, 'post');

// Calculate NBR.
var nbrPre = preImage.normalizedDifference(['nir', 'swir2'])
    .rename('nbr_pre');
var nbrPost = postImage.normalizedDifference(['nir', 'swir2'])
    .rename('nbr_post');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
