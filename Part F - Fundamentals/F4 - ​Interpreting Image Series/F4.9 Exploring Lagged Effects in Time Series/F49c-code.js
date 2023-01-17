//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.9 Exploring Lagged Effects in Time Series 
//  Checkpoint:   F49c
//  Authors:      Andréa Puzzi Nicolau, Karen Dyson, David Saah, Nicholas Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
    var timeRadians = ee.Image(years.multiply(2 * Math.PI));
    // Return the image with the added bands.
    return imgScaled
        // Add an NDVI band.
        .addBands(imgScaled.normalizedDifference(['SR_B5', 'SR_B4'])
            .rename('NDVI'))
        // Add a time band.
        .addBands(timeRadians.rename('t'))
        .float()
        // Add a constant band.
        .addBands(ee.Image.constant(1));
}

// Import region of interest. Area over California.
var roi = ee.Geometry.Polygon([
    [-119.44617458417066,35.92639730653253],
    [-119.07675930096754,35.92639730653253],
    [-119.07675930096754,36.201704711823844],
    [-119.44617458417066,36.201704711823844],
    [-119.44617458417066,35.92639730653253]
]);

// Import the USGS Landsat 8 Level 2, Collection 2, Tier 1 collection,
// filter, mask clouds, scale, and add variables.
var landsat8sr = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(roi)
    .filterDate('2013-01-01', '2018-01-01')
    .map(maskScaleAndAddVariable);

// Set map center.
Map.centerObject(roi, 10);

// List of the independent variable names.
var independents = ee.List(['constant', 't']);

// Name of the dependent variable.
var dependent = ee.String('NDVI');

// Compute a linear trend.  This will have two bands: 'residuals' and 
// a 2x1 band called coefficients (columns are for dependent variables).
var trend = landsat8sr.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));

// Flatten the coefficients into a 2-band image
var coefficients = trend.select('coefficients')
    // Get rid of extra dimensions and convert back to a regular image
    .arrayProject([0])
    .arrayFlatten([independents]);

// Compute a detrended series.
var detrended = landsat8sr.map(function(image) {
    return image.select(dependent)
        .subtract(image.select(independents).multiply(
                coefficients)
            .reduce('sum'))
        .rename(dependent)
        .copyProperties(image, ['system:time_start']);
});

// Function that creates a lagged collection.
var lag = function(leftCollection, rightCollection, lagDays) {
    var filter = ee.Filter.and(
        ee.Filter.maxDifference({
            difference: 1000 * 60 * 60 * 24 * lagDays,
            leftField: 'system:time_start',
            rightField: 'system:time_start'
        }),
        ee.Filter.greaterThan({
            leftField: 'system:time_start',
            rightField: 'system:time_start'
        }));

    return ee.Join.saveAll({
        matchesKey: 'images',
        measureKey: 'delta_t',
        ordering: 'system:time_start',
        ascending: false, // Sort reverse chronologically
    }).apply({
        primary: leftCollection,
        secondary: rightCollection,
        condition: filter
    });
};

// Create a lagged collection of the detrended imagery.
var lagged17 = lag(detrended, detrended, 17);

// Function to stack bands.
var merge = function(image) {
    // Function to be passed to iterate.
    var merger = function(current, previous) {
        return ee.Image(previous).addBands(current);
    };
    return ee.ImageCollection.fromImages(image.get('images'))
        .iterate(merger, image);
};

// Apply merge function to the lagged collection.
var merged17 = ee.ImageCollection(lagged17.map(merge));

// Function to compute covariance.
var covariance = function(mergedCollection, band, lagBand) {
    return mergedCollection.select([band, lagBand]).map(function(
        image) {
        return image.toArray();
    }).reduce(ee.Reducer.covariance(), 8);
};

// Concatenate the suffix to the NDVI band.
var lagBand = dependent.cat('_1');

// Compute covariance.
var covariance17 = ee.Image(covariance(merged17, dependent, lagBand))
    .clip(roi);

// The output of the covariance reducer is an array image, 
// in which each pixel stores a 2x2 variance-covariance array. 
// The off diagonal elements are covariance, which you can map 
// directly using:
Map.addLayer(covariance17.arrayGet([0, 1]),
    {
        min: 0,
        max: 0.02
    },
    'covariance (lag = 17 days)');

