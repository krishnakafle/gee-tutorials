//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.2 Scaling Up in Earth Engine
//  Checkpoint:   F62d
//  Authors:      Jillian M. Deines, Stefania Di Tommaso, Nicholas Clinton, Noel Gorelick    
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Specify helper functions.
var s2mask_tools = require(
    'projects/gee-edu/book:Part F - Fundamentals/F6 - Advanced Topics/F6.2 Scaling Up/modules/s2cloudmask.js'
);

// Set the Region of Interest: Washington, USA.
var roi = ee.FeatureCollection('TIGER/2018/States')
    .filter(ee.Filter.equals('NAME', 'Washington'));

// Specify grid size in projection, x and y units (based on projection).
var projection = 'EPSG:4326';
var dx = 2.5;
var dy = 1.5;

// Dates over which to create a median composite.
var start = ee.Date('2019-03-01');
var end = ee.Date('2019-09-01');

// Make grid and visualize.
var proj = ee.Projection(projection).scale(dx, dy);
var grid = roi.geometry().coveringGrid(proj);

Map.addLayer(roi, {}, 'roi');
Map.addLayer(grid, {}, 'grid');

// Export info.
var assetCollection = 'path/to/your/asset/s2_composite_WA';
var imageBaseName = 'S2_median_';

// Get a list based on grid number. 
var gridSize = grid.size().getInfo();
var gridList = grid.toList(gridSize);

// In each grid cell, export a composite
for (var i = 0; i < gridSize; i++) {

    // Extract grid polygon and filter S2 datasets for this region.
    var gridCell = ee.Feature(gridList.get(i)).geometry();

    var s2Sr = ee.ImageCollection('COPERNICUS/S2_SR')
        .filterDate(start, end)
        .filterBounds(gridCell)
        .select(['B2', 'B3', 'B4', 'B5']);

    var s2 = ee.ImageCollection('COPERNICUS/S2')
        .filterDate(start, end)
        .filterBounds(gridCell)
        .select(['B7', 'B8', 'B8A', 'B10']);

    var s2c = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
        .filterDate(start, end)
        .filterBounds(gridCell);

    // Apply the cloud mask.
    var withCloudProbability = s2mask_tools.indexJoin(s2Sr, s2c,
        'cloud_probability');
    var withS2L1C = s2mask_tools.indexJoin(withCloudProbability, s2,
        'l1c');
    var masked = ee.ImageCollection(withS2L1C.map(s2mask_tools
        .maskImage));

    // Generate a median composite and export.
    var median = masked.reduce(ee.Reducer.median(), 8);

    // Export.
    var imagename = imageBaseName + 'tile' + i;
    Export.image.toAsset({
        image: median,
        description: imagename,
        assetId: assetCollection + '/' + imagename,
        scale: 10,
        region: gridCell,
        maxPixels: 1e13
    });
}

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


 
