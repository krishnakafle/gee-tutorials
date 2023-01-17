//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.6 Fitting Functions to Time Series
//  Checkpoint:   F46b
//  Authors:      Andréa Puzzi Nicolau, Karen Dyson, Biplov Bhandari, David Saah, 
//                Nicholas Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

///////////////////// Sections 1 & 2 /////////////////////////////

// Define function to mask clouds, scale, and add variables 
// (NDVI, time and a constant) to Landsat 8 imagery.
function maskScaleAndAddVariable(image) {
    // Bit 0 - Fill
    // Bit 1 - Dilated Cloud
    // Bit 2 - Cirrus
    // Bit 3 - Cloud
    // Bit 4 - Cloud Shadow
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111',
        2)).eq(0);
    var saturationMask = image.select('QA_RADSAT').eq(0);

    // Apply the scaling factors to the appropriate bands.
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-
        0.2);
    var thermalBands = image.select('ST_B.*').multiply(0.00341802)
        .add(149.0);

    // Replace the original bands with the scaled ones and apply the masks.
    var img = image.addBands(opticalBands, null, true)
        .addBands(thermalBands, null, true)
        .updateMask(qaMask)
        .updateMask(saturationMask);
    var imgScaled = image.addBands(img, null, true);

    // Now we start to add variables of interest.
    // Compute time in fractional years since the epoch.
    var date = ee.Date(image.get('system:time_start'));
    var years = date.difference(ee.Date('1970-01-01'), 'year');
    // Return the image with the added bands.
    return imgScaled
        // Add an NDVI band.
        .addBands(imgScaled.normalizedDifference(['SR_B5', 'SR_B4'])
            .rename('NDVI'))
        // Add a time band.
        .addBands(ee.Image(years).rename('t'))
        .float()
        // Add a constant band.
        .addBands(ee.Image.constant(1));
}

// Import point of interest over California, USA.
var roi = ee.Geometry.Point([-121.059, 37.9242]);

// Import the USGS Landsat 8 Level 2, Collection 2, Tier 1 image collection),
// filter, mask clouds, scale, and add variables.
var landsat8sr = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)
    .filterDate('2013-01-01', '2018-01-01')
    .map(maskScaleAndAddVariable);

// Set map center over the ROI.
Map.centerObject(roi, 6);

// Plot a time series of NDVI at a single location.
var landsat8Chart = ui.Chart.image.series(landsat8sr.select('NDVI'), roi)
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Landsat 8 NDVI time series at ROI',
        lineWidth: 1,
        pointSize: 3,
    });
print(landsat8Chart);

// Plot a time series of NDVI with a linear trend line
// at a single location.
var landsat8ChartTL = ui.Chart.image.series(landsat8sr.select('NDVI'), roi)
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Landsat 8 NDVI time series at ROI',
        trendlines: {
            0: {
                color: 'CC0000'
            }
        },
        lineWidth: 1,
        pointSize: 3,
    });
print(landsat8ChartTL);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

///////////////////// Section 3 /////////////////////////////

// List of the independent variable names
var independents = ee.List(['constant', 't']);

// Name of the dependent variable.
var dependent = ee.String('NDVI');

// Compute a linear trend.  This will have two bands: 'residuals' and 
// a 2x1 (Array Image) band called 'coefficients'.
// (Columns are for dependent variables)
var trend = landsat8sr.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));
Map.addLayer(trend, {}, 'trend array image');

// Flatten the coefficients into a 2-band image.
var coefficients = trend.select('coefficients')
    // Get rid of extra dimensions and convert back to a regular image
    .arrayProject([0])
    .arrayFlatten([independents]);
Map.addLayer(coefficients, {}, 'coefficients image');

// Compute a detrended series.
var detrended = landsat8sr.map(function(image) {
    return image.select(dependent).subtract(
            image.select(independents).multiply(coefficients)
            .reduce('sum'))
        .rename(dependent)
        .copyProperties(image, ['system:time_start']);
});

// Plot the detrended results.
var detrendedChart = ui.Chart.image.series(detrended, roi, null, 30)
    .setOptions({
        title: 'Detrended Landsat time series at ROI',
        lineWidth: 1,
        pointSize: 3,
        trendlines: {
            0: {
                color: 'CC0000'
            }
        },
    });
print(detrendedChart);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

