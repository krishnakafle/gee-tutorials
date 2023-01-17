//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.4 River Morphology 
//  Checkpoint:   A24e
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

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------