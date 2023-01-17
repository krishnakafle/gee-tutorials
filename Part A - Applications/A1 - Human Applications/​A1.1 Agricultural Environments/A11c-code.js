//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.1 Agricultural Environments
//  Checkpoint:   A11c
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

////////////////////////////////////////////////////////////
// 2. Add bands for harmonics
////////////////////////////////////////////////////////////

// Function that adds time band to an image. 
function addTimeUnit(image, refdate) {
    var date = image.date();

    var dyear = date.difference(refdate, 'year');
    var t = image.select(0).multiply(0).add(dyear).select([0], ['t'])
        .float();

    var imageplus = image.addBands(t);

    return imageplus;
}

// Function that adds harmonic basis to an image.
function addHarmonics(image, omega, refdate) {
    image = addTimeUnit(image, refdate);
    var timeRadians = image.select('t').multiply(2 * Math.PI * omega);
    var timeRadians2 = image.select('t').multiply(4 * Math.PI *
    omega);

    return image
        .addBands(timeRadians.cos().rename('cos'))
        .addBands(timeRadians.sin().rename('sin'))
        .addBands(timeRadians2.cos().rename('cos2'))
        .addBands(timeRadians2.sin().rename('sin2'))
        .addBands(timeRadians.divide(timeRadians)
            .rename('constant'));
}

// Apply addHarmonics to Landsat image collection.
var omega = 1;
var landsatPlus = landsat.map(
    function(image) {
        return addHarmonics(image, omega, start_date);
    });
print('Landsat collection with harmonic basis: ', landsatPlus);
 
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

////////////////////////////////////////////////////////////
// 3. Get harmonic coefficients
////////////////////////////////////////////////////////////

// Function to run linear regression on an image.
function arrayimgHarmonicRegr(harmonicColl, dependent, independents) {

    independents = ee.List(independents);
    dependent = ee.String(dependent);

    var regression = harmonicColl
        .select(independents.add(dependent))
        .reduce(ee.Reducer.linearRegression(independents.length(),
        1));

    return regression;
}

// Function to extract and rename regression coefficients.
function imageHarmonicRegr(harmonicColl, dependent, independents) {

    var hregr = arrayimgHarmonicRegr(harmonicColl, dependent,
        independents);

    independents = ee.List(independents);
    dependent = ee.String(dependent);

    var newNames = independents.map(function(b) {
        return dependent.cat(ee.String('_')).cat(ee.String(
        b));
    });

    var imgCoeffs = hregr.select('coefficients')
        .arrayProject([0])
        .arrayFlatten([independents])
        .select(independents, newNames);

    return imgCoeffs;
}

// Function to apply imageHarmonicRegr and create a multi-band image.
function getHarmonicCoeffs(harmonicColl, bands, independents) {
    var coefficients = ee.ImageCollection.fromImages(bands.map(
        function(band) {
            return imageHarmonicRegr(harmonicColl, band,
                independents);
        }));
    return coefficients.toBands();
}

// Apply getHarmonicCoeffs to ImageCollection.
var bands = ['NIR', 'SWIR1', 'SWIR2', 'GCVI'];
var independents = ee.List(['constant', 'cos', 'sin', 'cos2',
'sin2']);
var harmonics = getHarmonicCoeffs(landsatPlus, bands, independents);

harmonics = harmonics.clip(geometry);
harmonics = harmonics.multiply(10000).toInt32();

// Compute fitted values.
var gcviHarmonicCoefficients = harmonics
    .select([
        '3_GCVI_constant', '3_GCVI_cos',
        '3_GCVI_sin', '3_GCVI_cos2', '3_GCVI_sin2'
    ])
    .divide(10000);

var fittedHarmonic = landsatPlus.map(function(image) {
    return image.addBands(
        image.select(independents)
        .multiply(gcviHarmonicCoefficients)
        .reduce('sum')
        .rename('fitted')
    );
});

// Visualize the fitted harmonics in a chart.
var harmonicsChart = ui.Chart.image.series(
        fittedHarmonic.select(
            ['fitted', 'GCVI']), point, ee.Reducer.mean(), 30)
    .setSeriesNames(['GCVI', 'Fitted'])
    .setOptions({
        title: 'Landsat GCVI time series and fitted harmonic regression values',
        lineWidth: 1,
        pointSize: 3,
    });

print(harmonicsChart);

// Add CDL as a band to the harmonics.
var harmonicsPlus = ee.Image.cat([harmonics, cdl]);

// Export image to asset.
var filename = 'McLean_County_harmonics';
Export.image.toAsset({
    image: harmonicsPlus,
    description: filename,
    assetId: 'your_asset_path_here/' + filename,
    dimensions: null,
    region: region,
    scale: 30,
    maxPixels: 1e12
});


// Visualize harmonic coefficients on map.
var visImage = ee.Image.cat([
    harmonics.select('3_GCVI_cos').divide(7000).add(0.6),
    harmonics.select('3_GCVI_sin').divide(7000).add(0.5),
    harmonics.select('3_GCVI_constant').divide(7000).subtract(
        0.6)
]);

Map.addLayer(visImage, {
    min: -0.5,
    max: 0.5
}, 'Harmonic coefficient false color');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

