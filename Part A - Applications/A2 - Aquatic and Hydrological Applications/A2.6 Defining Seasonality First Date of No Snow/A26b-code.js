//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.6 Defining Seasonality: First Date of No Snow
//  Checkpoint:   A26b
//  Authors:      Amanda Armstrong, Morgan Tassone, Justin Braaten
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var startDoy = 1;
var startYear = 2000;
var endYear = 2019;

var startDate;
var startYear;

function addDateBands(img) {
    // Get image date.
    var date = img.date();
    // Get calendar day-of-year.
    var calDoy = date.getRelative('day', 'year');
    // Get relative day-of-year; enumerate from user-defined startDoy.
    var relDoy = date.difference(startDate, 'day');
    // Get the date as milliseconds from Unix epoch.
    var millis = date.millis();
    // Add all of the above date info as bands to the snow fraction image.
    var dateBands = ee.Image.constant([calDoy, relDoy, millis,
            startYear
        ])
        .rename(['calDoy', 'relDoy', 'millis', 'year']);
    // Cast bands to correct data type before returning the image.
    return img.addBands(dateBands)
        .cast({
            'calDoy': 'int',
            'relDoy': 'int',
            'millis': 'long',
            'year': 'int'
        })
        .set('millis', millis);
}

var waterMask = ee.Image('MODIS/MOD44W/MOD44W_005_2000_02_24')
    .select('water_mask')
    .not();

var completeCol = ee.ImageCollection('MODIS/006/MOD10A1')
    .select('NDSI_Snow_Cover');

// Pixels must have been 10% snow covered for at least 2 weeks in 2018.
var snowCoverEphem = completeCol.filterDate('2018-01-01',
        '2019-01-01')
    .map(function(img) {
        return img.gte(10);
    })
    .sum()
    .gte(14);

// Pixels must not be 10% snow covered more than 124 days in 2018.
var snowCoverConst = completeCol.filterDate('2018-01-01',
        '2019-01-01')
    .map(function(img) {
        return img.gte(10);
    })
    .sum()
    .lte(124);

var analysisMask = waterMask.multiply(snowCoverEphem).multiply(
    snowCoverConst);

var years = ee.List.sequence(startYear, endYear);

var annualList = years.map(function(year) {
    // Set the global startYear variable as the year being worked on so that
    // it will be accessible to the addDateBands mapped to the collection below.
    startYear = year;
    // Get the first day-of-year for this year as an ee.Date object.
    var firstDoy = ee.Date.fromYMD(year, 1, 1);
    // Advance from the firstDoy to the user-defined startDay; subtract 1 since
    // firstDoy is already 1. Set the result as the global startDate variable so
    // that it is accessible to the addDateBands mapped to the collection below.
    startDate = firstDoy.advance(startDoy - 1, 'day');
    // Get endDate for this year by advancing 1 year from startDate.
    // Need to advance an extra day because end date of filterDate() function
    // is exclusive.
    var endDate = startDate.advance(1, 'year').advance(1,
        'day');
    // Filter the complete collection by the start and end dates just defined.
    var yearCol = completeCol.filterDate(startDate, endDate);
    // Construct an image where pixels represent the first day within the date
    // range that the lowest snow fraction is observed.
    var noSnowImg = yearCol
        // Add date bands to all images in this particular collection.
        .map(addDateBands)
        // Sort the images by ascending time to identify the first day without
        // snow. Alternatively, you can use .sort('millis', false) to
        // reverse sort (find first day of snow in the fall).
        .sort('millis')
        // Make a mosaic composed of pixels from images that represent the
        // observation with the minimum percent snow cover (defined by Çthe
        // NDSI_Snow_Cover band); include all associated bands for the selected
        // image.
        .reduce(ee.Reducer.min(5))
        // Rename the bands - band names were altered by previous operation.
        .rename(['snowCover', 'calDoy', 'relDoy', 'millis',
            'year'
        ])
        // Apply the mask.
        .updateMask(analysisMask)
        // Set the year as a property for filtering by later.
        .set('year', year);

    // Mask by minimum snow fraction - only include pixels that reach 0
    // percent cover. Return the resulting image.
    return noSnowImg.updateMask(noSnowImg.select('snowCover')
        .eq(0));
});

var annualCol = ee.ImageCollection.fromImages(annualList);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Define a year to visualize.
var thisYear = 2018;

// Define visualization arguments.
var visArgs = {
    bands: ['calDoy'],
    min: 150,
    max: 200,
    palette: [
        '0D0887', '5B02A3', '9A179B', 'CB4678', 'EB7852',
        'FBB32F', 'F0F921'
    ]
};

// Subset the year of interest.
var firstDayNoSnowYear = annualCol.filter(ee.Filter.eq('year',
    thisYear)).first();

// Display it on the map.
Map.setCenter(-95.78, 59.451, 5);
Map.addLayer(firstDayNoSnowYear, visArgs,
    'First day of no snow, 2018');

// Define the years to difference.
var firstYear = 2005;
var secondYear = 2015;

// Calculate difference image.
var firstImg = annualCol.filter(ee.Filter.eq('year', firstYear))
    .first().select('calDoy');
var secondImg = annualCol.filter(ee.Filter.eq('year', secondYear))
    .first().select('calDoy');
var dif = secondImg.subtract(firstImg);

// Define visualization arguments.
var visArgs = {
    min: -15,
    max: 15,
    palette: ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7', 'd1e5f0',
        '67a9cf', '2166ac'
    ]
};

// Display it on the map.
Map.setCenter(95.427, 29.552, 8);
Map.addLayer(dif, visArgs, '2015-2005 first day no snow dif');

// Calculate slope image.
var slope = annualCol.sort('year').select(['year', 'calDoy'])
    .reduce(ee.Reducer.linearFit()).select('scale');

// Define visualization arguments.
var visArgs = {
    min: -1,
    max: 1,
    palette: ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7',
        'd1e5f0', '67a9cf', '2166ac'
    ]
};

// Display it on the map.
Map.setCenter(11.25, 59.88, 6);
Map.addLayer(slope, visArgs, '2000-2019 first day no snow slope');

// Define an AOI.
var aoi = ee.Geometry.Point(-94.242, 65.79).buffer(1e4);
Map.addLayer(aoi, null, 'Area of interest');

// Calculate annual mean DOY of AOI.
var annualAoiMean = annualCol.select('calDoy').map(function(img) {
    var summary = img.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: aoi,
        scale: 1e3,
        bestEffort: true,
        maxPixels: 1e14,
        tileScale: 4,
    });
    return ee.Feature(null, summary).set('year', img.get(
        'year'));
});

// Print chart to console.
var chart = ui.Chart.feature.byFeature(annualAoiMean, 'year',
        'calDoy')
    .setOptions({
        title: 'Regional mean first day of year with no snow cover',
        legend: {
            position: 'none'
        },
        hAxis: {
            title: 'Year',
            format: '####'
        },
        vAxis: {
            title: 'Day-of-year'
        }
    });
print(chart);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
