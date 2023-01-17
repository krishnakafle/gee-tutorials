//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.3 Clouds and Image Compositing
//  Checkpoint:   F43a
//  Authors:      Txomin Hermosilla, Saverio Francini, Andréa P. Nicolau, 
//                Michael A. Wulder, Joanne C. White, Nicholas C. Coops, 
//                Gherardo Chirici
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ---------- Section 1 -----------------

// Define the AOI.
var country = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
    .filter(ee.Filter.equals('country_na', 'Colombia'));

// Center the Map. The second parameter is zoom level.
Map.centerObject(country, 5);

// Define time variables.
var startDate = '2019-01-01';
var endDate = '2019-12-31';

// Load and filter the Landsat 8 collection.
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(country)
    .filterDate(startDate, endDate);

// Apply scaling factors.
function applyScaleFactors(image) {
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-
        0.2);
    var thermalBands = image.select('ST_B.*').multiply(0.00341802)
        .add(149.0);
    return image.addBands(opticalBands, null, true)
        .addBands(thermalBands, null, true);
}

landsat8 = landsat8.map(applyScaleFactors);

// Create composite.
var composite = landsat8.median().clip(country);

var visParams = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0,
    max: 0.2
};
Map.addLayer(composite, visParams, 'L8 Composite');

// Filter by the CLOUD_COVER property.
var landsat8FiltClouds = landsat8
    .filterBounds(country)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lessThan('CLOUD_COVER', 50));

// Create a composite from the filtered imagery.
var compositeFiltClouds = landsat8FiltClouds.median().clip(country);

Map.addLayer(compositeFiltClouds, visParams,
    'L8 Composite cloud filter');
    
// Print size of collections, for comparison.
print('Size landsat8 collection', landsat8.size());
print('Size landsat8FiltClouds collection', landsat8FiltClouds.size());

// Define the cloud mask function.
function maskSrClouds(image) {
    // Bit 0 - Fill
    // Bit 1 - Dilated Cloud
    // Bit 2 - Cirrus
    // Bit 3 - Cloud
    // Bit 4 - Cloud Shadow
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111',
        2)).eq(0);
    var saturationMask = image.select('QA_RADSAT').eq(0);

    return image.updateMask(qaMask)
        .updateMask(saturationMask);
}

// Apply the cloud mask to the collection.
var landsat8FiltMasked = landsat8FiltClouds.map(maskSrClouds);

// Create a composite.
var landsat8compositeMasked = landsat8FiltMasked.median().clip(country);

Map.addLayer(landsat8compositeMasked, visParams, 'L8 composite masked');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
