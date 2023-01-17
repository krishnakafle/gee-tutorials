//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.3 Built Environments
//  Checkpoint:   A13f
//  Author:       Erin Trochim
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import Tsinghua FROM-GLC Year of Change to Impervious Surface
var impervious = ee.Image('Tsinghua/FROM-GLC/GAIA/v10');

// Use the change year values found in the band. 
// The change year values is described here:
// https://developers.google.com/earth-engine/datasets/catalog/Tsinghua_FROM-GLC_GAIA_v10#bands
// Select only those areas which were impervious by 2000.
var impervious2000 = impervious.gte(19);

// Select only those areas which were impervious by 2018.
var impervious2018 = impervious.gte(1);

Map.setCenter(-98.688, 39.134, 5);

// Display the images.
Map.addLayer(
    impervious2000.selfMask(),
    {
        min: 0,
        max: 1,
        palette: ['014352', '856F96']
    },
    'Impervious Surface 2000');

Map.addLayer(
    impervious2018.selfMask(),
    {
        min: 0,
        max: 1,
        palette: ['014352', '1A492C']
    },
    'Impervious Surface 2018');
    
// Calculate the difference between impervious areas in 2000 and 2018.
var imperviousDiff = impervious2018.subtract(impervious2000);

Map.addLayer(
    imperviousDiff.selfMask(),
    {
        min: 0,
        max: 1,
        palette: ['014352', 'FFBF00']
    },
    'Impervious Surface Diff 2000-18');

// Import the Global Flood Database v1 (2000-2018).
var gfd = ee.ImageCollection('GLOBAL_FLOOD_DB/MODIS_EVENTS/V1');

// Map all floods to generate the satellite-observed historical flood plain.
var gfdFloodedSum = gfd.select('flooded').sum();

// Mask out areas of permanent water.
var gfdFloodedSumNoWater = gfdFloodedSum.updateMask(gfd.select(
    'jrc_perm_water').sum().lt(1));

var durationPalette = ['C3EFFE', '1341E8', '051CB0', '001133'];

Map.addLayer(
    gfdFloodedSumNoWater.selfMask(),
    {
        min: 0,
        max: 10,
        palette: durationPalette
    },
    'GFD Satellite Observed Flood Plain');

// Mask areas in the impervious difference image that are not in flood plains.
var imperviousDiffFloods = imperviousDiff
    .updateMask(gfdFloodedSumNoWater.gte(1));

// Which state has built the most area in the flood plains?
// Import FAO countries with first level administrative units.
var countries = ee.FeatureCollection('FAO/GAUL/2015/level1');

// Filter to the United States.
var unitedStates = countries.filter(ee.Filter.eq('ADM0_NAME',
    'United States of America'));

// Calculate the image area.
var areaImage = imperviousDiffFloods.multiply(ee.Image.pixelArea());

// Sum the area image for each state.
var unitedStatesImperviousDiffFlood = areaImage.reduceRegions({
        collection: unitedStates,
        reducer: ee.Reducer.sum(),
        scale: 100,
    }) // Sort descending.
    .sort('sum', false)
    // Get only the 5 highest states.
    .limit(5);

// Print state statistics for change in impervious area in flood plain.
print('Impervious-flood change statistics for states in US',
    unitedStatesImperviousDiffFlood);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
