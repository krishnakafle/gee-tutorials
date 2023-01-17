//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.7 Interpreting Time Series with CCDC
//  Checkpoint:   F47e
//  Authors:      Paulo Arévalo, Pontus Olofsson
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load the required libraries.
var palettes = require('users/gena/packages:palettes');
var utils = require(
    'users/parevalo_bu/gee-ccdc-tools:ccdcUtilities/api');

// Load the results.
var resultsPath =
    'projects/gee-book/assets/F4-7/Rondonia_example_small';
var ccdResults = ee.Image(resultsPath);
Map.centerObject(ccdResults, 10);

// Convert a date into fractional years.
var inputDate = '2005-09-25';
var dateParams = {
    inputFormat: 3,
    inputDate: inputDate,
    outputFormat: 1
};
var formattedDate = utils.Dates.convertDate(dateParams);

// Band names originally used as inputs to the CCD algorithm.
var BANDS = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2'];

// Names for the time segments to retrieve.
var SEGS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9',
    'S10'
];

// Transform CCD results into a multiband image.
var ccdImage = utils.CCDC.buildCcdImage(ccdResults, SEGS.length,
    BANDS);
print(ccdImage);

// Define bands to select.
var SELECT_BANDS = ['RED', 'GREEN', 'BLUE', 'NIR'];

// Define coefficients to select. 
// This list contains all possible coefficients, and the RMSE
var SELECT_COEFS = ['INTP', 'SLP', 'RMSE'];

// Obtain coefficients.
var coefs = utils.CCDC.getMultiCoefs(
    ccdImage, formattedDate, SELECT_BANDS, SELECT_COEFS, true,
    SEGS, 'after');
print(coefs);

// Show a single coefficient.
var slpVisParams = {
    palette: palettes.matplotlib.viridis[7],
    min: -0.0005,
    max: 0.005
};
Map.addLayer(coefs.select('RED_SLP'), slpVisParams,
    'RED SLOPE 2005-09-25');

var rmseVisParams = {
    palette: palettes.matplotlib.viridis[7],
    min: 0,
    max: 0.1
};
Map.addLayer(coefs.select('NIR_RMSE'), rmseVisParams,
    'NIR RMSE 2005-09-25');

// Show an RGB with three coefficients.
var rgbVisParams = {
    bands: ['RED_INTP', 'GREEN_INTP', 'BLUE_INTP'],
    min: 0,
    max: 0.1
};
Map.addLayer(coefs, rgbVisParams, 'RGB 2005-09-25');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
 