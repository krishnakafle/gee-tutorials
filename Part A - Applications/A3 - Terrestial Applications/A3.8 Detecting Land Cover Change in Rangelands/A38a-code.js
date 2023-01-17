//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.8 Detecting Land Cover Change in Rangelands
//  Checkpoint:   A38a
//  Authors:      Ginger Allington, Natalie Kreitzer
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load the shapefile asset for the AOI as a Feature Collection
var aoi = ee.FeatureCollection(
    'projects/gee-book/assets/A3-8/GEE_Ch_AOI');
Map.centerObject(aoi, 11);
Map.addLayer(aoi, {}, 'Subset of Naiman Banner');

// Filter the MODIS Collection 
var MODIS_LC = ee.ImageCollection('MODIS/006/MCD12Q1').select(
    'LC_Type1');

// Function to clip an image from the collection and set the year
var clipCol = function(img) {
    var date = ee.String(img.get('system:index'));
    date = date.slice(0, 4);
    return img.select('LC_Type1').clip(aoi) // .clip(aoi)
        .set('year', date);
};

// Generate images for diff years you want to compare
var modis01 = MODIS_LC.filterDate('2001-01-01', '2002-01-01').map(
    clipCol);
var modis09 = MODIS_LC.filterDate('2009-01-01', '2010-01-01').map(
    clipCol);
var modis16 = MODIS_LC.filterDate('2016-01-01', '2017-01-01').map(
    clipCol);
// Create an Image for each of the years
var modis01 = modis01.first();
var modis09 = modis09.first();
var modis16 = modis16.first();

Map.addLayer(modis01.randomVisualizer(), {}, 'modis 2001', false);
Map.addLayer(modis09.randomVisualizer(), {}, 'modis 2009', false);
Map.addLayer(modis16.randomVisualizer(), {}, 'modis 2016', false);

// Add and clip the WorldCover data
var wCov = ee.ImageCollection('ESA/WorldCover/v100').first();
var landcover20 = wCov.clip(aoi);
Map.addLayer(landcover20, {}, 'Landcover 2020');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------