//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.4 River Morphology 
//  Checkpoint:   A24c
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

// Import existing functions from RivWidthCloud.
// Code repository for RivWidthCloud can be accessed at 
// https://code.earthengine.google.com/?accept_repo=users/eeProject/RivWidthCloudPaper
var riverFunctions = require(
    'users/eeProject/RivWidthCloudPaper:functions_river.js');
var clFunctions = require(
    'users/eeProject/RivWidthCloudPaper:functions_centerline_width.js'
);

//Calculate distance from shoreline using distance transform.

var distance = clFunctions.CalcDistanceMap(rivermask, 256, scale);
Map.addLayer(rpj(distance), {
    min: 0,
    max: 500
}, 'distance raster', false);

// Calculate gradient of the distance raster.
// There are three different ways (kernels) to calculate the gradient. 
// By default, the function used the second approach. 
// For details on the kernels, please see the source code for this function.
var gradient = clFunctions.CalcGradientMap(distance, 2, scale);
Map.addLayer(rpj(gradient), {}, 'gradient raster', false);

// Threshold the gradient raster and derive 1px width centerline using skeletonization.

var centerlineRaw = clFunctions.CalcOnePixelWidthCenterline(rivermask,
    gradient, 0.9);
var raw1pxCenterline = rpj(centerlineRaw).eq(1).selfMask();
Map.addLayer(raw1pxCenterline, {
    palette: ['red']
}, 'raw 1px centerline', false);

// Prune the centerline to remove spurious branches.
var MAXDISTANCE_BRANCH_REMOVAL = 500;
// Note: the last argument of the CleanCenterline function enables removal of the pixels 
// so that the resulting centerline will have 1px width in an 8-connected way. 
// Once it is done, it doesn’t need to be done the second time (thus it equals false)
var cl1px = clFunctions
    .CleanCenterline(centerlineRaw, MAXDISTANCE_BRANCH_REMOVAL, true);
var cl1px = clFunctions
    .CleanCenterline(cl1px, MAXDISTANCE_BRANCH_REMOVAL, false);
var final1pxCenterline = rpj(cl1px).eq(1).selfMask();
Map.addLayer(final1pxCenterline, {
    palette: ['red']
}, 'final 1px centerline', false);

// Calculate perpendicular direction for the cleaned centerline.
var angle = clFunctions.CalculateAngle(cl1px);
var angleVis = {
    min: 0,
    max: 360,
    palette: ['#ffffd4', '#fed98e', '#fe9929', '#d95f0e',
        '#993404'
    ]
};
Map.addLayer(rpj(angle), angleVis, 'cross-sectional directions',
    false);

// Estimate width.
var rwcFunction = require(
    'users/eeProject/RivWidthCloudPaper:rwc_watermask.js');
var rwc = rwcFunction.rwGen_waterMask(4000, 333, 500, aoi);
watermask = ee.Image(watermask.rename(['waterMask']).setMulti({
    crs: crs,
    scale: 30,
    image_id: 'aoi'
}));

var widths = rwc(watermask);
print('example width output', widths.first());

var bankMask = channelmask.focal_max(1).neq(channelmask);

var bankDistance = channelmask.not().cumulativeCost({
    source: channelmask,
    maxDistance: 1E2,
    geodeticDistance: false
});

var bankAspect = ee.Terrain.aspect(bankDistance)
    .multiply(Math.PI).divide(180)
    .mask(bankMask).rename('bankAspect');

var distanceKernel = ee.Kernel.euclidean({
    radius: 30,
    units: 'meters',
    magnitude: 0.5
});
var bankLength = bankMask.convolve(distanceKernel)
    .mask(bankMask).rename('bankLength');

var radianVis = {
    min: 0,
    max: 2 * Math.PI,
    palette: ['red', 'yellow', 'green', 'teal', 'blue', 'magenta',
        'red'
    ]
};
Map.addLayer(rpj(bankAspect), radianVis, 'bank aspect', false);
Map.addLayer(rpj(bankLength), {
    min: 0,
    max: 60
}, 'bank length', false);

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------