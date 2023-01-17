//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60c
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Advanced remapping using NLCD.
// Import NLCD.
var nlcd = ee.ImageCollection('USGS/NLCD_RELEASES/2016_REL');

// Use Filter to select the 2016 dataset.
var nlcd2016 = nlcd.filter(ee.Filter.eq('system:index', '2016'))
    .first();

// Select the land cover band.
var landcover = nlcd2016.select('landcover');

// Map the NLCD land cover.
Map.addLayer(landcover, null, 'NLCD Landcover');


// Now suppose we want to change the color palette. 
var newPalette = ['466b9f', 'd1def8', 'dec5c5',
    'ab0000', 'ab0000', 'ab0000',
    'b3ac9f', '68ab5f', '1c5f2c',
    'b5c58f', 'af963c', 'ccb879',
    'dfdfc2', 'd1d182', 'a3cc51',
    '82ba9e', 'dcd939', 'ab6c28',
    'b8d9eb', '6c9fb8'
];

// Try mapping with the new color palette.
Map.addLayer(landcover, {
    palette: newPalette
}, 'NLCD New Palette');

// Extract the class values and save them as a list.
var values = ee.List(landcover.get('landcover_class_values'));

// Print the class values to console.
print('raw class values', values);

// Determine the maximum index value
var maxIndex = values.size().subtract(1);

// Create a new index for the remap
var indexes = ee.List.sequence(0, maxIndex);

// Print the updated class values to console.
print('updated class values', indexes);

// Remap NLCD and display it in the map.
var colorized = landcover.remap(values, indexes)
    .visualize({
        min: 0,
        max: maxIndex,
        palette: newPalette
    });
Map.addLayer(colorized, {}, 'NLCD Remapped Colors');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
