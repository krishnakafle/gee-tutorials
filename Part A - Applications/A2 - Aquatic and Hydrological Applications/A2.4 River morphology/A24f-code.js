//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.4 River Morphology 
//  Checkpoint:   A24f
//  Authors:      Xiao Yang, Theodore Langhorst, Tamlin M. Pavelsky
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var getUTMProj = function(lon, lat) {
    // Given longitude and latitude in decimal degrees, 
    // return EPSG string for the corresponding UTM projection. See:
    // https://apollomapping.com/blog/gtm-finding-a-utm-zone-number-easily
    // https://sis.apache.org/faq.html
    var utmCode = ee.Number(lon).add(180).divide(6).ceil().int();
    var output = ee.Algorithms.If({
        condition: ee.Number(lat).gte(0),
        trueCase: ee.String('EPSG:326').cat(utmCode
            .format('%02d')),
        falseCase: ee.String('EPSG:327').cat(utmCode
            .format('%02d'))
    });
    return (output);
};

var coords = aoi.centroid(30).coordinates();
var lon = coords.get(0);
var lat = coords.get(1);
var crs = getUTMProj(lon, lat);
var scale = 30;

var rpj = function(image) {
    return image.reproject({
        crs: crs,
        scale: scale
    });
};

var distanceKernel = ee.Kernel.euclidean({
    radius: 30,
    units: 'meters',
    magnitude: 0.5
});

var makeChannelmask = function(year) {
    var watermask = jrcYearly.filter(ee.Filter.eq('year', year))
        .first()
        .gte(2).unmask()
        .focal_max().focal_min()
        .rename('watermask');

    var barPolys = watermask.not().selfMask()
        .reduceToVectors({
            geometry: aoi,
            scale: 30,
            eightConnected: false
        })
        .filter(ee.Filter.lte('count', 1E4)); // Get small polys.

    var filled = watermask.paint(barPolys, 1).rename('filled');

    var costmap = filled.not().cumulativeCost({
        source: watermask.and(ee.Image().toByte().paint(
            sword, 1)),
        maxDistance: 5E3,
        geodeticDistance: false
    }).rename('costmap');

    var rivermask = costmap.eq(0).rename('rivermask');
    var channelmask = rivermask.and(watermask).rename(
        'channelmask');

    var bankMask = channelmask.focal_max(1).neq(channelmask)
        .rename('bankMask');
    var bankDistance = channelmask.not().cumulativeCost({
        source: channelmask,
        maxDistance: 1E2,
        geodeticDistance: false
    });
    var bankAspect = ee.Terrain.aspect(bankDistance).mask(
        bankMask).rename('bankAspect');

    var bankLength = bankMask.convolve(distanceKernel)
        .mask(bankMask).rename('bankLength');

    return ee.Image.cat([
            watermask, channelmask, rivermask, bankMask,
            bankAspect, bankLength
        ]).set('year', year)
        .clip(aoi);
};

/*
  Isolate the river channel from the JRC data for two years and apply the bank morphology 
  calculations from Section 1. Here we will simply compare two years with two explicit 
  calls to the makeChannelmask() function, but you can also map this function over a list 
  of years like follows:

  var masks = ee.List.sequence(2000,2020,5).map(makeChannelmask)
*/

var masks1 = makeChannelmask(2015);
var masks2 = makeChannelmask(2020);
Map.centerObject(aoi, 13);
var year1mask = rpj(masks1.select('channelmask').selfMask());
Map.addLayer(year1mask, {
    palette: ['blue']
}, 'year 1');
var year2mask = rpj(masks2.select('channelmask').selfMask());
Map.addLayer(year2mask, {
    palette: ['red']
}, 'year 2', true, 0.5);

// Pixels that are now the river channel but were previously land.
var erosion = masks2.select('channelmask')
    .and(masks1.select('watermask').not()).rename('erosion');
Map.addLayer(rpj(erosion).selfMask(), {}, 'erosion', false);

