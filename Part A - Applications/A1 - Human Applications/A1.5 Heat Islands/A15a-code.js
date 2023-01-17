//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.5 Heat Islands
//  Checkpoint:   A15a
//  Author:       TC Chakraborty
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load feature collection of New Haven's census tracts from user assets. 
var regionInt = ee.FeatureCollection(
    'projects/gee-book/assets/A1-5/TC_NewHaven');

// Get dissolved feature collection using an error margin of 50 meters.
var regionInt = regionInt.union(50);

// Set map center and zoom level (Zoom level varies from 1 to 20).
Map.setCenter(-72.9, 41.3, 12);

// Add layer to map.
Map.addLayer(regionInt, {}, 'New Haven boundary');

// Load MODIS image collection from the Earth Engine data catalog.
var modisLst = ee.ImageCollection('MODIS/006/MYD11A2');

// Select the band of interest (in this case: Daytime LST).
var landSurfTemperature = modisLst.select('LST_Day_1km');

// Create a summer filter.
var sumFilter = ee.Filter.dayOfYear(152, 243);

// Filter the date range of interest using a date filter.
var lstDateInt = landSurfTemperature
    .filterDate('2014-01-01', '2019-01-01').filter(sumFilter);

// Take pixel-wise mean of all the images in the collection.
var lstMean = lstDateInt.mean();

// Multiply each pixel by scaling factor to get the LST values.
var lstFinal = lstMean.multiply(0.02);

// Generate a water mask.
var water = ee.Image('JRC/GSW1_0/GlobalSurfaceWater').select(
    'occurrence');
var notWater = water.mask().not();

// Clip data to region of interest, convert to degree Celsius, and mask water pixels.
var lstNewHaven = lstFinal.clip(regionInt).subtract(273.15)
    .updateMask(notWater);

// Add layer to map.
Map.addLayer(lstNewHaven, {
        palette: ['blue', 'white', 'red'],
        min: 25,
        max: 38
    },
    'LST_MODIS');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------