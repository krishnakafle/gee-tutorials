//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.3 The Remote Sensing Vocabulary
//  Checkpoint:   F13a
//  Authors:      K. Dyson, A. P. Nicolau, D. Saah, and N. Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//////
// Explore spatial resolution
//////

// Define a region of interest as a point at San Francisco airport.
var sfoPoint = ee.Geometry.Point(-122.3774, 37.6194);

// Center the map at that point.
Map.centerObject(sfoPoint, 16);

// MODIS
// Get an image from your imported MODIS MYD09GA collection.
var modisImage = mod09.filterDate('2020-02-01', '2020-03-01').first();

// Use these MODIS bands for near infrared, red, and green, respectively.
var modisBands = ['sur_refl_b02', 'sur_refl_b01', 'sur_refl_b04'];

// Define visualization parameters for MODIS.
var modisVis = {
    bands: modisBands,
    min: 0,
    max: 3000
};

// Add the MODIS image to the map.
Map.addLayer(modisImage, modisVis, 'MODIS');

// Get the scale of the data from the NIR band's projection:
var modisScale = modisImage.select('sur_refl_b02')
    .projection().nominalScale();

print('MODIS NIR scale:', modisScale);

// TM
// Filter TM imagery by location and date.

var tmImage = tm
    .filterBounds(Map.getCenter())
    .filterDate('1987-03-01', '1987-08-01')
    .first();

// Display the TM image as a false color composite.
Map.addLayer(tmImage, {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 100
}, 'TM');

// Get the scale of the TM data from its projection:
var tmScale = tmImage.select('B4')
    .projection().nominalScale();

print('TM NIR scale:', tmScale);

// MSI
// Filter MSI imagery by location and date.
var msiImage = msi
    .filterBounds(Map.getCenter())
    .filterDate('2020-02-01', '2020-04-01')
    .first();

// Display the MSI image as a false color composite.
Map.addLayer(msiImage, {
    bands: ['B8', 'B4', 'B3'],
    min: 0,
    max: 2000
}, 'MSI');

// Get the scale of the MSI data from its projection:
var msiScale = msiImage.select('B8')
    .projection().nominalScale();
print('MSI scale:', msiScale);

// NAIP
// Get NAIP images for the study period and region of interest.
var naipImage = naip
    .filterBounds(Map.getCenter())
    .filterDate('2018-01-01', '2018-12-31')
    .first();

// Display the NAIP mosaic as a color-IR composite.
Map.addLayer(naipImage, {
    bands: ['N', 'R', 'G']
}, 'NAIP');

// Get the NAIP resolution from the first image in the mosaic.
var naipScale = naipImage.select('N')
    .projection().nominalScale();

print('NAIP NIR scale:', naipScale);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------