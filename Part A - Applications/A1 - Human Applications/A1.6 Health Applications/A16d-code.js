//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.6 Health Applications
//  Checkpoint:   A16d
//  Author:       Dawn Nekorchuk
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Section 1: Data Import
var woredas = ee.FeatureCollection(
    'projects/gee-book/assets/A1-6/amhara_woreda_20170207');
// Create region outer boundary to filter products on.
var amhara = woredas.geometry().bounds();
var gpm = ee.ImageCollection('NASA/GPM_L3/IMERG_V06');
var LSTTerra8 = ee.ImageCollection('MODIS/061/MOD11A2')
    // Due to MCST outage, only use dates after this for this script.
    .filterDate('2001-06-26', Date.now());
var brdfReflect = ee.ImageCollection('MODIS/006/MCD43A4');
var brdfQa = ee.ImageCollection('MODIS/006/MCD43A2');

// Visualize woredas with black borders and no fill.
// Create an empty image into which to paint the features, cast to byte.
var empty = ee.Image().byte();
// Paint all the polygon edges with the same number and width.
var outline = empty.paint({
    featureCollection: woredas,
    color: 1,
    width: 1
});
// Add woreda boundaries to the map.
Map.setCenter(38, 11.5, 7);
Map.addLayer(outline, {
    palette: '000000'
}, 'Woredas');

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------

// Section 2: Handling of dates

// 2.1 Requested start and end dates.
var reqStartDate = ee.Date('2021-10-01');
var reqEndDate = ee.Date('2021-11-30');

// 2.2 LST Dates
// LST MODIS is every 8 days, and a user-requested date will likely not match.
// We want to get the latest previous image date,
//  i.e. the date the closest, but prior to, the requested date. 
// We will filter later. 
// Get date of first image.
var LSTEarliestDate = LSTTerra8.first().date();
// Filter collection to dates from beginning to requested start date. 
var priorLstImgCol = LSTTerra8.filterDate(LSTEarliestDate,
    reqStartDate);
// Get the latest (max) date of this collection of earlier images.
var LSTPrevMax = priorLstImgCol.reduceColumns({
    reducer: ee.Reducer.max(),
    selectors: ['system:time_start']
});
var LSTStartDate = ee.Date(LSTPrevMax.get('max'));
print('LSTStartDate', LSTStartDate);

// 2.3 Last available data dates
// Different variables have different data lags. 
// Data may not be available in user range.
// To prevent errors from stopping script, 
//  grab last available (if relevant) & filter at end.

// 2.3.1 Precipitation 
// Calculate date of most recent measurement for gpm (of all time).
var gpmAllMax = gpm.reduceColumns(ee.Reducer.max(), [
    'system:time_start'
]);
var gpmAllEndDateTime = ee.Date(gpmAllMax.get('max'));
// GPM every 30 minutes, so get just date part.
var gpmAllEndDate = ee.Date.fromYMD({
    year: gpmAllEndDateTime.get('year'),
    month: gpmAllEndDateTime.get('month'),
    day: gpmAllEndDateTime.get('day')
});

// If data ends before requested start, take last data date,
// otherwise use requested date.
var precipStartDate = ee.Date(gpmAllEndDate.millis()
    .min(reqStartDate.millis()));
print('precipStartDate', precipStartDate);

// 2.3.2 BRDF 
// Calculate date of most recent measurement for brdf (of all time).
var brdfAllMax = brdfReflect.reduceColumns({
    reducer: ee.Reducer.max(),
    selectors: ['system:time_start']
});
var brdfAllEndDate = ee.Date(brdfAllMax.get('max'));
// If data ends before requested start, take last data date,
// otherwise use the requested date. 
var brdfStartDate = ee.Date(brdfAllEndDate.millis()
    .min(reqStartDate.millis()));
print('brdfStartDate', brdfStartDate);
print('brdfEndDate', brdfAllEndDate);

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------

// Section 3: Precipitation

// Section 3.1: Precipitation filtering and dates

