//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.5 Deforestation Viewed from Multiple Sensors
//  Checkpoint:   A35g
//  Author:       Xiaojing Tang
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var testArea = ee.Geometry.Polygon(
    [
        [
            [-66.73156878460787, -8.662236005089952],
            [-66.73156878460787, -8.916025640576244],
            [-66.44867083538912, -8.916025640576244],
            [-66.44867083538912, -8.662236005089952]
        ]
    ]);

Map.centerObject(testArea);

// Start and end of the training and monitoring period.
var trainPeriod = ee.Dictionary({
    'start': '2017-01-01',
    'end': '2020-01-01'
});
var monitorPeriod = ee.Dictionary({
    'start': '2020-01-01',
    'end': '2021-01-01'
});

// Near-real-time monitoring parameters.
var nrtParam = {
    z: 2,
    m: 5,
    n: 4
};

// Sensor specific parameters.
var lstParam = {
    band: 'NDFI',
    minRMSE: 0.05,
    strikeOnly: false
};
var s2Param = {
    band: 'NDFI',
    minRMSE: 0.05,
    strikeOnly: false
};
var s1Param = {
    band: 'VV',
    minRMSE: 0.01,
    strikeOnly: true
};

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

var unmixing = function(col) {

    // Define endmembers and cloud fraction threshold.
    var gv = [500, 900, 400, 6100, 3000, 1000];
    var npv = [1400, 1700, 2200, 3000, 5500, 3000];
    var soil = [2000, 3000, 3400, 5800, 6000, 5800];
    var shade = [0, 0, 0, 0, 0, 0];
    var cloud = [9000, 9600, 8000, 7800, 7200, 6500];
    var cfThreshold = 0.05;

    return col.map(function(img) {
        // Select the spectral bands and perform unmixing
        var unmixed = img.select(['Blue', 'Green', 'Red',
                'NIR',
                'SWIR1', 'SWIR2'
            ])
            .unmix([gv, shade, npv, soil, cloud], true,
                true)
            .rename(['GV', 'Shade', 'NPV', 'Soil',
                'Cloud'
            ]);

        // Calculate Normalized Difference Fraction Index.+
        var NDFI = unmixed.expression(
            '10000 * ((GV / (1 - SHADE)) - (NPV + SOIL)) / ' +
            '((GV / (1 - SHADE)) + (NPV + SOIL))', {
                'GV': unmixed.select('GV'),
                'SHADE': unmixed.select('Shade'),
                'NPV': unmixed.select('NPV'),
                'SOIL': unmixed.select('Soil')
            }).rename('NDFI');

        // Mask cloudy pixel.
        var maskCloud = unmixed.select('Cloud').lt(
            cfThreshold);
        // Mask all shade pixel.
        var maskShade = unmixed.select('Shade').lt(1);
        // Mask pixel where NDFI cannot be calculated.
        var maskNDFI = unmixed.expression(
            '(GV / (1 - SHADE)) + (NPV + SOIL)', {
                'GV': unmixed.select('GV'),
                'SHADE': unmixed.select('Shade'),
                'NPV': unmixed.select('NPV'),
                'SOIL': unmixed.select('Soil')
            }).gt(0);

        // Scale fractions to 0-10000 and apply masks.
        return img
            .addBands(unmixed.select(['GV', 'Shade',
                    'NPV', 'Soil'
                ])
                .multiply(10000))
            .addBands(NDFI)
            .updateMask(maskCloud)
            .updateMask(maskNDFI)
            .updateMask(maskShade);
    });
};

var input = require(
    'projects/gee-edu/book:Part A - Applications/A3 - Terrestrial Applications/A3.5 Deforestation Viewed from Multiple Sensors/modules/Inputs'
);
var lstTraining = unmixing(input.loadLandsatData(testArea,
    trainPeriod));
var lstMonitoring = unmixing(input.loadLandsatData(testArea,
    monitorPeriod));
var s2Training = unmixing(input.loadS2Data(testArea, trainPeriod));
var s2Monitoring = unmixing(input.loadS2Data(testArea,
    monitorPeriod));
var s1Training = input.loadS1Data(testArea, trainPeriod);
var s1Monitoring = input.loadS1Data(testArea, monitorPeriod);