// Erosion distance assuming the shortest distance between banks.
var erosionEndpoints = erosion.focal_max(1).and(masks2.select(
    'bankMask'));
var erosionDistance = erosion.focal_max(1).selfMask()
    .cumulativeCost({
        source: erosionEndpoints,
        maxDistance: 1E3,
        geodeticDistance: true
    }).rename('erosionDistance');
Map.addLayer(rpj(erosionDistance),
    {
        min: 0,
        max: 300
    },
    'erosion distance',
    false);

// Direction of the erosion following slope of distance.
var erosionDirection = ee.Terrain.aspect(erosionDistance)
    .multiply(Math.PI).divide(180)
    .clip(aoi)
    .rename('erosionDirection');
erosionDistance = erosionDistance.mask(erosion);
Map.addLayer(rpj(erosionDirection),
    {
        min: 0,
        max: Math.PI
    },
    'erosion direction',
    false);

/*
  Map each pixel to the closest river centerline point.
*/

// Distance to nearest SWORD centerline point.
var distance = sword.distance(2E3).clip(aoi);

// Second derivatives of distance.
// Finding the 0s identifies boundaries between centerline points.
var concavityBounds = distance.convolve(ee.Kernel.laplacian8())
    .gte(0).rename('bounds');

Map.addLayer(rpj(distance), {
    min: 0,
    max: 1E3
}, 'distance', false);
Map.addLayer(rpj(concavityBounds), {}, 'bounds', false);

// Reduce the pixels according to the concavity boundaries, 
// and set the value to SWORD node ID.  Note that focalMode is used 
// to fill in the empty pixels that were the boundaries.
var swordImg = ee.Image(0).paint(sword, 'node_id').rename('node_id')
    .clip(aoi);
var nodePixels = concavityBounds.addBands(swordImg)
    .reduceConnectedComponents({
        reducer: ee.Reducer.max(),
        labelBand: 'bounds'
    }).focalMode({
        radius: 3,
        iterations: 2
    });
Map.addLayer(rpj(nodePixels).randomVisualizer(),
    {},
    'node assignments',
    false);

// Set up a custom reducing function to summarize the data.
var groupReduce = function(dataImg, nodeIds, reducer) {
    // Create a grouped reducer for each band in the data image.
    var groupReducer = reducer.forEach(dataImg.bandNames())
        .group({
            groupField: dataImg.bandNames().length(),
            groupName: 'node_id'
        });

    // Apply the grouped reducer.
    var statsList = dataImg.addBands(nodeIds).clip(aoi)
        .reduceRegion({
            reducer: groupReducer,
            scale: 30,
        }).get('groups');

    // Convert list of dictionaries to FeatureCollection.
    var statsOut = ee.List(statsList).map(function(dict) {
        return ee.Feature(null, dict);
    });
    return ee.FeatureCollection(statsOut);
};

var dataMask = masks1.addBands(masks2).reduce(ee.Reducer
    .anyNonZero());

var sumBands = ['watermask', 'channelmask', 'bankLength'];
var sumImg = erosion
    .addBands(masks1, sumBands)
    .addBands(masks2, sumBands);
var sumStats = groupReduce(sumImg, nodePixels, ee.Reducer.sum());

var angleImg = erosionDirection
    .addBands(masks1, ['bankAspect'])
    .addBands(masks2, ['bankAspect']);
var angleStats = groupReduce(angleImg, nodePixels, ee.Reducer
    .circularMean());

var vectorData = sword.filterBounds(aoi).map(function(feat) {
    var nodeFilter = ee.Filter.eq('node_id', feat.get(
        'node_id'));
    var sumFeat = sumStats.filter(nodeFilter).first();
    var angleFeat = angleStats.filter(nodeFilter).first();
    return feat.copyProperties(sumFeat).copyProperties(
        angleFeat);
});

print(vectorData);
Map.addLayer(vectorData, {}, 'final data');

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------