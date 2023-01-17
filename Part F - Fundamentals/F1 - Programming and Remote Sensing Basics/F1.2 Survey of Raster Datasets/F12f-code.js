//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.2 Survey of Raster Datasets
//  Checkpoint:   F12f
//  Authors:      Andréa, Karen, Nick Clinton, David Saah
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
/////
// Pre-classified Land Use Land Cover
/////

// Import the ESA WorldCover dataset.
var worldCover = ee.ImageCollection('ESA/WorldCover/v100').first();

// Center the Map.
Map.centerObject(worldCover, 3);

// Add the worldCover layer to the map.
Map.addLayer(worldCover, {
    bands: ['Map']
}, 'WorldCover');

// Import the Hansen Global Forest Change dataset.
var globalForest = ee.Image(
    'UMD/hansen/global_forest_change_2020_v1_8');

// Create a visualization for tree cover in 2000.
var treeCoverViz = {
    bands: ['treecover2000'],
    min: 0,
    max: 100,
    palette: ['black', 'green']
};

// Add the 2000 tree cover image to the map.
Map.addLayer(globalForest, treeCoverViz, 'Hansen 2000 Tree Cover');

// Create a visualization for the year of tree loss over the past 20 years.
var treeLossYearViz = {
    bands: ['lossyear'],
    min: 0,
    max: 20,
    palette: ['yellow', 'red']
};

// Add the 2000-2020 tree cover loss image to the map.
Map.addLayer(globalForest, treeLossYearViz, '2000-2020 Year of Loss');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
