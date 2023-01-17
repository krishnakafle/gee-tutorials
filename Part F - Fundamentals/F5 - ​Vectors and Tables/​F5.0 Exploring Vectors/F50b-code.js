//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.0 Exploring Vectors
//  Checkpoint:   F50b
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
