//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.4 River Morphology 
//  Checkpoint:   A24a
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