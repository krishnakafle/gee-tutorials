//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      Chapter A3.10 Conservation II - Assessing Agricultural 
//                Intensification Near Protected Areas
//  Checkpoint:   A310a
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
