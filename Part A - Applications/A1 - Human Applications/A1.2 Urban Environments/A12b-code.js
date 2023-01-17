//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.2 Urban Environments
//  Checkpoint:   A12b
//  Authors:      Michelle Stuhlmacher and Ran Goldblatt
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// MODIS (Accra)
// Center over Accra.
Map.setCenter(-0.2264, 5.5801, 10);

// Visualize the full classification.
var MODIS_lc = MODIS.select('LC_Type1');
var igbpLandCoverVis = {
    min: 1.0,
    max: 17.0,
    palette: ['05450a', '086a10', '54a708', '78d203', '009900',
        'c6b044', 'dcd159', 'dade48', 'fbff13', 'b6ff05',
        '27ff87', 'c24f44', 'a5a5a5', 'ff6d4c', '69fff8',
        'f9ffa4', '1c0dff'
    ],
};
Map.addLayer(MODIS_lc, igbpLandCoverVis, 'IGBP Land Cover');

// Visualize the urban extent in 2001 and 2019.
// 2019
var MODIS_2019 = MODIS_lc.filterDate(ee.Date('2019-01-01'));

var M_urb_2019 = MODIS_2019.mosaic().eq(13);
Map.addLayer(M_urb_2019.mask(M_urb_2019), {
    'palette': 'FF0000'
}, 'MODIS Urban 2019');

var MODIS_2001 = MODIS_lc.filterDate(ee.Date('2001-01-01'));
var M_urb_2001 = MODIS_2001.mosaic().eq(13);
Map.addLayer(M_urb_2001.mask(M_urb_2001), {
    'palette': 'a5a5a5'
}, 'MODIS Urban 2001');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------