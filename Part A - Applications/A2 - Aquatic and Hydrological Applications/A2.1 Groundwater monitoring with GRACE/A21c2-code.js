//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.1 Groundwater Monitoring with GRACE
//  Checkpoint:   A21c
//  Authors:      A.J. Purdy, J.S. Famiglietti
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import Basins
var basins = ee.FeatureCollection('USGS/WBD/2017/HUC04');

// Extract the 3 HUC 04 basins for the Central Valley.
var codes = ['1802', '1803', '1804'];
var basin = basins.filter(ee.Filter.inList('huc4', codes));

// Add the basin to the map to show the extent of our analysis.
Map.centerObject(basin, 6);
Map.addLayer(basin, {
    color: 'green'
}, 'Central Valley Basins', true, 0.5);

// This table was generated using the index from the CDEC website
var res = ee.FeatureCollection(
    'projects/gee-book/assets/A2-1/ca_reservoirs_index');
// Filter reservoir locations by the Central Valley geometry
var res_cv = res.filterBounds(basin);
Map.addLayer(res_cv, {
    'color': 'blue'
}, 'Reservoirs');

// Import GRACE groundwater.
var GRACE = ee.ImageCollection('NASA/GRACE/MASS_GRIDS/MASCON_CRI');
// Get Liquid Water Equivalent thickness.
var basinTWSa = GRACE.select('lwe_thickness');

// Make plot of TWSa for Basin Boundary
var TWSaChart = ui.Chart.image.series({
        imageCollection: basinTWSa.filter(ee.Filter.date(
            '2003-01-01', '2016-12-31')),
        region: basin,
        reducer: ee.Reducer.mean(),
    })
    .setOptions({
        title: 'TWSa',
        hAxis: {
            format: 'MM-yyyy'
        },
        vAxis: {
            title: 'TWSa (cm)'
        },
        lineWidth: 1,
    });
print(TWSaChart);

// Set start and end years to annualize the data.
var yrStart = 2003;
var yrEnd = 2016;
var years = ee.List.sequence(yrStart, yrEnd);
var GRACE_yr = ee.ImageCollection.fromImages(years.map(function(y) {
    var date = ee.Date.fromYMD(y, 1, 1);
    return basinTWSa.filter(ee.Filter.calendarRange(y, y,
            'year'))
        .mean()
        .set('system:time_start', date)
        .rename('TWSa');
}).flatten());

// Make plot of annualized TWSa for Basin Boundary.
var TWSaChart = ui.Chart.image.series({
        imageCollection: GRACE_yr.filter(ee.Filter.date(
            '2003-01-01', '2016-12-31')),
        region: basin,
        reducer: ee.Reducer.mean(),
        scale: 25000
    }).setChartType('ScatterChart')
    .setOptions({
        title: 'Annualized Total Water Storage anomalies',
        trendlines: {
            0: {
                color: 'CC0000'
            }
        },
        hAxis: {
            format: 'MM-yyyy'
        },
        vAxis: {
            title: 'TWSa (cm)'
        },
        lineWidth: 2,
        pointSize: 2
    });
print(TWSaChart);

// Compute Trend for each pixel to map regions of most change.

var addVariables = function(image) {
    // Compute time in fractional years.
    var date = ee.Date(image.get('system:time_start'));
    var years = date.difference(ee.Date('2003-01-01'), 'year');
    // Return the image with the added bands.
    return image
        // Add a time band.
        .addBands(ee.Image(years).rename('t').float())
        // Add a constant band.
        .addBands(ee.Image.constant(1));
};

var cvTWSa = GRACE_yr.filterBounds(basin).map(addVariables);
print(cvTWSa);

// List of the independent variable names
var independents = ee.List(['constant', 't']);

// Name of the dependent variable.
var dependent = ee.String('TWSa');

// Compute a linear trend.  This will have two bands: 'residuals' and 
// a 2x1 band called coefficients (columns are for dependent variables).
var trend = cvTWSa.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));

// Flatten the coefficients into a 2-band image.
var coefficients = trend.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([independents]);

// Create a layer of the TWSa slope to add to the map.
var slope = coefficients.select('t');
// Set visualization parameters to represent positive (blue) 
// & negative (red) trends.
var slopeParams = {
    min: -3.5,
    max: 3.5,
    palette: ['red', 'white', 'blue']
};
Map.addLayer(slope.clip(basin), slopeParams, 'TWSa Annualized Trend', true,
    0.75);

// -----------------------------------------------------------------------
// Paste the code from section 3.1 below
// -----------------------------------------------------------------------