// Define the correlation function.
var correlation = function(vcArrayImage) {
    var covariance = ee.Image(vcArrayImage).arrayGet([0, 1]);
    var sd0 = ee.Image(vcArrayImage).arrayGet([0, 0]).sqrt();
    var sd1 = ee.Image(vcArrayImage).arrayGet([1, 1]).sqrt();
    return covariance.divide(sd0).divide(sd1).rename(
        'correlation');
};

// Apply the correlation function.
var correlation17 = correlation(covariance17).clip(roi);
Map.addLayer(correlation17,
    {
        min: -1,
        max: 1
    },
    'correlation (lag = 17 days)');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

////////////////////// Cross-covariance and Cross-correlation /////////////////////

// Precipitation (covariate)
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Join the t-l (l=1 pentad) precipitation images to the Landsat.
var lag1PrecipNDVI = lag(landsat8sr, chirps, 5);

// Add the precipitation images as bands.
var merged1PrecipNDVI = ee.ImageCollection(lag1PrecipNDVI.map(merge));

// Compute and display cross-covariance.
var cov1PrecipNDVI = covariance(merged1PrecipNDVI, 'NDVI',
    'precipitation').clip(roi);
Map.addLayer(cov1PrecipNDVI.arrayGet([0, 1]), {},
    'NDVI - PRECIP cov (lag = 5)');

// Compute and display cross-correlation.
var corr1PrecipNDVI = correlation(cov1PrecipNDVI).clip(roi);
Map.addLayer(corr1PrecipNDVI, {
    min: -0.5,
    max: 0.5
}, 'NDVI - PRECIP corr (lag = 5)');

// Join the precipitation images from the previous month.
var lag30PrecipNDVI = lag(landsat8sr, chirps, 30);

var sum30PrecipNDVI = ee.ImageCollection(lag30PrecipNDVI.map(function(
    image) {
    var laggedImages = ee.ImageCollection.fromImages(image
        .get('images'));
    return ee.Image(image).addBands(laggedImages.sum()
        .rename('sum'));
}));

// Compute covariance.
var cov30PrecipNDVI = covariance(sum30PrecipNDVI, 'NDVI', 'sum').clip(
    roi);
Map.addLayer(cov1PrecipNDVI.arrayGet([0, 1]), {},
    'NDVI - sum cov (lag = 30)');

// Correlation.
var corr30PrecipNDVI = correlation(cov30PrecipNDVI).clip(roi);
Map.addLayer(corr30PrecipNDVI, {
    min: -0.5,
    max: 0.5
}, 'NDVI - sum corr (lag = 30)');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

////////////////////// Auto-regressive models /////////////////////

var lagged34 = ee.ImageCollection(lag(landsat8sr, landsat8sr, 34));

var merged34 = lagged34.map(merge).map(function(image) {
    return image.set('n', ee.List(image.get('images'))
        .length());
}).filter(ee.Filter.gt('n', 1));

var arIndependents = ee.List(['constant', 'NDVI_1', 'NDVI_2']);

var ar2 = merged34
    .select(arIndependents.add(dependent))
    .reduce(ee.Reducer.linearRegression(arIndependents.length(), 1));

// Turn the array image into a multi-band image of coefficients.
var arCoefficients = ar2.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([arIndependents]);

// Compute fitted values.
var fittedAR = merged34.map(function(image) {
    return image.addBands(
        image.expression(
            'beta0 + beta1 * p1 + beta2 * p2', {
                p1: image.select('NDVI_1'),
                p2: image.select('NDVI_2'),
                beta0: arCoefficients.select('constant'),
                beta1: arCoefficients.select('NDVI_1'),
                beta2: arCoefficients.select('NDVI_2')
            }).rename('fitted'));
});

// Create an Earth Engine point object to print the time series chart.
var pt = ee.Geometry.Point([-119.0955, 35.9909]);

print(ui.Chart.image.series(
        fittedAR.select(['fitted', 'NDVI']), pt, ee.Reducer
    .mean(), 30)
    .setSeriesNames(['NDVI', 'fitted'])
    .setOptions({
        title: 'AR(2) model: original and fitted values',
        lineWidth: 1,
        pointSize: 3,
    }));
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------