var hansen = ee.Image('UMD/hansen/global_forest_change_2020_v1_8')
    .unmask();
var forestMask = hansen.select('treecover2000')
    .gt(50)
    .add(hansen.select('gain'))
    .subtract(hansen.select('loss'))
    .add(hansen.select('lossyear')
        .eq(20))
    .gt(0)
    .clip(testArea);

var maskVis = {
    min: 0,
    max: 1,
    palette: ['blue', 'green']
};
Map.addLayer(forestMask, maskVis, 'Forest Mask', false);
print('lstTraining', lstTraining);
print('lstMonitoring', lstMonitoring);
print('s2Training', s2Training);
print('s2Monitoring', s2Monitoring);
print('s1Training', s1Training);
print('s1Monitoring', s1Monitoring);

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

var toFracYear = function(date) {
    var year = date.get('year');
    var fYear = date.difference(
        ee.Date.fromYMD(year, 1, 1), 'year');
    return year.add(fYear);
};

var fitHarmonicModel = function(col, band) {
    // Function to add dependent variables to an image.
    var addDependents = function(img) {
        // Transform time variable to fractional year.
        var t = ee.Number(toFracYear(
            ee.Date(img.get('system:time_start')), 1));
        var omega = 2.0 * Math.PI;
        // Construct dependent variables image.
        var dependents = ee.Image.constant([
                1, t,
                t.multiply(omega).cos(),
                t.multiply(omega).sin(),
                t.multiply(omega * 2).cos(),
                t.multiply(omega * 2).sin(),
                t.multiply(omega * 3).cos(),
                t.multiply(omega * 3).sin()
            ])
            .float()
            .rename(['INTP', 'SLP', 'COS', 'SIN',
                'COS2', 'SIN2', 'COS3', 'SIN3'
            ]);
        return img.addBands(dependents);
    };

    // Function to add dependent variable images to all images.
    var prepareData = function(col, band) {
        return ee.ImageCollection(col.map(function(img) {
            return addDependents(img.select(band))
                .select(['INTP', 'SLP', 'COS',
                    'SIN',
                    'COS2', 'SIN2', 'COS3',
                    'SIN3',
                    band
                ])
                .updateMask(img.select(band)
                    .mask());
        }));
    };

    var col2 = prepareData(col, band);
    // Fit model to data using robust linear regression.
    var ccd = col2
        .reduce(ee.Reducer.robustLinearRegression(8, 1), 4)
        .rename([band + '_coefs', band + '_rmse']);

    // Return model coefficients and model rmse.
    return ccd.select(band + '_coefs').arrayTranspose()
        .addBands(ccd.select(band + '_rmse'));
};

// Fit harmonic models to training data of all sensors.
var lstModel = fitHarmonicModel(lstTraining, lstParam.band)
    .set({
        region: 'test',
        sensor: 'Landsat'
    });
var s2Model = fitHarmonicModel(s2Training, s2Param.band)
    .set({
        region: 'test',
        sensor: 'Sentinel-2'
    });
var s1Model = fitHarmonicModel(s1Training, s2Param.band)
    .set({
        region: 'test',
        sensor: 'Sentinel-1'
    });

// Define function to save the results.
var saveModel = function(model, prefix) {
    Export.image.toAsset({
        image: model,
        scale: 30,
        assetId: prefix + '_CCD',
        description: 'Save_' + prefix + '_CCD',
        region: testArea,
        maxPixels: 1e13,
        pyramidingPolicy: {
            '.default': 'sample'
        }
    });
};

// Run the saving function.
saveModel(lstModel, 'LST');
saveModel(s2Model, 'S2');
saveModel(s1Model, 'S1');

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

var models = ee.ImageCollection('projects/gee-book/assets/A3-5/ccd');
var lstModel = models
    .filterMetadata('sensor', 'equals', 'Landsat').first();
var s2Model = models
    .filterMetadata('sensor', 'equals', 'Sentinel-2').first();
var s1Model = models
    .filterMetadata('sensor', 'equals', 'Sentinel-1').first();

