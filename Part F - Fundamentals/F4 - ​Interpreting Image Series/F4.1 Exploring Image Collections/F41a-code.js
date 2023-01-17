//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.1 Exploring Image Collections
//  Checkpoint:   F41a
//  Author:       Gennadii Donchyts
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Define a region of interest as a point in Lisbon, Portugal.
var lisbonPoint = ee.Geometry.Point(-9.179473, 38.763948);

// Center the map at that point.
Map.centerObject(lisbonPoint, 16);

// filter the large ImageCollection to be just images from 2020 
// around Lisbon. From each image, select true-color bands to draw
var filteredIC = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterDate('2020-01-01', '2021-01-01')
    .filterBounds(lisbonPoint)
    .select(['B6', 'B5', 'B4']);

// Add the filtered ImageCollection so that we can inspect values 
// via the Inspector tool
Map.addLayer(filteredIC, {}, 'TOA image collection');

// Construct a chart using values queried from image collection.
var chart = ui.Chart.image.series({
    imageCollection: filteredIC,
    region: lisbonPoint,
    reducer: ee.Reducer.first(),
    scale: 10
});

// Show the chart in the Console.
print(chart);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
