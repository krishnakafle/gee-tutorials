//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60j
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var dem = ee.Image('AHN/AHN2_05M_RUW');

// Change map style to HYBRID and center map on the Netherlands
Map.setOptions('HYBRID');
Map.setCenter(4.4082, 52.1775, 18);

// Visualize DEM using black-white color palette
var palette = ['black', 'white'];
var demRGB = dem.visualize({
    min: -5,
    max: 5,
    palette: palette
});
Map.addLayer(demRGB, {}, 'DEM');

var utils = require('users/gena/packages:utils');

var weight =
    0.4; // Weight of Hillshade vs RGB (0 - flat, 1 - hillshaded).
var exaggeration = 5; // Vertical exaggeration.
var azimuth = 315; // Sun azimuth.
var zenith = 20; // Sun elevation.
var brightness = -0.05; // 0 - default.
var contrast = 0.05; // 0 - default.
var saturation = 0.8; // 1 - default.
var castShadows = false;

var rgb = utils.hillshadeRGB(
    demRGB, dem, weight, exaggeration, azimuth, zenith,
    contrast, brightness, saturation, castShadows);

Map.addLayer(rgb, {}, 'DEM (no shadows)');

var castShadows = true;

var rgb = utils.hillshadeRGB(
    demRGB, dem, weight, exaggeration, azimuth, zenith,
    contrast, brightness, saturation, castShadows);

Map.addLayer(rgb, {}, 'DEM (with shadows)');

var palettes = require('users/gena/packages:palettes');
var palette = palettes.crameri.oleron[50];

var demRGB = dem.visualize({min: -5, max: 5, palette: palette});

var castShadows = true;

var rgb = utils.hillshadeRGB(
  demRGB, dem, weight, exaggeration, azimuth, zenith, 
  contrast, brightness, saturation, castShadows);

Map.addLayer(rgb, {}, 'DEM colormap');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------