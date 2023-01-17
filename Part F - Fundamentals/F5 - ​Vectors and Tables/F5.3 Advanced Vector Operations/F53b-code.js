//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.3 Advanced Vector Operations 
//  Checkpoint:   F53b
//  Author:       Ujaval Gandhi
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var blocks = ee.FeatureCollection('TIGER/2010/Blocks');
var roads = ee.FeatureCollection('TIGER/2016/Roads');
var sfNeighborhoods = ee.FeatureCollection(
    'projects/gee-book/assets/F5-0/SFneighborhoods');

var geometry = sfNeighborhoods.geometry();
Map.centerObject(geometry);

// Filter blocks and roads to the San Francisco boundary.
var sfBlocks = blocks.filter(ee.Filter.bounds(geometry));
var sfRoads = roads.filter(ee.Filter.bounds(geometry));

// Select by Location
// Select all census blocks within 1km of an interstate.
var interstateRoads = sfRoads.filter(ee.Filter.eq('rttyp', 'I'));

// Visualize the layers
var sfBlocksDrawn = sfBlocks.draw({
        color: 'gray',
        strokeWidth: 1
    })
    .clip(geometry);
Map.addLayer(sfBlocksDrawn, {}, 'All Blocks');
var interstateRoadsDrawn = interstateRoads.draw({
        color: 'blue',
        strokeWidth: 3
    })
    .clip(geometry);
Map.addLayer(interstateRoadsDrawn, {}, 'Interstate Roads');

// Define a spatial filter, with distance 1 km.
var joinFilter = ee.Filter.withinDistance({
    distance: 1000,
    leftField: '.geo',
    rightField: '.geo',
    maxError: 10
});

var closeBlocks = ee.Join.simple().apply({
    primary: sfBlocks,
    secondary: interstateRoads,
    condition: joinFilter
});

var closeBlocksDrawn = closeBlocks.draw({
        color: 'orange',
        strokeWidth: 1
    })
    .clip(geometry);
Map.addLayer(closeBlocksDrawn, {}, 'Blocks within 1km');

// Spatial Join (Summary)
// Calculate Tree Counts.

var sfNeighborhoods = ee.FeatureCollection(
    'projects/gee-book/assets/F5-0/SFneighborhoods');
var sfTrees = ee.FeatureCollection(
    'projects/gee-book/assets/F5-3/SFTrees');

// Visualize the layers

// Use paint() to visualize the polygons with only outline
var sfNeighborhoodsOutline = ee.Image().byte().paint({
    featureCollection: sfNeighborhoods,
    color: 1,
    width: 3
});
Map.addLayer(sfNeighborhoodsOutline, {
        palette: ['blue']
    },
    'SF Neighborhoods');

// Use style() to visualize the points
var sfTreesStyled = sfTrees.style({
    color: 'green',
    pointSize: 2,
    pointShape: 'triangle',
    width: 2
});
Map.addLayer(sfTreesStyled, {}, 'SF Trees');

// Define a spatial intersection filter
var intersectFilter = ee.Filter.intersects({
    leftField: '.geo',
    rightField: '.geo',
    maxError: 10
});

// Define a saveAll join.
var saveAllJoin = ee.Join.saveAll({
    matchesKey: 'trees',
});

// Apply the join.
var joined = saveAllJoin
    .apply(sfNeighborhoods, sfTrees, intersectFilter);
print(joined.first());

// Calculate total number of trees within each feature.
var sfNeighborhoods = joined.map(function(f) {
    var treesWithin = ee.List(f.get('trees'));
    var totalTrees = ee.FeatureCollection(treesWithin).size();
    return f.set('total_trees', totalTrees);
});

print(sfNeighborhoods.first());

// Export the results as a CSV.
Export.table.toDrive({
    collection: sfNeighborhoods,
    description: 'SF_Neighborhood_Tree_Count',
    folder: 'earthengine',
    fileNamePrefix: 'tree_count',
    fileFormat: 'CSV',
    selectors: ['nhood', 'total_trees']
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
