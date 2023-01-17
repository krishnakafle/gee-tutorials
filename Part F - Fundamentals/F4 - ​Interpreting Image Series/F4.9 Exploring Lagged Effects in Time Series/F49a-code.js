//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.9 Exploring Lagged Effects in Time Series 
//  Checkpoint:   F49a
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
