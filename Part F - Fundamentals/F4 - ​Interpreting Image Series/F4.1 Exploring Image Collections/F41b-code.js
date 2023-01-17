//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.1 Exploring Image Collections
//  Checkpoint:   F41b
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

// compute and show the number of observations in an image collection
var count = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterDate('2020-01-01', '2021-01-01')
    .select(['B6'])
    .count();

// add white background and switch to HYBRID basemap
Map.addLayer(ee.Image(1), {
    palette: ['white']
}, 'white', true, 0.5);
Map.setOptions('HYBRID');

// show image count
Map.addLayer(count, {
    min: 0,
    max: 50,
    palette: ['d7191c', 'fdae61', 'ffffbf', 'a6d96a',
        '1a9641']
}, 'landsat 8 image count (2020)');

// Center the map at that point.
Map.centerObject(lisbonPoint, 5);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------



