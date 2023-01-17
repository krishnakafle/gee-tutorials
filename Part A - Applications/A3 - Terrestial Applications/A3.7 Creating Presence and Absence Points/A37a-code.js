//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.7 Creating Presence and Absence Points
//  Checkpoint:   A37a
//  Authors:      Peder Engelstad, Daniel Carver, Nicholas E. Young
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Call in NAIP imagery as an image collection.
var naip = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterBounds(roi)
    .filterDate('2015-01-01', '2017-12-31');

Map.centerObject(naip);

print(naip);

// Filter the data based on date.
var naip2017 = naip
    .filterDate('2017-01-01', '2017-12-31');

var naip2015 = naip
    .filterDate('2015-01-01', '2015-12-31');

// Define viewing parameters for multi band images.
var visParamsFalse = {
    bands: ['N', 'R', 'G']
};
var visParamsTrue = {
    bands: ['R', 'G', 'B']
};

// Add both sets of NAIP imagery to the map to compare coverage.
Map.addLayer(naip2015, visParamsTrue, '2015_true', false);
Map.addLayer(naip2017, visParamsTrue, '2017_true', false);

// Add 2015 false color imagery.
Map.addLayer(naip2015, visParamsFalse, '2015_false', false);

// Creating a geometry feature.
var exclosure = ee.Geometry.MultiPolygon([
    [
        [-107.91079184, 39.012553345],
        [-107.90828129, 39.012553345],
        [-107.90828129, 39.014070552],
        [-107.91079184, 39.014070552],
        [-107.91079184, 39.012553345]
    ],
    [
        [-107.9512176, 39.00870162],
        [-107.9496834, 39.00870162],
        [-107.9496834, 39.00950196],
        [-107.95121765, 39.00950196],
        [-107.95121765, 39.00870162]
    ]
]);

print(exclosure);

Map.addLayer(exclosure, {}, 'exclosures');

// Load in elevation dataset; clip it to general area.
var elev = ee.Image('USGS/NED')
    .clip(roi);

Map.addLayer(elev, {
    min: 1500,
    max: 3300
}, 'elevation', false);

// Apply mosaic, clip, then calculate NDVI.
var ndvi = naip2015
    .mosaic()
    .clip(roi)
    .normalizedDifference(['N', 'R'])
    .rename('ndvi');

Map.addLayer(ndvi, {
    min: -0.8,
    max: 0.8
}, 'NDVI', false);

print(ndvi, 'ndvi');

// Add National Land Cover Database (NLCD).
var dataset = ee.ImageCollection('USGS/NLCD');

print(dataset, 'NLCD');

// Load the selected NLCD image.
var landcover = ee.Image('USGS/NLCD/NLCD2016')
    .select('landcover')
    .clip(roi);

Map.addLayer(landcover, {}, 'Landcover', false);

// Generate random points within the sample area.
var points = ee.FeatureCollection.randomPoints({
    region: sampleArea,
    points: 1000,
    seed: 1234
});

print(points, 'points');

Map.addLayer(points, {}, 'Points', false);

// Add bands of elevation and NAIP.
var ndviElev = ndvi
    .addBands(elev)
    .addBands(landcover);

print(ndviElev, 'Multi band image');

// Extract values to points.
var samples = ndviElev.sampleRegions({
    collection: points,
    scale: 30,
    geometries: true
});

print(samples, 'samples');

Map.addLayer(samples, {}, 'samples', false);

// Filter metadata for sites in the NLCD deciduous forest layer.
var aspenSites = samples.filter(ee.Filter.equals('landcover', 41));

print(aspenSites, 'Sites');

// Set the NDVI range.
var ndvi1 = ndvi
    .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: exclosure,
        scale: 1,
        crs: 'EPSG:4326'
    });

print(ndvi1, 'Mean NDVI');

// Generate a range of acceptable NDVI values.
var ndviNumber = ee.Number(ndvi1.get('ndvi'));
var ndviBuffer = ndviNumber.multiply(0.1);
var ndviRange = [
    ndviNumber.subtract(ndviBuffer),
    ndviNumber.add(ndviBuffer)
];

print(ndviRange, 'NDVI Range');

/*
This function is used to determine the mean value of an image within a given area.
image: an image with a single band of ordinal or interval level data
geom: geometry feature that overlaps with the image
pixelSize: a number that defines the cell size of the image
Returns a dictionary with the median values of the band, the key is the band name.
*/
var reduceRegionFunction = function(image, geom, pixelSize) {
    var dict = image.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geom,
        scale: pixelSize,
        crs: 'EPSG:4326'
    });
    return (dict);
};

// Call function on the NDVI dataset to compare.
var ndvi_test = reduceRegionFunction(ndvi, exclosure, 1);

print(ndvi_test, 'ndvi_test');

// Call function on elevation dataset.
var elev1 = reduceRegionFunction(elev, exclosure, 30);

print(elev1, 'elev1');

/*
Generate a range of acceptable values.
dictionary: a dictionary object
key: key to the value of interest, must be a string
proportion: a percentile to define the range of the values around the mean
Returns a list with a min and max value for the given range.
*/
var effectiveRange = function(dictionary, key, proportion) {
    var number = ee.Number(dictionary.get(key));
    var buffer = number.multiply(proportion);
    var range = [
        number.subtract(buffer),
        number.add(buffer)
    ];
    return (range);
};

// Call function on elevation data.
var elevRange = effectiveRange(elev1, 'elevation', 0.1);

print(elevRange);

// Apply multiple filters to get at potential locations.
var combinedFilter = ee.Filter.and(
    ee.Filter.greaterThan('ndvi', ndviRange[0]),
    ee.Filter.lessThan('ndvi', ndviRange[1]),
    ee.Filter.greaterThan('elevation', elevRange[0]),
    ee.Filter.lessThan('elevation', elevRange[1])
);

var aspenSites2 = aspenSites.filter(combinedFilter);

print(aspenSites2, 'aspenSites2');

Map.addLayer(aspenSites2, {}, 'aspenSites2', false);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------