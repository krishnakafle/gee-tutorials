//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.0 Interpreting an Image: Regression
//  Checkpoint:   F30c
//  Authors:      K. Dyson, A. Nicolau, D. Saah, N. Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Define a Turin polygon.
var Turin = ee.Geometry.Polygon(
    [
        [
            [7.455553918110218, 45.258245019259036],
            [7.455553918110218, 44.71237367431335],
            [8.573412804828967, 44.71237367431335],
            [8.573412804828967, 45.258245019259036]
        ]
    ], null, false);

// Center on Turin
Map.centerObject(Turin, 9);

var mod44b = ee.ImageCollection('MODIS/006/MOD44B');

/////
// Start Linear Fit
/////

// Put together the dependent variable by filtering the
// ImageCollection to just the 2020 image near Turin and 
// selecting the percent tree cover band.
var percentTree2020 = mod44b
    .filterDate('2020-01-01', '2021-01-01')
    .first()
    .clip(Turin)
    .select('Percent_Tree_Cover');

// You can print information to the console for inspection.
print('2020 Image', percentTree2020);

Map.addLayer(percentTree2020, {
    max: 100
}, 'Percent Tree Cover');

var landsat8_raw = ee.ImageCollection('LANDSAT/LC08/C02/T1_RT');

// Put together the independent variable.
var landsat8filtered = landsat8_raw
    .filterBounds(Turin.centroid({
        'maxError': 1
    }))
    .filterDate('2020-04-01', '2020-4-30')
    .first();

print('Landsat8 filtered', landsat8filtered);

// Display the L8 image.
var visParams = {
    bands: ['B4', 'B3', 'B2'],
    max: 16000
};
Map.addLayer(landsat8filtered, visParams, 'Landsat 8 Image');

// Calculate NDVI which will be the independent variable.
var ndvi = landsat8filtered.normalizedDifference(['B5', 'B4']);

// Create the training image.
var trainingImage = ndvi.addBands(percentTree2020);
print('training image for linear fit', trainingImage);


// Independent variable first, dependent variable second.
// You need to include the scale variable.
var linearFit = trainingImage.reduceRegion({
    reducer: ee.Reducer.linearFit(),
    geometry: Turin,
    scale: 30,
    bestEffort: true
});

// Inspect the results.
print('OLS estimates:', linearFit);
print('y-intercept:', linearFit.get('offset'));
print('Slope:', linearFit.get('scale'));

// Create a prediction based on the linearFit model.
var predictedTree = ndvi.expression(
    'intercept + slope * ndvi', {
        'ndvi': ndvi.select('nd'),
        'intercept': ee.Number(linearFit.get('offset')),
        'slope': ee.Number(linearFit.get('scale'))
    });

print('predictedTree', predictedTree);

// Display the results.
Map.addLayer(predictedTree, {
    max: 100
}, 'Predicted Percent Tree Cover');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

//////
// Start Linear Regression
//////

// Assemble the independent variables.
var predictionBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
    'B10', 'B11'
];

// Create the training image stack for linear regression.
var trainingImageLR = ee.Image(1)
    .addBands(landsat8filtered.select(predictionBands))
    .addBands(percentTree2020);
    
print('Linear Regression training image:', trainingImageLR);

// Compute ordinary least squares regression coefficients using 
// the linearRegression reducer.
var linearRegression = trainingImageLR.reduceRegion({
    reducer: ee.Reducer.linearRegression({
        numX: 10,
        numY: 1
    }),
    geometry: Turin,
    scale: 30,
    bestEffort: true
});

// Inspect the results.
print('Linear regression results:', linearRegression);

// Extract the coefficients as a list.
var coefficients = ee.Array(linearRegression.get('coefficients'))
    .project([0])
    .toList();

print('Coefficients', coefficients);

// Create the predicted tree cover based on linear regression.
var predictedTreeLR = ee.Image(1)
    .addBands(landsat8filtered.select(predictionBands))
    .multiply(ee.Image.constant(coefficients))
    .reduce(ee.Reducer.sum())
    .rename('predictedTreeLR')
    .clip(landsat8filtered.geometry());

Map.addLayer(predictedTreeLR, {
    min: 0,
    max: 100
}, 'LR prediction');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

/////
// Start Non-linear Regression
/////
// Create the training data stack.
var trainingImageCART = ee.Image(landsat8filtered.select(predictionBands))
    .addBands(percentTree2020);

// Sample the training data stack.
var trainingData = trainingImageCART.sample({
    region: Turin,
    scale: 30,
    numPixels: 1500,
    seed: 5
});

// Examine the CART training data.
print('CART training data', trainingData);

// Run the CART regression.
var cartRegression = ee.Classifier.smileCart()
    .setOutputMode('REGRESSION')
    .train({
        features: trainingData,
        classProperty: 'Percent_Tree_Cover',
        inputProperties: predictionBands
    });

// Create a prediction of tree cover based on the CART regression.
var cartRegressionImage = landsat8filtered.select(predictionBands)
    .classify(cartRegression, 'cartRegression');

Map.addLayer(cartRegressionImage, {
    min: 0,
    max: 100
}, 'CART regression');

/////
// Calculating RMSE to assess model performance
/////

// Concatenate percent tree cover image and all predictions.
var concat = ee.Image.cat(percentTree2020,
        predictedTree,
        predictedTreeLR,
        cartRegressionImage)
    .rename([
        'TCpercent',
        'LFprediction',
        'LRprediction',
        'CARTprediction'
    ]);

// Sample pixels
var sample = concat.sample({
    region: Turin,
    scale: 30,
    numPixels: 500,
    seed: 5
});

print('First feature in sample', sample.first());

// First step: This function computes the squared difference between
// the predicted percent tree cover and the known percent tree cover
var calculateDiff = function(feature) {
    var TCpercent = ee.Number(feature.get('TCpercent'));
    var diffLFsq = ee.Number(feature.get('LFprediction'))
        .subtract(TCpercent).pow(2);
    var diffLRsq = ee.Number(feature.get('LRprediction'))
        .subtract(TCpercent).pow(2);
    var diffCARTsq = ee.Number(feature.get('CARTprediction'))
        .subtract(TCpercent).pow(2);

    // Return the feature with the squared difference set to a 'diff' property.
    return feature.set({
        'diffLFsq': diffLFsq,
        'diffLRsq': diffLRsq,
        'diffCARTsq': diffCARTsq
    });
};

// Second step: Calculate RMSE for population of difference pairs.
var rmse = ee.List([ee.Number(
    // Map the difference function over the collection.
    sample.map(calculateDiff)
    // Reduce to get the mean squared difference.
    .reduceColumns({
        reducer: ee.Reducer.mean().repeat(3),
        selectors: ['diffLFsq', 'diffLRsq',
            'diffCARTsq'
        ]
    }).get('mean')
    // Flatten the list of lists.
)]).flatten().map(function(i) {
    // Take the square root of the mean square differences.
    return ee.Number(i).sqrt();
});

// Print the result.
print('RMSE', rmse);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

