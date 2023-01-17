//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.1 Advanced Pixel-Based Image Transformations
//  Checkpoint:   F31a
//  Authors:      Karen, Andrea, Nick, and David
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import and filter imagery by location and date.
var sfoPoint = ee.Geometry.Point(-122.3774, 37.6194);

var sfoImage = ee.ImageCollection('COPERNICUS/S2')
    .filterBounds(sfoPoint)
    .filterDate('2020-02-01', '2020-04-01')
    .first();
Map.centerObject(sfoImage, 11);

// Calculate EVI using Sentinel 2

// Extract the bands and divide by 10,000 to account for scaling done.
var nirScaled = sfoImage.select('B8').divide(10000);
var redScaled = sfoImage.select('B4').divide(10000);
var blueScaled = sfoImage.select('B2').divide(10000);

// Calculate the numerator, note that order goes from left to right.
var numeratorEVI = (nirScaled.subtract(redScaled)).multiply(2.5);

// Calculate the denominator.
var denomClause1 = redScaled.multiply(6);
var denomClause2 = blueScaled.multiply(7.5);
var denominatorEVI = nirScaled.add(denomClause1)
    .subtract(denomClause2).add(1);

// Calculate EVI and name it.
var EVI = numeratorEVI.divide(denominatorEVI).rename('EVI');

// And now map EVI using our vegetation palette.
var vegPalette = ['red', 'white', 'green'];
var visParams = {min: -1, max: 1, palette: vegPalette};
	Map.addLayer(EVI, visParams, 'EVI');

// Calculate EVI.
var eviExpression = sfoImage.expression({
    expression: '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    map: { // Map between variables in the expression and images.
        'NIR': sfoImage.select('B8').divide(10000),
        'RED': sfoImage.select('B4').divide(10000),
        'BLUE': sfoImage.select('B2').divide(10000)
    }
});

// And now map EVI using our vegetation palette.
Map.addLayer(eviExpression, visParams, 'EVI Expression');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