// Filter gpm by date, using modified start if necessary.
var gpmFiltered = gpm
    .filterDate(precipStartDate, reqEndDate.advance(1, 'day'))
    .filterBounds(amhara)
    .select('precipitationCal');

// Calculate date of most recent measurement for gpm 
// (in the modified requested window).
var gpmMax = gpmFiltered.reduceColumns({
    reducer: ee.Reducer.max(),
    selectors: ['system:time_start']
});
var gpmEndDate = ee.Date(gpmMax.get('max'));
var precipEndDate = gpmEndDate;
print('precipEndDate ', precipEndDate);

// Create a list of dates for the precipitation time series.
var precipDays = precipEndDate.difference(precipStartDate, 'day');
var precipDatesPrep = ee.List.sequence(0, precipDays, 1);

function makePrecipDates(n) {
    return precipStartDate.advance(n, 'day');
}
var precipDates = precipDatesPrep.map(makePrecipDates);

// Section 3.2: Calculate daily precipitation

// Function to calculate daily precipitation:
function calcDailyPrecip(curdate) {
    curdate = ee.Date(curdate);
    var curyear = curdate.get('year');
    var curdoy = curdate.getRelative('day', 'year').add(1);
    var totprec = gpmFiltered
        .filterDate(curdate, curdate.advance(1, 'day'))
        .select('precipitationCal')
        .sum()
        //every half-hour
        .multiply(0.5)
        .rename('totprec');

    return totprec
        .set('doy', curdoy)
        .set('year', curyear)
        .set('system:time_start', curdate);
}
// Map function over list of dates.
var dailyPrecipExtended =
    ee.ImageCollection.fromImages(precipDates.map(calcDailyPrecip));

// Filter back to the original user requested start date.
var dailyPrecip = dailyPrecipExtended
    .filterDate(reqStartDate, precipEndDate.advance(1, 'day'));

// Section 3.3: Summarize daily precipitation by woreda

// Filter precip data for zonal summaries.
var precipSummary = dailyPrecip
    .filterDate(reqStartDate, reqEndDate.advance(1, 'day'));

// Function to calculate zonal statistics for precipitation by woreda.
function sumZonalPrecip(image) {
    // To get the doy and year, 
    // convert the metadata to grids and then summarize.
    var image2 = image.addBands([
        image.metadata('doy').int(),
        image.metadata('year').int()
    ]);
    // Reduce by regions to get zonal means for each county.
    var output = image2.select(['year', 'doy', 'totprec'])
        .reduceRegions({
            collection: woredas,
            reducer: ee.Reducer.mean(),
            scale: 1000
        });
    return output;
}
// Map the zonal statistics function over the filtered precip data.
var precipWoreda = precipSummary.map(sumZonalPrecip);
// Flatten the results for export.
var precipFlat = precipWoreda.flatten();

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------

// Section 4: Land surface temperature

// Section 4.1: Calculate LST variables

// Filter Terra LST by altered LST start date.
// Rarely, but at the end of the year if the last image is late in the year
//  with only a few days in its period, it will sometimes not grab 
//  the next image. Add extra padding to reqEndDate and
//  it will be trimmed at the end.
var LSTFiltered = LSTTerra8
    .filterDate(LSTStartDate, reqEndDate.advance(8, 'day'))
    .filterBounds(amhara)
    .select('LST_Day_1km', 'QC_Day', 'LST_Night_1km', 'QC_Night');

// Filter Terra LST by QA information.
function filterLstQa(image) {
    var qaday = image.select(['QC_Day']);
    var qanight = image.select(['QC_Night']);
    var dayshift = qaday.rightShift(6);
    var nightshift = qanight.rightShift(6);
    var daymask = dayshift.lte(2);
    var nightmask = nightshift.lte(2);
    var outimage = ee.Image(image.select(['LST_Day_1km',
        'LST_Night_1km'
    ]));
    var outmask = ee.Image([daymask, nightmask]);
    return outimage.updateMask(outmask);
}
var LSTFilteredQa = LSTFiltered.map(filterLstQa);

