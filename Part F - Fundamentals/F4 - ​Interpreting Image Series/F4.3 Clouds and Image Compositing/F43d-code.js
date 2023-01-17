//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.3 Clouds and Image Compositing
//  Checkpoint:   F43d
//  Authors:      Txomin Hermosilla, Saverio Francini, Andréa P. Nicolau, 
//                Michael A. Wulder, Joanne C. White, Nicholas C. Coops, 
//                Gherardo Chirici
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Define required parameters.
var targetDay = '06-01';
var daysRange = 75;
var cloudsTh = 70;
var SLCoffPenalty = 0.7;
var opacityScoreMin = 0.2;
var opacityScoreMax = 0.3;
var cloudDistMax = 1500;
var despikeTh = 0.65;
var despikeNbands = 3;
var startYear = 2015;
var endYear = 2017;

// Define study area.
var worldCountries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
var colombia = worldCountries.filter(ee.Filter.eq('country_na',
    'Colombia'));

// Load the bap library.
var library = require('users/sfrancini/bap:library');

// Calculate BAP.
var BAPCS = library.BAP(null, targetDay, daysRange, cloudsTh,
    SLCoffPenalty, opacityScoreMin, opacityScoreMax, cloudDistMax);

// Despike the collection.
BAPCS = library.despikeCollection(despikeTh, despikeNbands, BAPCS,
    1984, 2021, true);

// Infill datagaps. 
BAPCS = library.infill(BAPCS, 1984, 2021, false, true);

// Visualize the image.
Map.centerObject(colombia, 5);
library.ShowCollection(BAPCS, startYear, endYear, colombia, false,
    null);
library.AddSLider(startYear, endYear);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
