//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      Chapter A3.10 Conservation II - Assessing Agricultural 
//                Intensification Near Protected Areas
//  Checkpoint:   A310b
//  Authors:      Pradeep Koulgi, MD Madhusudan
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// 1. Parameters to function calls

// 1.1. Annual dry season max NDVI calculation
var modis_veg = ee.ImageCollection('MODIS/006/MOD13Q1');
var ndviBandName = 'NDVI';
var ndviValuesScaling = 0.0001;
var modisVegScale = 250; // meters
var maxNDVIBandname = 'max_dryseason_ndvi';
var yearTimestampBandname = 'year';
var years = ee.List.sequence(2000, 2021, 1);
var drySeasonStart_doy = 1;
var drySeasonEnd_doy = 90;

// 1.2. Boundaries of Protected Areas of interest
var paBoundaries = ee.FeatureCollection(
    'projects/gee-book/assets/A3-10/IndiaMainlandPAs');
var boundaryBufferWidth = 5000; // meters
var bufferingMaxError = 30; // meters
// Choose PAs in only the western states
var western_states = [
    'Rajasthan', 'Gujarat', 'Madhya Pradesh',
    'Maharashtra', 'Goa', 'Karnataka', 'Kerala'
];
var western_pas = paBoundaries
    .filter(ee.Filter.inList('STATE', western_states));

// 1.3. Regression analysis
var regressionReducer = ee.Reducer.sensSlope();
var regressionX = yearTimestampBandname;
var regressionY = maxNDVIBandname;

// 1.4. Surface water layer to mask water pixels from assessment
// Selects pixels where water has ever been detected between 1984 and 2021
var surfaceWaterExtent = ee.Image('JRC/GSW1_3/GlobalSurfaceWater')
    .select('max_extent');

// 1.5. Average annual precipitation layer     
var rainfall = ee.Image('WORLDCLIM/V1/BIO').select('bio12');

// 1.6. Visualization parameters
var regressionResultVisParams = {
    min: -3,
    max: 3,
    palette: ['ff8202', 'ffffff', '356e02']
};
var regressionSummaryChartingOptions = {
    title: 'Yearly change in dry-season vegetation greenness ' +
        'in PA buffers in relation to average annual rainfall',
    hAxis: {
        title: 'Annual Precipitation'
    },
    vAxis: {
        title: 'Median % yearly change in vegetation greenness ' +
            'in 5 km buffer'
    },
    series: {
        0: {
            visibleInLegend: false
        }
    },
};

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// 2. Raster processing for change analysis

// Defining functions to be used in this script	

// 2.1. Annual dry season maxima of NDVI	

function annualDrySeasonMaximumNDVIAndTime(y) {
    // Convert year y to a date object
    var yDate = ee.Date.fromYMD(y, 1, 1);
    // Calculate max NDVI for year y
    var yMaxNdvi = drySeasonNdviColl
        // Filter to year y
        .filter(ee.Filter.date(yDate, yDate.advance(1, 'year')))
        // Compute max value
        .max()
        // Apply appropriate scale, as per the dataset's 
        // technical description for NDVI band.
        .multiply(ndviValuesScaling)
        // rename the band to be more comprehensible
        .rename(maxNDVIBandname);
    // Create an image with constant value y, to be used in regression. Name it something comprehensible.
    // Name it something comprehensible.
    var yTime = ee.Image.constant(y).int().rename(
        yearTimestampBandname);
    // Combine the two images into a single 2-band image, and return
    return ee.Image.cat([yMaxNdvi, yTime]).set('year', y);
}

// Create a collection of annual dry season maxima 
// for the years of interest.  Select the NDVI band and 
// filter to the collection of dry season observations.
var drySeasonNdviColl = modis_veg.select([ndviBandName])
    .filter(ee.Filter.calendarRange(drySeasonStart_doy,
        drySeasonEnd_doy, 'day_of_year'));
// For each year of interest, calculate the NDVI maxima and create a corresponding time band
var dryseason_coll = ee.ImageCollection.fromImages(
    years.map(annualDrySeasonMaximumNDVIAndTime)
);

// 2.2. Annual regression to estimate average yearly change in greenness

var ss = dryseason_coll.select([regressionX, regressionY]).reduce(
    regressionReducer);

// Mask surface water from vegetation change image
var ss = ss.updateMask(surfaceWaterExtent.eq(0));

// 2.3. Summarise estimates of change in buffer regions of PAs of interest
function extractBufferRegion(pa) {
    //reduce vertices in PA boundary
    pa = pa.simplify({
        maxError: 100
    });
    // Extend boundary into its buffer
    var withBuffer = pa.buffer(boundaryBufferWidth,
        bufferingMaxError);
    // Compute the buffer-only region by "subtracting" boundary with buffer from boundary
    // Subtracting the whole set of boundaries eliminates inclusion of forests from adjacent PAs into buffers.
    var bufferOnly = withBuffer.difference(paBoundaries.geometry());

    return bufferOnly;
}

// Create buffer regions of PAs
var pa_buff = western_pas.map(extractBufferRegion);

// Normalize the metric of NDVI change to a baseline (dry-season max NDVI in the very first year)
var baselineNdvi = dryseason_coll.select([maxNDVIBandname]).filter(ee
    .Filter.eq('year', years.getNumber(0))).first();
var stats = ss.select('slope').divide(baselineNdvi).multiply(100)
    .rename('vegchange');

// Combine it with average annual rainfall data
stats = stats.addBands(rainfall.rename('rainfall'));

// Calculate mean of change metric over buffer regions of each PA of interest
var paBufferwiseMedianChange = stats.reduceRegions({
    collection: pa_buff,
    reducer: ee.Reducer.median(),
    scale: 1000,
    tileScale: 16
});

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
