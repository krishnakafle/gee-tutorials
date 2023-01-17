//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.3 Advanced Vector Operations 
//  Checkpoint:   F53a
//  Author:       Ujaval Gandhi
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var blocks = ee.FeatureCollection('TIGER/2010/Blocks');
var roads = ee.FeatureCollection('TIGER/2016/Roads');
var sfNeighborhoods = ee.FeatureCollection(
    'projects/gee-book/assets/F5-0/SFneighborhoods');

var geometry = sfNeighborhoods.geometry();
Map.centerObject(geometry);

// Creating a Choropleth Map

// Filter blocks to the San Francisco boundary.
var sfBlocks = blocks.filter(ee.Filter.bounds(geometry));

// Visualize with a single color.
Map.addLayer(sfBlocks, {
    color: '#de2d26'
}, 'Census Blocks (single color)');

// Visualize with values in a column using paint().

// Add a pop_density column.
var sfBlocks = sfBlocks.map(function(f) {
    // Get the polygon area in square miles.
    var area_sqmi = f.area().divide(2.59e6);
    var population = f.get('pop10');
    // Calculate population density.
    var density = ee.Number(population).divide(area_sqmi);
    return f.set({
        'area_sqmi': area_sqmi,
        'pop_density': density
    });
});

// Calculate the statistics of the newly computed column.
var stats = sfBlocks.aggregate_stats('pop_density');
print(stats);

// Create an empty image into which to paint the features.
// Cast to 32-bit integer which supports storing values
// up to 2,147,483,647.

var empty = ee.Image().int32();

// use paint() to color image with the values from the
// 'pop_density' column.
var sfBlocksPaint = empty.paint({
    featureCollection: sfBlocks,
    color: 'pop_density',
});

var palette = ['fee5d9', 'fcae91', 'fb6a4a', 'de2d26', 'a50f15'];
var visParams = {
    min: 0,
    max: 50000,
    palette: palette
};
Map.addLayer(sfBlocksPaint.clip(geometry), visParams,
    'Population Density');

// Filter roads to San Francisco boundary.
var sfRoads = roads.filter(ee.Filter.bounds(geometry));

Map.addLayer(sfRoads, {
    color: 'blue'
}, 'Roads (default)');

// Visualize with draw().
var sfRoadsDraw = sfRoads.draw({
    color: 'blue',
    strokeWidth: 1
});
Map.addLayer(sfRoadsDraw, {}, 'Roads (Draw)');

var styles = ee.Dictionary({
    'S1100': {
        'color': 'blue',
        'width': 3
    },
    'S1200': {
        'color': 'green',
        'width': 2
    },
    'S1400': {
        'color': 'orange',
        'width': 1
    }
});
var defaultStyle = {
    color: 'gray',
    'width': 1
};

var sfRoads = sfRoads.map(function(f) {
    var classcode = f.get('mtfcc');
    var style = styles.get(classcode, defaultStyle);
    return f.set('style', style);
});

var sfRoadsStyle = sfRoads.style({
    styleProperty: 'style'
});
Map.addLayer(sfRoadsStyle.clip(geometry), {}, 'Roads (Style)');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