// Rescale temperature data and convert to degrees Celsius (C).
function rescaleLst(image) {
    var LST_day = image.select('LST_Day_1km')
        .multiply(0.02)
        .subtract(273.15)
        .rename('LST_day');
    var LST_night = image.select('LST_Night_1km')
        .multiply(0.02)
        .subtract(273.15)
        .rename('LST_night');
    var LST_mean = image.expression(
        '(day + night) / 2', {
            'day': LST_day.select('LST_day'),
            'night': LST_night.select('LST_night')
        }
    ).rename('LST_mean');
    return image.addBands(LST_day)
        .addBands(LST_night)
        .addBands(LST_mean);
}
var LSTVars = LSTFilteredQa.map(rescaleLst);

// Section 4.2: Calculate daily LST

// Create list of dates for time series.
var LSTRange = LSTVars.reduceColumns({
    reducer: ee.Reducer.max(),
    selectors: ['system:time_start']
});
var LSTEndDate = ee.Date(LSTRange.get('max')).advance(7, 'day');
var LSTDays = LSTEndDate.difference(LSTStartDate, 'day');
var LSTDatesPrep = ee.List.sequence(0, LSTDays, 1);

function makeLstDates(n) {
    return LSTStartDate.advance(n, 'day');
}
var LSTDates = LSTDatesPrep.map(makeLstDates);

// Function to calculate daily LST by assigning the 8-day composite summary 
// to each day in the composite period:
function calcDailyLst(curdate) {
    var curyear = ee.Date(curdate).get('year');
    var curdoy = ee.Date(curdate).getRelative('day', 'year').add(1);
    var moddoy = curdoy.divide(8).ceil().subtract(1).multiply(8).add(
        1);
    var basedate = ee.Date.fromYMD(curyear, 1, 1);
    var moddate = basedate.advance(moddoy.subtract(1), 'day');
    var LST_day = LSTVars
        .select('LST_day')
        .filterDate(moddate, moddate.advance(1, 'day'))
        .first()
        .rename('LST_day');
    var LST_night = LSTVars
        .select('LST_night')
        .filterDate(moddate, moddate.advance(1, 'day'))
        .first()
        .rename('LST_night');
    var LST_mean = LSTVars
        .select('LST_mean')
        .filterDate(moddate, moddate.advance(1, 'day'))
        .first()
        .rename('LST_mean');
    return LST_day
        .addBands(LST_night)
        .addBands(LST_mean)
        .set('doy', curdoy)
        .set('year', curyear)
        .set('system:time_start', curdate);
}
// Map the function over the image collection
var dailyLstExtended =
    ee.ImageCollection.fromImages(LSTDates.map(calcDailyLst));

// Filter back to original user requested start date
var dailyLst = dailyLstExtended
    .filterDate(reqStartDate, LSTEndDate.advance(1, 'day'));

// Section 4.3: Summarize daily LST by woreda

// Filter LST data for zonal summaries. 
var LSTSummary = dailyLst
    .filterDate(reqStartDate, reqEndDate.advance(1, 'day'));
// Function to calculate zonal statistics for LST by woreda:
function sumZonalLst(image) {
    // To get the doy and year, we convert the metadata to grids 
    //  and then summarize. 
    var image2 = image.addBands([
        image.metadata('doy').int(),
        image.metadata('year').int()
    ]);
    // Reduce by regions to get zonal means for each county.
    var output = image2
        .select(['doy', 'year', 'LST_day', 'LST_night', 'LST_mean'])
        .reduceRegions({
            collection: woredas,
            reducer: ee.Reducer.mean(),
            scale: 1000
        });
    return output;
}
// Map the zonal statistics function over the filtered LST data.
var LSTWoreda = LSTSummary.map(sumZonalLst);
// Flatten the results for export.
var LSTFlat = LSTWoreda.flatten();

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------