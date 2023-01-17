//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.5 Heat Islands
//  Checkpoint:   A15d
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

//Filter the date range of interest using a date filter.
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

// Function to filter out cloudy pixels.
function cloudMask(cloudyScene) {
    // Add a cloud score band to the image.
    var scored = ee.Algorithms.Landsat.simpleCloudScore(cloudyScene);

    // Create an image mask from the cloud score band and specify threshold.
    var mask = scored.select(['cloud']).lte(10);

    // Apply the mask to the original image and return the masked image.
    return cloudyScene.updateMask(mask);
}

// Load the collection, apply coud mask, and filter to date and region of interest.
var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(regionInt)
    .filterDate('2014-01-01', '2019-01-01')
    .filter(sumFilter)
    .map(cloudMask);

print('Landsat collection', col);

// Generate median composite.
var image = col.median();

// Select thermal band 10 (with brightness temperature).
var thermal = image.select('B10')
    .clip(regionInt)
    .updateMask(notWater);

Map.addLayer(thermal, {
        min: 295,
        max: 310,
        palette: ['blue', 'white', 'red']
    },
    'Landsat_BT');

// Calculate Normalized Difference Vegetation Index (NDVI) 
// from Landsat surface reflectance.
var ndvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(regionInt)
    .filterDate('2014-01-01', '2019-01-01')
    .filter(sumFilter)
    .median()
    .normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
    .clip(regionInt)
    .updateMask(notWater);

Map.addLayer(ndvi, {
        min: 0,
        max: 1,
        palette: ['blue', 'white', 'green']
    },
    'ndvi');

// Find the minimum and maximum of NDVI.  Combine the reducers
// for efficiency (single pass over the data).
var minMax = ndvi.reduceRegion({
    reducer: ee.Reducer.min().combine({
        reducer2: ee.Reducer.max(),
        sharedInputs: true
    }),
    geometry: regionInt,
    scale: 30,
    maxPixels: 1e9
});
print('minMax', minMax);

var min = ee.Number(minMax.get('NDVI_min'));
var max = ee.Number(minMax.get('NDVI_max'));

// Calculate fractional vegetation.
var fv = ndvi.subtract(min).divide(max.subtract(min)).rename('FV');
Map.addLayer(fv, {
    min: 0,
    max: 1,
    palette: ['blue', 'white', 'green']
}, 'fv');

// Emissivity calculations.
var a = ee.Number(0.004);
var b = ee.Number(0.986);
var em = fv.multiply(a).add(b).rename('EMM').updateMask(notWater);

Map.addLayer(em, {
        min: 0.98,
        max: 0.99,
        palette: ['blue', 'white', 'green']
    },
    'EMM');

// Calculate LST from emissivity and brightness temperature.
var lstLandsat = thermal.expression(
    '(Tb/(1 + (0.001145* (Tb / 1.438))*log(Ep)))-273.15', {
        'Tb': thermal.select('B10'),
        'Ep': em.select('EMM')
    }).updateMask(notWater);

Map.addLayer(lstLandsat, {
        min: 25,
        max: 35,
        palette: ['blue', 'white', 'red'],
    },
    'LST_Landsat');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Link to the module that computes the Landsat LST.
var landsatLST = require(
    'projects/gee-edu/book:Part A - Applications/A1 - Human Applications/A1.5 Heat Islands/modules/Landsat_LST.js');

// Select region of interest, date range, and Landsat satellite.
var geometry = regionInt.geometry();
var satellite = 'L8';
var dateStart = '2014-01-01';
var dateEnd = '2019-01-01';
var useNdvi = true;

// Get Landsat collection with additional necessary variables.
var landsatColl = landsatLST.collection(satellite, dateStart, dateEnd,
    geometry, useNdvi);

// Create composite, clip, filter to summer, mask, and convert to degree Celsius.
var landsatComp = landsatColl
    .select('LST')
    .filter(sumFilter)
    .median()
    .clip(regionInt)
    .updateMask(notWater)
    .subtract(273.15);

Map.addLayer(landsatComp, {
        min: 25,
        max: 38,
        palette: ['blue', 'white', 'red']
    },
    'LST_SMW');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Function to subtract the original urban cluster from the buffered cluster 
// to generate rural references.
function bufferSubtract(feature) {
    return ee.Feature(feature.geometry()
        .buffer(2000)
        .difference(feature.geometry()));
}

var ruralRef = regionInt.map(bufferSubtract);

Map.addLayer(ruralRef, {
    color: 'green'
}, 'Buffer_ref');

// Define sequence of buffer widths to be tested.
var buffWidths = ee.List.sequence(30, 3000, 30);

// Function to generate standardized buffers (approximately comparable to area of urban cluster).
function bufferOptimize(feature) {
    function buff(buffLength) {
        var buffedPolygon = ee.Feature(feature.geometry()
                .buffer(ee.Number(buffLength)))
            .set({
                'Buffer_width': ee.Number(buffLength)
            });
        var area = buffedPolygon.geometry().difference(feature
            .geometry()).area();
        var diffFeature = ee.Feature(
            buffedPolygon.geometry().difference(feature
                .geometry()));
        return diffFeature.set({
            'Buffer_diff': area.subtract(feature.geometry()
                .area()).abs(),
            'Buffer_area': area,
            'Buffer_width': buffedPolygon.get('Buffer_width')
        });
    }

    var buffed = ee.FeatureCollection(buffWidths.map(buff));
    var sortedByBuffer = buffed.sort({
        property: 'Buffer_diff'
    });
    var firstFeature = ee.Feature(sortedByBuffer.first());
    return firstFeature.set({
        'Urban_Area': feature.get('Area'),
        'Buffer_width': firstFeature.get('Buffer_width')
    });
}

// Map function over urban feature collection.
var ruralRefStd = regionInt.map(bufferOptimize);

Map.addLayer(ruralRefStd, {
    color: 'brown'
}, 'Buffer_ref_std');

print('ruralRefStd', ruralRefStd);

// Select the NLCD land cover data.
var landCover = ee.Image('USGS/NLCD/NLCD2016').select('landcover');
var urban = landCover;

// Select urban pixels in image.
var urbanUrban = urban.updateMask(urban.eq(23).or(urban.eq(24)));

// Select background reference pixels in the image.
var nonUrbanVals = [41, 42, 43, 51, 52, 71, 72, 73, 74, 81, 82];
var nonUrbanPixels = urban.eq(ee.Image(nonUrbanVals)).reduce('max');
var urbanNonUrban = urban.updateMask(nonUrbanPixels);

Map.addLayer(urbanUrban.clip(regionInt), {
    palette: 'red'
}, 'Urban pixels');
Map.addLayer(urbanNonUrban.clip(regionInt), {
    palette: 'blue'
}, 'Non-urban pixels');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------