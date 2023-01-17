//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.2 Urban Environments
//  Checkpoint:   A12c
//  Authors:      Michelle Stuhlmacher and Ran Goldblatt
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// CORINE (London)
// Center over London
Map.setCenter(-0.1795, 51.4931, 10);

// Visualize the urban extent in 2000 and 2018.
// 2018 (2017-2018)
var CORINE_2018 = CORINE.select('landcover').filterDate(ee.Date(
    '2017-01-01'));

var C_urb_2018 = CORINE_2018.mosaic().lte(133); //Select urban areas
Map.addLayer(C_urb_2018.mask(C_urb_2018), {
    'palette': 'FF0000'
}, 'CORINE Urban 2018');

// 2000 (1999-2001)
var CORINE_2000 = CORINE.select('landcover').filterDate(ee.Date(
    '1999-01-01'));
var C_urb_2000 = CORINE_2000.mosaic().lte(133); //Select urban areas
Map.addLayer(C_urb_2000.mask(C_urb_2000), {
    'palette': 'a5a5a5'
}, 'CORINE Urban 2000');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------