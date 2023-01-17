//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.0 Exploring Vectors
//  Checkpoint:   F50d
//  Authors:      AJ Purdy, Ellen Brock, David Saah
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import the Census Tiger Boundaries from GEE.
var tiger = ee.FeatureCollection('TIGER/2010/Blocks');

// Add the new feature collection to the map, but do not display.
Map.addLayer(tiger, {
    'color': 'black'
}, 'Tiger', false);

// Assign the feature collection to the variable sfNeighborhoods.
var sfNeighborhoods = ee.FeatureCollection(
    'path/to/your/asset/assetname');

// Note: if you are unable to load the feature collection, you
// can access the data by uncommenting out the following two lines:
// var tablePath = 'projects/gee-book/assets/F5-0/SFneighborhoods';
// var sfNeighborhoods = ee.FeatureCollection(tablePath);



// Print the size of the feature collection.
// (Answers the question: how many features?)
print(sfNeighborhoods.size());
Map.addLayer(sfNeighborhoods, {
    'color': 'blue'
}, 'sfNeighborhoods');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
 
// Filter sfNeighborhoods by USF.
var usfNeighborhood = sfNeighborhoods.filterBounds(usf_point);

// Filter the Census blocks by the boundary of the neighborhood layer.
var usfTiger = tiger.filterBounds(usfNeighborhood);
Map.addLayer(usfTiger, {}, 'usf_Tiger');

print(usfTiger);

// Filter for census blocks by housing units
var housing10_l250 = usfTiger
    .filter(ee.Filter.lt('housing10', 250));

var housing10_g50_l250 = housing10_l250.filter(ee.Filter.gt(
    'housing10', 50));

Map.addLayer(housing10_g50_l250, {
    'color': 'Magenta'
}, 'housing');

var housing_area = housing10_g50_l250.geometry().area();
print('housing_area:', housing_area);

var housing10_mean = usfTiger.reduceColumns({
  reducer: ee.Reducer.mean(),
  selectors: ['housing10']
});

print('housing10_mean', housing10_mean); 

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Import the Landsat 8 TOA image collection.
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA');

// Get the least cloudy image in 2015.
var image = ee.Image(landsat8
    .filterBounds(usf_point)
    .filterDate('2015-01-01', '2015-12-31')
    .sort('CLOUD_COVER')
    .first());

var nir = image.select('B5');
var red = image.select('B4');
var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

var ndviParams = {
    min: -1,
    max: 1,
    palette: ['blue', 'white', 'green']
};

var ndviUSFblocks = ndvi.clip(housing10_g50_l250);
Map.addLayer(ndviUSFblocks, ndviParams, 'NDVI image');
Map.centerObject(usf_point, 14);

// Reduce image by feature to compute a statistic e.g. mean, max, min etc.
var ndviPerBlock = ndviUSFblocks.reduceRegions({
    collection: housing10_g50_l250,
    reducer: ee.Reducer.mean(),
    scale: 30,
});

// Get a table of data out of Google Earth Engine.
Export.table.toDrive({
    collection: ndviPerBlock,
    description: 'NDVI_by_block_near_USF'
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

