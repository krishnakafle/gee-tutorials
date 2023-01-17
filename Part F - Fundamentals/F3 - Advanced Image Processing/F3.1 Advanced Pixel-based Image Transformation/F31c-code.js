//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.1 Advanced Pixel-Based Image Transformations
//  Checkpoint:   F31c
//  Authors:      Karen, Andrea, Nick, and David
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/////
// Manipulating images with matrices
/////

// Begin Tasseled Cap example.
var landsat5RT = ee.Array([
    [0.3037, 0.2793, 0.4743, 0.5585, 0.5082, 0.1863],
    [-0.2848, -0.2435, -0.5436, 0.7243, 0.0840, -0.1800],
    [0.1509, 0.1973, 0.3279, 0.3406, -0.7112, -0.4572],
    [-0.8242, 0.0849, 0.4392, -0.0580, 0.2012, -0.2768],
    [-0.3280, 0.0549, 0.1075, 0.1855, -0.4357, 0.8085],
    [0.1084, -0.9022, 0.4120, 0.0573, -0.0251, 0.0238]
]);

print('RT for Landsat 5', landsat5RT);

// Define a point of interest in Odessa, Washington, USA.
var point = ee.Geometry.Point([-118.7436019417829,
47.18135755009023]);
Map.centerObject(point, 10);

// Filter to get a cloud free image to use for the TC.
var imageL5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_TOA')
    .filterBounds(point)
    .filterDate('2008-06-01', '2008-09-01')
    .sort('CLOUD_COVER')
    .first();

//Display the true-color image.
var trueColor = {
    bands: ['B3', 'B2', 'B1'],
    min: 0,
    max: 0.3
};
Map.addLayer(imageL5, trueColor, 'L5 true color');

var bands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B7'];

// Make an Array Image, with a one dimensional array per pixel.
// This is essentially a list of values of length 6, 
// one from each band in variable 'bands.'
var arrayImage1D = imageL5.select(bands).toArray();

// Make an Array Image with a two dimensional array per pixel,
// of dimensions 6x1. This is essentially a one column matrix with
// six rows, with one value from each band in 'bands.' 
// This step is needed for matrix multiplication (p0).
var arrayImage2D = arrayImage1D.toArray(1);

//Multiply RT by p0.
var tasselCapImage = ee.Image(landsat5RT)
    // Multiply the tasseled cap coefficients by the array 
    // made from the 6 bands for each pixel.
    .matrixMultiply(arrayImage2D)
    // Get rid of the extra dimensions. 
    .arrayProject([0])
    // Get a multi-band image with TC-named bands.
    .arrayFlatten(
        [
            ['brightness', 'greenness', 'wetness', 'fourth', 'fifth',
                'sixth'
            ]
        ]);

var vizParams = {
    bands: ['brightness', 'greenness', 'wetness'],
    min: -0.1,
    max: [0.5, 0.1, 0.1]
};
Map.addLayer(tasselCapImage, vizParams, 'TC components');

// Begin PCA example.

// Select and map a true-color L8 image.
var imageL8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(point)
    .filterDate('2018-06-01', '2018-09-01')
    .sort('CLOUD_COVER')
    .first();

var trueColorL8 = {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 0.3
};
Map.addLayer(imageL8, trueColorL8, 'L8 true color');

// Select which bands to use for the PCA.
var PCAbands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11'];

// Convert the Landsat 8 image to a 2D array for the later matrix 
// computations.
var arrayImage = imageL8.select(PCAbands).toArray();

// Calculate the covariance using the reduceRegion method.
var covar = arrayImage.reduceRegion({
    reducer: ee.Reducer.covariance(),
    maxPixels: 1e9
});

// Extract the covariance matrix and store it as an array.
var covarArray = ee.Array(covar.get('array'));

//Compute and extract the eigenvectors
var eigens = covarArray.eigen();
var eigenVectors = eigens.slice(1, 1);

// Perform matrix multiplication
var principalComponents = ee.Image(eigenVectors)
    .matrixMultiply(arrayImage.toArray(1));

var pcImage = principalComponents
    // Throw out an unneeded dimension, [[]] -> [].
    .arrayProject([0])
    // Make the one band array image a multi-band image, [] -> image.
    .arrayFlatten([
        ['pc1', 'pc2', 'pc3', 'pc4', 'pc5', 'pc6', 'pc7', 'pc8']
    ]);