var dearrayModel = function(model, band) {
    band = band + '_';

    // Function to extract a non-harmonic coefficients.
    var genCoefImg = function(model, band, coef) {
        var zeros = ee.Array(0).repeat(0, 1);
        var coefImg = model.select(band + coef)
            .arrayCat(zeros, 0).float()
            .arraySlice(0, 0, 1);
        return ee.Image(coefImg
            .arrayFlatten([
                [ee.String('S1_')
                    .cat(band).cat(coef)
                ]
            ]));
    };

    // Function to extract harmonic coefficients.
    var genHarmImg = function(model, band) {
        var harms = ['INTP', 'SLP', 'COS', 'SIN',
            'COS2', 'SIN2', 'COS3', 'SIN3'
        ];
        var zeros = ee.Image(ee.Array([
                ee.List.repeat(0, harms.length)
            ]))
            .arrayRepeat(0, 1);
        var coefImg = model.select(band + 'coefs')
            .arrayCat(zeros, 0).float()
            .arraySlice(0, 0, 1);
        return ee.Image(coefImg
            .arrayFlatten([
                [ee.String(band).cat('coef')], harms
            ]));
    };

    // Extract harmonic coefficients and rmse.
    var rmse = genCoefImg(model, band, 'rmse');
    var coef = genHarmImg(model, band);
    return ee.Image.cat(rmse, coef);
};

var createPredImg = function(modelImg, img, band, sensor) {
    // Reformat date.
    var date = toFracYear(ee.Date(img.get('system:time_start')));
    var dateString = ee.Date(img.get('system:time_start'))
        .format('yyyyMMdd');
    // List of coefficients .
    var coefs = ['INTP', 'SLP', 'COS', 'SIN',
        'COS2', 'SIN2', 'COS3', 'SIN3'
    ];
    // Get coefficients images from model image.
    var coef = ee.Image(coefs.map(function(coef) {
        return modelImg.select(".*".concat(coef));
    })).rename(coefs);
    var t = ee.Number(date);
    var omega = 2.0 * Math.PI;
    // Construct dependent variables.
    var pred = ee.Image.constant([
            1, t,
            t.multiply(omega).cos(),
            t.multiply(omega).sin(),
            t.multiply(omega * 2).cos(),
            t.multiply(omega * 2).sin(),
            t.multiply(omega * 3).cos(),
            t.multiply(omega * 3).sin()
        ])
        .float();
    // Matrix multiply dependent variables with coefficients.
    return pred.multiply(coef).reduce('sum')
        // Add original image and rename bands.
        .addBands(img, [band]).rename(['predicted', band])
        // Preserve some metadata.
        .set({
            'sensor': sensor,
            'system:time_start': img.get('system:time_start'),
            'dateString': dateString
        });
};

var addPredicted = function(data, modelImg, band, sensor) {
    return ee.ImageCollection(data.map(function(img) {
        return createPredImg(modelImg, img, band,
            sensor);
    }));
};

// Convert models to non-array images.
var lstModelImg = dearrayModel(lstModel, lstParam.band);
var s2ModelImg = dearrayModel(s2Model, s2Param.band);
var s1ModelImg = dearrayModel(s1Model, s1Param.band);

// Add predicted image to each real image.
var lstPredicted = addPredicted(lstMonitoring, lstModelImg,
    lstParam.band, 'Landsat');
var s2Predicted = addPredicted(s2Monitoring, s2ModelImg,
    s2Param.band, 'Sentinel-2');
var s1Predicted = addPredicted(s1Monitoring, s1ModelImg,
    s1Param.band, 'Sentinel-1');

print('lstPredicted', lstPredicted);

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

// Function to calculate residuals.
var addResiduals = function(data, band) {
    return ee.ImageCollection(data.map(function(img) {
        return img.select('predicted')
            // Restrict predicted value to be under 10000
            .where(img.select('predicted').gt(10000),
                10000)
            // Calculate the residual
            .subtract(img.select(band))
            .rename('residual')
            // Save some metadata
            .set({
                'sensor': img.get('sensor'),
                'system:time_start': img.get(
                    'system:time_start'),
                'dateString': img.get(
                    'dateString')
            });
    }));
};

