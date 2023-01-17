//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.2 Benthic Habitats
//  Checkpoint:   A22c
//  Authors:      Dimitris Poursanidis, Aurélie C. Shapiro, Spyros Christofilakos
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Section 1
// Import and display satellite image.
var planet = ee.Image('projects/gee-book/assets/A2-2/20200505_N2000')
    .divide(10000);

Map.centerObject(planet, 12);
var visParams = {
    bands: ['b3', 'b2', 'b1'],
    min: 0.17,
    max: 0.68,
    gamma: 0.8
};
Map.addLayer({
    eeObject: planet,
    visParams: visParams,
    name: 'planet initial',
    shown: true
});

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------

// Section 2
// Mask based to NDWI and RF.
function landmask(img) {
    var ndwi = img.normalizedDifference(['b2', 'b4']);
    var training = ndwi.sampleRegions(land.merge(water), ['class'],
        3);
    var trained = ee.Classifier.smileRandomForest(10)
        .train(training, 'class');
    var classified = ndwi.classify(trained);
    var mask = classified.eq(1);

    return img.updateMask(mask);
}

var maskedImg = landmask(planet);

Map.addLayer(maskedImg, visParams, 'maskedImg', false);

// Sun-glint correction.
function sunglintRemoval(img) {
    var linearFit1 = img.select(['b4', 'b1']).reduceRegion({
        reducer: ee.Reducer.linearFit(),
        geometry: sunglint,
        scale: 3,
        maxPixels: 1e12,
        bestEffort: true,
    });
    var linearFit2 = img.select(['b4', 'b2']).reduceRegion({
        reducer: ee.Reducer.linearFit(),
        geometry: sunglint,
        scale: 3,
        maxPixels: 1e12,
        bestEffort: true,
    });
    var linearFit3 = img.select(['b4', 'b3']).reduceRegion({
        reducer: ee.Reducer.linearFit(),
        geometry: sunglint,
        scale: 3,
        maxPixels: 1e12,
        bestEffort: true,
    });

    var slopeImage = ee.Dictionary({
        'b1': linearFit1.get('scale'),
        'b2': linearFit2.get('scale'),
        'b3': linearFit3.get('scale')
    }).toImage();

    var minNIR = img.select('b4').reduceRegion({
        reducer: ee.Reducer.min(),
        geometry: sunglint,
        scale: 3,
        maxPixels: 1e12,
        bestEffort: true,
    }).toImage(['b4']);

    return img.select(['b1', 'b2', 'b3'])
        .subtract(slopeImage.multiply((img.select('b4')).subtract(
            minNIR)))
        .addBands(img.select('b4'));
}
var sgImg = sunglintRemoval(maskedImg);
Map.addLayer(sgImg, visParams, 'sgImg', false);

// DIV procedure.
function kernel(img) {
    var boxcar = ee.Kernel.square({
        radius: 2,
        units: 'pixels',
        normalize: true
    });
    return img.convolve(boxcar);
}

function makePositive(img) {
    return img.where(img.lte(0), 0.0001);
}

function div(img) {
    var band1 = ee.List(['b1', 'b2', 'b3', 'b1', 'b2']);
    var band2 = ee.List(['b3', 'b3', 'b2', 'b2', 'b1']);
    var nband = ee.List(['b1b3', 'b2b3', 'b3b2', 'b1b2', 'b2b1']);

    for (var i = 0; i < 5; i += 1) {
        var x = band1.get(i);
        var y = band2.get(i);
        var z = nband.get(i);

        var imageLog = img.select([x, y]).log();

        var covariance = imageLog.toArray().reduceRegion({
            reducer: ee.Reducer.covariance(),
            geometry: DIVsand,
            scale: 3,
            maxPixels: 1e12,
            bestEffort: true,
        });

        var covarMatrix = ee.Array(covariance.get('array'));
        var var1 = covarMatrix.get([0, 0]);
        var var2 = covarMatrix.get([1, 1]);
        var covar = covarMatrix.get([0, 1]);

        var a = var1.subtract(var2).divide(covar.multiply(2));
        var attenCoeffRatio = a.add(((a.pow(2)).add(1)).sqrt());

        var depthInvariantIndex = img.expression(
            'image1 - (image2 * coeff)', {
                'image1': imageLog.select([x]),
                'image2': imageLog.select([y]),
                'coeff': attenCoeffRatio
            });

        img = ee.Image.cat([img, depthInvariantIndex.select([x], [
            z
        ])]);
    }
    return img;
}

var divImg = div(kernel(makePositive(sgImg))).select('b[1-3]',
    'b1b2');
var vivVisParams = {
    bands: ['b1b2'],
    min: -0.81,
    max: -0.04,
    gamma: 0.75
};
Map.addLayer(divImg, vivVisParams, 'divImg', false);

// ------------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------------
