//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60b
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// An image of the Thwaites glacier.
var imageId =
  'COPERNICUS/S1_GRD/S1B_EW_GRDM_1SSH_20211216T041925_20211216T042029_030045_03965B_AF0A';

// Look it up and select the HH band.
var img = ee.Image(imageId).select('HH');

// Use the palette library.
var palettes = require('users/gena/packages:palettes');

// Access the ice palette.
var icePalette = palettes.cmocean.Ice[7];

// Show it in the console.
palettes.showPalette('Ice', icePalette);

// Use  it to visualize the radar data.
Map.addLayer(img, {
    palette: icePalette,
    min: -15,
    max: 1
}, 'Sentinel-1 radar');

// Zoom to the grounding line of the Thwaites Glacier.
Map.centerObject(ee.Geometry.Point([-105.45882094907664, -
    74.90419580705336
]), 8);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