// Stretch this to the appropriate scale.
Map.addLayer(pcImage.select('pc1'), {}, 'pc1');

//The min and max values will need to change if you map different bands or locations.
var visParamsPCA = {
    bands: ['pc1', 'pc3', 'pc4'],
    min: [-455.09, -2.206, -4.53],
    max: [-417.59, -1.3, -4.18]
};

Map.addLayer(pcImage, visParamsPCA, 'PC_multi');

// Begin spectral unmixing example.

// Specify which bands to use for the unmixing.
var unmixImage = imageL8.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7']);

// Use a false color composite to help define polygons of 'pure' land cover.
Map.addLayer(imageL8, {
    bands: ['B5', 'B4', 'B3'],
    min: 0.0,
    max: 0.4
}, 'false color');

// Define polygons of bare, water, and vegetation.
var bare = /* color: #d63000 */ ee.Geometry.Polygon(
        [
            [
                [-119.29158963591193, 47.204453926034134],
                [-119.29192222982978, 47.20372502078616],
                [-119.29054893881415, 47.20345532330602],
                [-119.29017342955207, 47.20414049800489]
            ]
        ]),
    water = /* color: #98ff00 */ ee.Geometry.Polygon(
        [
            [
                [-119.42904610218152, 47.22253398528318],
                [-119.42973274768933, 47.22020224831784],
                [-119.43299431385144, 47.21390604625894],
                [-119.42904610218152, 47.21326472446865],
                [-119.4271149116908, 47.21868656429651],
                [-119.42608494342907, 47.2217470355224]
            ]
        ]),
    veg = /* color: #0b4a8b */ ee.Geometry.Polygon(
        [
            [
                [-119.13546041722502, 47.04929418944858],
                [-119.13752035374846, 47.04929418944858],
                [-119.13966612096037, 47.04765665820436],
                [-119.13777784581389, 47.04408900535686]
            ]
        ]);

//Print a chart. 
var lcfeatures = ee.FeatureCollection([
    ee.Feature(bare, {
        label: 'bare'
    }),
    ee.Feature(water, {
        label: 'water'
    }),
    ee.Feature(veg, {
        label: 'vegetation'
    })
]);

print(
    ui.Chart.image.regions({
        image: unmixImage,
        regions: lcfeatures,
        reducer: ee.Reducer.mean(),
        scale: 30,
        seriesProperty: 'label',
        xLabels: [0.48, 0.56, 0.65, 0.86, 1.61, 2.2]
    })
    .setChartType('LineChart')
    .setOptions({
        title: 'Image band values in 3 regions',
        hAxis: {
            title: 'Wavelength'
        },
        vAxis: {
            title: 'Mean Reflectance'
        }
    }));

// Get the means for each region.
var bareMean = unmixImage
    .reduceRegion(ee.Reducer.mean(), bare, 30).values();
var waterMean = unmixImage
    .reduceRegion(ee.Reducer.mean(), water, 30).values();
var vegMean = unmixImage
    .reduceRegion(ee.Reducer.mean(), veg, 30).values();

// Stack these mean vectors to create an Array.              
var endmembers = ee.Array.cat([bareMean, vegMean, waterMean], 1);
print(endmembers);

// Convert the 6-band input image to an image array.
var arrayImage = unmixImage.toArray().toArray(1);

// Solve for f.
var unmixed = ee.Image(endmembers).matrixSolve(arrayImage);

// Convert the result back to a multi-band image.
var unmixedImage = unmixed
    .arrayProject([0])
    .arrayFlatten([
        ['bare', 'veg', 'water']
    ]);

Map.addLayer(unmixedImage, {}, 'Unmixed');

// Begin HSV transformation example

// Convert Landsat 8 RGB bands to HSV color space
var hsv = imageL8.select(['B4', 'B3', 'B2']).rgbToHsv();

Map.addLayer(hsv, {
    max: 0.4
}, 'HSV Transform');

// Convert back to RGB, swapping the image panchromatic band for the value.
var rgb = ee.Image.cat([
    hsv.select('hue'),
    hsv.select('saturation'),
    imageL8.select(['B8'])
]).hsvToRgb();

Map.addLayer(rgb, {
    max: 0.4
}, 'Pan-sharpened');

//  -----------------------------------------------------------------------
//  CHECKPOINT  
//  -----------------------------------------------------------------------