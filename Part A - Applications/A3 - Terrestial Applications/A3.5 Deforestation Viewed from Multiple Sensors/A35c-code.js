//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.5 Deforestation Viewed from Multiple Sensors
//  Checkpoint:   A35c
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
Map.addLayer(forestMask, maskVis, 'Forest Mask');
print('lstTraining', lstTraining);
print('lstMonitoring', lstMonitoring);
print('s2Training', s2Training);
print('s2Monitoring', s2Monitoring);
print('s1Training', s1Training);
print('s1Monitoring', s1Monitoring);

// ------------------------------------------------------------------------
// CHECKPOINT
// ------------------------------------------------------------------------