// Function to calculate change score and flag change.
var addChangeScores = function(data, rmse, minRMSE,
    threshold, strikeOnly) {
    // If strikeOnly then we need a mask for balls.
    var mask = ee.Image(0);
    if (strikeOnly) {
        mask = ee.Image(1);
    }

    return ee.ImageCollection(data.map(function(img) {
        // Calculate change score
        var z = img.divide(rmse.max(minRMSE));
        // Check if score is above threshold
        var strike = z.multiply(z.gt(threshold));
        // Create the output image.
        var zStack = ee.Image.cat(z, strike).rename([
                'z', 'strike'
            ])
            .set({
                'sensor': img.get('sensor'),
                'system:time_start': img.get(
                    'system:time_start')
            });
        // Mask balls if strikeOnly.
        return zStack.updateMask(strike.gt(0).or(
            mask));
    }));
};

// Add residuals to collection of predicted images.
var lstResiduals = addResiduals(lstPredicted, lstParam.band);
var s2Residuals = addResiduals(s2Predicted, s2Param.band);
var s1Residuals = addResiduals(s1Predicted, s1Param.band);

// Add change score to residuals.
var lstScores = addChangeScores(
    lstResiduals, lstModelImg.select('.*rmse'),
    lstPredicted.select(lstParam.band).mean()
    .abs().multiply(lstParam.minRMSE),
    nrtParam.z, lstParam.strikeOnly);
var s2Scores = addChangeScores(
    s2Residuals, s2ModelImg.select('.*rmse'),
    s2Predicted.select(s2Param.band).mean()
    .abs().multiply(s2Param.minRMSE),
    nrtParam.z, s2Param.strikeOnly);
var s1Scores = addChangeScores(
    s1Residuals, s1ModelImg.select('.*rmse'),
    s1Predicted.select(s1Param.band).mean()
    .abs().multiply(s1Param.minRMSE),
    nrtParam.z, s1Param.strikeOnly);

print('lstScores', lstScores);

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

var fused = lstScores.merge(s2Scores).merge(s1Scores)
    .sort('system:time_start');
    
var monitorChange = function(changeScores, nrtParam) {
    // Initialize an empty image.
    var zeros = ee.Image(0).addBands(ee.Image(0))
        .rename(['change', 'date']);
    // Determine shift size based on size of monitoring window.
    var shift = Math.pow(2, nrtParam.m - 1) - 1;
    // Function to monitor.
    var monitor = function(img, result) {
        // Retrieve change image at last step.
        var change = ee.Image(result).select('change');
        // Retrieve change date image at last step.
        var date = ee.Image(result).select('date');
        // Create a shift image to shift the change binary array
        // left for one space so that new one can be appended.
        var shiftImg = img.select('z').mask().eq(0)
            .multiply(shift + 1).add(shift);
        change = change.bitwiseAnd(shiftImg)
            .multiply(shiftImg.eq(shift).add(1))
            .add(img.select('strike').unmask().gt(0));
        // Check if there are enough strike in the current
        // monitoring window to flag a change.
        date = date.add(change.bitCount().gte(nrtParam.n)
            // Ignore pixels where change already detected.
            .multiply(date.eq(0))
            // Record change date where change is flagged.
            .multiply(ee.Number(toFracYear(
                ee.Date(img.get(
                    'system:time_start')), 1))));
        // Combine change and date layer for next iteration.
        return (change.addBands(date));
    };

    // Iterate through the time series and look for change.
    return ee.Image(changeScores.iterate(monitor, zeros))
        // Select change date layer and selfmask.
        .select('date').rename('Alerts').selfMask();
};

var alerts = monitorChange(fused, nrtParam).updateMask(forestMask);
print('alerts', alerts);

// Define a visualization parameter.
var altVisParam = {
    min: 2020.4,
    max: 2021,
    palette: ['FF0080', 'EC1280', 'DA2480', 'C83680', 'B64880',
        'A35B80', '916D80', '7F7F80', '6D9180', '5BA380',
        '48B680', '36C880', '24DA80', '12EC80', '00FF80',
        '00EB89', '00D793', '00C49D', '00B0A7', '009CB0',
        '0089BA', '0075C4', '0062CE', '004ED7', '003AE1',
        '0027EB', '0013F5', '0000FF'
    ]
};
Map.centerObject(testArea, 10);
Map.addLayer(alerts, altVisParam, 'Forest Disturbance Map (2020)');
Map.setOptions('SATELLITE');

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------