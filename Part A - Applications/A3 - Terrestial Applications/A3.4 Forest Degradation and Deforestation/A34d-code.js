//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.4 Forest Degradation and Deforestation
//  Checkpoint:   A34d
//  Author:       Carlos Souza Jr., Karis Tenneson, John Dilger, 
//                Crystal Wespestad, Eric Bullock
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var api = require('users/bullocke/coded:CODED/api');
var utils = require('projects/GLANCE:ccdcUtilities/api');

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

// We will use the geometry of the image from the previous section as 
// the study area.
var studyArea = ee.Image(
        'LANDSAT/LT05/C02/T1_L2/LT05_226068_19840411')
    .geometry();

// Get cloud masked (Fmask) Landsat imagery.
var landsat = utils.Inputs.getLandsat()
    .filterBounds(studyArea)
    .filterDate('1984-01-01', '2021-01-01');

// Make a forest mask
var gfwImage = ee.Image('UMD/hansen/global_forest_change_2019_v1_7');

// Get areas of forest cover above the threshold
var treeCover = 40;
var forestMask = gfwImage.select('treecover2000')
    .gte(treeCover)
    .rename('landcover');

var samples = ee.FeatureCollection(
    'projects/gee-book/assets/A3-4/sample_with_pred_hansen_2010');

var minObservations = 4;
var chiSquareProbability = 0.97;
var training = samples;
var forestValue = 1;
var startYear = 1990;
var endYear = 2020;
var classBands = ['NDFI', 'GV', 'Shade', 'NPV', 'Soil'];
var prepTraining = false;

//---------------- CODED parameters
var codedParams = {
    minObservations: minObservations,
    chiSquareProbability: chiSquareProbability,
    training: training,
    studyArea: studyArea,
    forestValue: forestValue,
    forestMask: forestMask,
    classBands: classBands,
    collection: landsat,
    startYear: startYear,
    endYear: endYear,
    prepTraining: prepTraining
};

// -------------- Run CODED
var results = api.ChangeDetection.coded(codedParams);
print(results);

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------