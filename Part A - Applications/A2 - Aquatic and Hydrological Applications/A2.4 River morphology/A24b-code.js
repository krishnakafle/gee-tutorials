//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.4 River Morphology 
//  Checkpoint:   A24b
//  Authors:      Xiao Yang, Theodore Langhorst, Tamlin M. Pavelsky
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// THIS SCRIPT IS DESIGNED AS A TUTORIAL TO SHOWCASE USING GOOGLE EARTH ENGINE TO ANALYSE 
// RIVER PLANVIEW GEOMETRIES AND MORPHOLOGICAL DYNAMICS. THE ANALYSIS IS BUILT ON EXISTING 
// MONTHLY WATER CLASSIFICATIONS DATASETS AVAILABLE IN GOOGLE EARTH ENGINE. BY SHOWING
// PREPROCESSING STEPS LIKE HOW TO IDENTIFY RIVERS FROM OTHER TYPES OF WATER BODIES, AND HOW 
// TO USE MULTI TEMPORAL WATER LAYERS TO EXTRACT DYNAMICAL CHANGES IN RIVER MORPHOLOGY, IT PROVIDES 
// A GUIDE TO EXTRACT INFORMATIONS ON RIVERS USING GOOGLE EARTH ENGINE.

// ==========================================================

var getUTMProj = function(lon, lat) {
    // given longitude and latitude (in degree decimals) return EPSG string for the 
    // corresponding UTM projection
    // see https://apollomapping.com/blog/gtm-finding-a-utm-zone-number-easily and
    // https://sis.apache.org/faq.html
    var utmCode = ee.Number(lon).add(180).divide(6).ceil().int();
    var output = ee.Algorithms.If(ee.Number(lat).gte(0),
        ee.String('EPSG:326').cat(utmCode.format('%02d')),
        ee.String('EPSG:327').cat(utmCode.format('%02d')));
    return (output);
};

var coords = aoi.centroid(30).coordinates();
var lon = coords.get(0);
var lat = coords.get(1);
var crs = getUTMProj(lon, lat);
var scale = ee.Number(30);

var rpj = function(image) {
    return image.reproject({
        crs: crs,
        scale: scale
    });
};

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------

// IMPORT AND VISUALIZE SURFACE WATER MASK.
// Surface water occurrence dataset from the JRC (Pekel et al., 2016).
var jrcYearly = ee.ImageCollection('JRC/GSW1_3/YearlyHistory');

// Select the seasonal and permanent pixels image representing the year 2000
var watermask = jrcYearly.filter(ee.Filter.eq('year', 2000)).first()
    .gte(2).unmask(0)
    .clip(aoi);

Map.centerObject(aoi);
Map.addLayer(ee.Image.constant(0), {
    min: 0,
    palette: ['black']
}, 'bg', false);
Map.addLayer(watermask, {}, 'watermask', false);

// REMOVE NOISE AND SMALL ISLANDS TO SIMPLIFY THE TOPOLOGY.

// a. Image closure operation to fill small holes.
watermask = watermask.focal_max().focal_min();

// b. Identify small bars and fill them in to create a filled water mask.
var MIN_SIZE = 2E3;
var barPolys = watermask.not().selfMask()
    .reduceToVectors({
        geometry: aoi,
        scale: 30,
        eightConnected: true
    })
    .filter(ee.Filter.lte('count', MIN_SIZE)); // Get small polys.
var filled = watermask.paint(barPolys, 1);

Map.addLayer(rpj(filled), {
    min: 0,
    max: 1
}, 'filled water mask', false);

// IDENTIFYING RIVERS FROM OTHER TYPES OF WATER BODIES.
// Cumulative cost mapping to find pixels connected to a reference centerline.
var costmap = filled.not().cumulativeCost({
    source: watermask.and(ee.Image().toByte().paint(sword,
        1)),
    maxDistance: 3E3,
    geodeticDistance: false
});

var rivermask = costmap.eq(0).rename('riverMask');
var channelmask = rivermask.and(watermask);

Map.addLayer(sword, {
    color: 'red'
}, 'sword', false);
Map.addLayer(rpj(costmap), {
    min: 0,
    max: 1E3
}, 'costmap', false);
Map.addLayer(rpj(rivermask), {}, 'rivermask', false);
Map.addLayer(rpj(channelmask), {}, 'channelmask', false);

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------
