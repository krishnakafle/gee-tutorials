//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.1 Agricultural Environments
//  Checkpoint:   A11a
//  Authors:      Sherrie Wang, George Azzari
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

////////////////////////////////////////////////////////////
// 1. Pull all Landsat 7 and 8 images over study area
////////////////////////////////////////////////////////////

// Define study area.
var TIGER = ee.FeatureCollection('TIGER/2018/Counties');
var region = ee.Feature(TIGER
    .filter(ee.Filter.eq('STATEFP', '17'))
    .filter(ee.Filter.eq('NAME', 'McLean'))
    .first());
var geometry = region.geometry();
Map.centerObject(region);
Map.addLayer(region, {
    'color': 'red'
}, 'McLean County');

// Import Landsat imagery.
var landsat7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');

// Functions to rename Landsat 7 and 8 images.
function renameL7(img) {
    return img.rename(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1',
        'SWIR2', 'TEMP1', 'ATMOS_OPACITY', 'QA_CLOUD',
        'ATRAN', 'CDIST',
        'DRAD', 'EMIS', 'EMSD', 'QA', 'TRAD', 'URAD',
        'QA_PIXEL',
        'QA_RADSAT'
    ]);
}

function renameL8(img) {
    return img.rename(['AEROS', 'BLUE', 'GREEN', 'RED', 'NIR',
        'SWIR1',
        'SWIR2', 'TEMP1', 'QA_AEROSOL', 'ATRAN', 'CDIST',
        'DRAD', 'EMIS',
        'EMSD', 'QA', 'TRAD', 'URAD', 'QA_PIXEL', 'QA_RADSAT'
    ]);
}

// Functions to mask out clouds, shadows, and other unwanted features.
function addMask(img) {
    // Bit 0: Fill
    // Bit 1: Dilated Cloud
    // Bit 2: Cirrus (high confidence) (L8) or unused (L7)
    // Bit 3: Cloud
    // Bit 4: Cloud Shadow
    // Bit 5: Snow
    // Bit 6: Clear
    //        0: Cloud or Dilated Cloud bits are set
    //        1: Cloud and Dilated Cloud bits are not set
    // Bit 7: Water
    var clear = img.select('QA_PIXEL').bitwiseAnd(64).neq(0);
    clear = clear.updateMask(clear).rename(['pxqa_clear']);

    var water = img.select('QA_PIXEL').bitwiseAnd(128).neq(0);
    water = water.updateMask(water).rename(['pxqa_water']);

    var cloud_shadow = img.select('QA_PIXEL').bitwiseAnd(16).neq(0);
    cloud_shadow = cloud_shadow.updateMask(cloud_shadow).rename([
        'pxqa_cloudshadow'
    ]);

    var snow = img.select('QA_PIXEL').bitwiseAnd(32).neq(0);
    snow = snow.updateMask(snow).rename(['pxqa_snow']);

    var masks = ee.Image.cat([
        clear, water, cloud_shadow, snow
    ]);

    return img.addBands(masks);
}

function maskQAClear(img) {
    return img.updateMask(img.select('pxqa_clear'));
}

// Function to add GCVI as a band.
function addVIs(img){
  var gcvi = img.expression('(nir / green) - 1', {
      nir: img.select('NIR'),
      green: img.select('GREEN')
  }).select([0], ['GCVI']);
  
  return ee.Image.cat([img, gcvi]);
}

// Define study time period.
var start_date = '2020-01-01';
var end_date = '2020-12-31';

// Pull Landsat 7 and 8 imagery over the study area between start and end dates.
var landsat7coll = landsat7
    .filterBounds(geometry)
    .filterDate(start_date, end_date)
    .map(renameL7);

var landsat8coll = landsat8
    .filterDate(start_date, end_date)
    .filterBounds(geometry)
    .map(renameL8);
    
// Merge Landsat 7 and 8 collections.
var landsat = landsat7coll.merge(landsat8coll)
    .sort('system:time_start');

// Mask out non-clear pixels, add VIs and time variables.
landsat = landsat.map(addMask)
    .map(maskQAClear)
    .map(addVIs);

// Visualize GCVI time series at one location.
var point = ee.Geometry.Point([-88.81417685576481,
    40.579804398254005
]);
var landsatChart = ui.Chart.image.series(landsat.select('GCVI'),
        point)
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Landsat GCVI time series',
        lineWidth: 1,
        pointSize: 3,
    });
print(landsatChart);

// Get crop type dataset.
var cdl = ee.Image('USDA/NASS/CDL/2020').select(['cropland']);
Map.addLayer(cdl.clip(geometry), {}, 'CDL 2020');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
