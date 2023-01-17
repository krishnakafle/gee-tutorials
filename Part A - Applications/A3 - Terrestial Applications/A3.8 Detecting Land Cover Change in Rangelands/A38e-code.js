//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.8 Detecting Land Cover Change in Rangelands
//  Checkpoint:   A38e
//  Authors:      Ginger Allington, Natalie Kreitzer
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load the shapefile asset for the AOI as a Feature Collection
var aoi = ee.FeatureCollection(
    'projects/gee-book/assets/A3-8/GEE_Ch_AOI');
Map.centerObject(aoi, 11);
Map.addLayer(aoi, {}, 'Subset of Naiman Banner');

// Filter the MODIS Collection 
var MODIS_LC = ee.ImageCollection('MODIS/006/MCD12Q1').select(
    'LC_Type1');

// Function to clip an image from the collection and set the year
var clipCol = function(img) {
    var date = ee.String(img.get('system:index'));
    date = date.slice(0, 4);
    return img.select('LC_Type1').clip(aoi) // .clip(aoi)
        .set('year', date);
};

// Generate images for diff years you want to compare
var modis01 = MODIS_LC.filterDate('2001-01-01', '2002-01-01').map(
    clipCol);
var modis09 = MODIS_LC.filterDate('2009-01-01', '2010-01-01').map(
    clipCol);
var modis16 = MODIS_LC.filterDate('2016-01-01', '2017-01-01').map(
    clipCol);
// Create an Image for each of the years
var modis01 = modis01.first();
var modis09 = modis09.first();
var modis16 = modis16.first();

Map.addLayer(modis01.randomVisualizer(), {}, 'modis 2001', false);
Map.addLayer(modis09.randomVisualizer(), {}, 'modis 2009', false);
Map.addLayer(modis16.randomVisualizer(), {}, 'modis 2016', false);

// Add and clip the WorldCover data
var wCov = ee.ImageCollection('ESA/WorldCover/v100').first();
var landcover20 = wCov.clip(aoi);
Map.addLayer(landcover20, {}, 'Landcover 2020');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

var greennessColl = ee.ImageCollection(
    'projects/gee-book/assets/A3-8/GreennessCollection_aoi');
var precipColl = ee.ImageCollection(
    'projects/gee-book/assets/A3-8/PrecipCollection');
print(greennessColl, 'Greenness Image Collection');
print(precipColl, 'Precip Image Collection');

var greennessParams = {
    bands: ['greenness'],
    max: 0.5,
    min: 0.06,
    opacity: 1,
    palette: ['e70808', 'ffffff', '1de22c']
};

var greenness1985 = greennessColl.filterDate('1985-01-01',
    '1986-01-01').select('greenness');
var greenness1999 = greennessColl.filterDate('1999-01-01',
    '2000-01-01').select('greenness');

print(greenness1999);
var greenness2019 = greennessColl.filterDate('2019-01-01',
    '2020-01-01').select('greenness');

Map.addLayer(greenness1985, greennessParams, 'Greenness 1985', false);
Map.addLayer(greenness1999, greennessParams, 'Greenness 1999', false);
Map.addLayer(greenness2019, greennessParams, 'Greenness 2019', false);



// Load a function that will combine the Precipitation and Greenness collections, run a regression, then predict NDVI and calculate the residuals.

// Load the module
var residFunctions = require(
    'projects/gee-edu/book:Part A - Applications/A3 - Terrestrial Applications/A3.8 Detecting Land Cover Change in Rangelands/modules/calcResid'
);

// Call the function we want that is in that module
// It requires three input parameters:
// the greenness collection, the precipitation collection and the aoi
var residualColl = (residFunctions.createResidColl(greennessColl,
    precipColl, aoi));

// Now inspect what you have generated:
print('Module output of residuals', residualColl);

var resids = residualColl.first();
var res1 = resids.select(['residual']);
print(res1.getInfo(), 'residual image');
Map.addLayer(res1, {
    min: -0.2,
    max: 0.2,
    palette: ['red', 'white', 'green']
}, 'residuals 1985', false);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

//---- DEFINE RUN PARAMETERS---//
// LandTrendr run parameters 
var runParams = {
    maxSegments: 6,
    spikeThreshold: 0.9, //
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: 0.25, //
    pvalThreshold: 0.05, //
    bestModelProportion: 0.75,
    minObservationsNeeded: 10 //    
};

// Append the image collection to the LandTrendr run parameter dictionary 
var srCollection = residualColl;
runParams.timeSeries = srCollection;

// Run LandTrendr
var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParams);
// Explore the output from running LT
var ltlt = lt.select('LandTrendr');
print(ltlt);

//---- SLICING OUT DATA -----------------//

// Select the LandTrendr band.
var ltlt = lt.select('LandTrendr');
// Observation Year.
var years = ltlt.arraySlice(0, 0, 1);
// Slice out observed Residual value.
var observed = ltlt.arraySlice(0, 1, 2);
// Slice out fitted Residual values (predicted residual from final LT model).
var fitted = ltlt.arraySlice(0, 2, 3);
// Slice out the 'Is Vertex' row - yes(1)/no(0).
var vertexMask = ltlt.arraySlice(0, 3, 4);
// Use the 'Is Vertex' row as a mask for all rows.
var vertices = ltlt.arrayMask(vertexMask);

// Define a few params we'll need next:
var startYear_Num = 1985;
var endYear_Num = 2019;
var numYears = endYear_Num - startYear_Num;
var startMonth = '-01-01';
var endMonth = '-12-31';

// Extract fitted residual value per year, per pixel and aggregate into an Image with one band per year 
var years = [];
for (var i = startYear_Num; i <= endYear_Num; ++i) years.push(i
    .toString());
var fittedStack = fitted.arrayFlatten([
    ['fittedResidual'], years
]).toFloat();
print(fittedStack, 'fitted stack');

Map.addLayer(fittedStack, {
    bands: ['fittedResidual_1985'],
    min: -0.2,
    max: 0.2,
    palette: ['red', 'white', 'green']
}, 'Fitted Residuals 1985');

// Extract boolean 'Is Vertex?' value per year, per pixel and aggregate into image w/ boolean band per year 
var years = [];
for (var i = startYear_Num; i <= endYear_Num; ++i) years.push(i
    .toString());

var vertexStack = vertexMask.arrayFlatten([
    ['bools'], years
]).toFloat();

print(vertexStack.getInfo(), 'vertex Stack');

// Load an Asset that has the booleans converted to Collection
var booleanColl = ee.ImageCollection(
    'projects/gee-book/assets/A3-8/BooleanCollection');
    
var chartBooleanMean = ui.Chart.image
    .series({
        imageCollection: booleanColl.select('bools'),
        region: aoi,
        reducer: ee.Reducer.mean(),
        scale: 60,
        xProperty: 'system:time_start'
    })
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Naiman Boolean Mean Per Year',
        vAxis: {
            title: 'Boolean Mean Per Year'
        },
        lineWidth: 1
    });

print(chartBooleanMean);

// Plot individual years to see the spatial patterns in the vertices.
var boolParams = {
    // change this for the year you want to view
    bands: 'bools_1997',
    min: 0,
    // no vertex
    max: 1,
    // vertex identified by LT for that year
    palette: ['white', 'red']
};

Map.addLayer(vertexStack, boolParams, 'vertex 1997', false);
// this visualizes all pixels with a vertex in that year.

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// Create training data.
var training = vertexStack.sample({
    region: aoi,
    scale: 60,
    numPixels: 5000
});

var maxclus = 10;

// Instantiate the clusterer and train it.
var trained_clusterer = ee.Clusterer.wekaKMeans(maxclus).train(
    training);

// Cluster the input using the trained clusterer
var cluster_result = vertexStack.cluster(trained_clusterer);

// Remap result_totalChange so that class 0 is class 10 
cluster_result = cluster_result.remap(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [10, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    .toFloat()
    .rename('cluster');
Map.addLayer(cluster_result.randomVisualizer(), {}, maxclus
.toString() + '_clusters');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// GOAL: Find Median Greenness for each cluster per year in the image 
// define a function to add the cluster number band to each Image in the collection
var addClusters = function(img) {
    return img.addBands(cluster_result);
};

// Add the cluster band
var ObvGreen_wClusters = greennessColl.map(addClusters);

//---Select and mask pixels by cluster number
var cluster_num = 1; // change this to the class of interest

// Mask all pixels but the selected cluster number 
// Define a function so we can map it over the entire collection
var maskSelCluster = function(img) {
    var selCluster = img.select('cluster').eq(cluster_num);
    return img.mask(selCluster);
};
// map the function over the entire collection
var selClusterColl = ObvGreen_wClusters.map(maskSelCluster);

// Use the following to visualize the location of the focal class:
Map.addLayer(selClusterColl.select('cluster').first(), {
    palette: 'green'
}, 'Cluster ' + cluster_num.toString());

var chartClusterMedian = ui.Chart.image.seriesByRegion({
        imageCollection: selClusterColl,
        regions: aoi,
        reducer: ee.Reducer.median(),
        band: 'greenness',
        scale: 90,
        xProperty: 'system:time_start',
        seriesProperty: 'label'
    })
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Median Observed Greenness of Cluster ' +
            cluster_num.toString(),
        vAxis: {
            title: 'Median Observed Greenness'
        },
        lineWidth: 1,
        pointSize: 4,
        series: {
            0: {
                color: 'green'
            },
        }
    });

print(chartClusterMedian);

var fittedresidColl = ee.ImageCollection(
    'projects/gee-book/assets/A3-8/FR_Collection');
// add the cluster number band to each (function defined above, just use again here)
var fittedresid_wClusters = fittedresidColl.map(addClusters);

//Mask all pixels but the selected cluster number 
// again, function defined above, just call it here
var selFRClusterColl = fittedresid_wClusters.map(maskSelCluster);

Map.addLayer(selFRClusterColl.select('cluster').first(), {
    palette: ['white', 'blue']
}, 'Cluster ' + cluster_num.toString());

//Chart Median Fitted Residual Values by cluster

var chartClusterMedian = ui.Chart.image.seriesByRegion({
        imageCollection: selFRClusterColl,
        regions: aoi,
        reducer: ee.Reducer.median(),
        band: 'FR',
        scale: 90,
        xProperty: 'system:time_start',
        seriesProperty: 'label'
    }).setChartType('ScatterChart')
    .setOptions({
        title: 'Median Fitted Residual Greenness of Cluster ' +
            cluster_num.toString(),
        vAxis: {
            title: 'Median Residual Greenness'
        },
        lineWidth: 1,
        pointSize: 4,
        series: {
            0: {
                color: 'red'
            },
        }
    });

print(chartClusterMedian);

// Generate a point geometry.
var expt = ee.Geometry.Point(
    [120.52062120781073, 43.10938146169287]);
// Convert to a Feature.
var point = ee.Feature(expt, {});

// Create a time series chart of MODIS Classification:
var chart_LC = ui.Chart.image.seriesByRegion(
        MODIS_LC, point, ee.Reducer.mean(), 'LC_Type1', 30,
        'system:time_start', 'label')
    .setChartType('ScatterChart')
    .setOptions({
        title: 'LC of Selected Pixels',
        vAxis: {
            title: 'MODIS landcover'
        },
        lineWidth: 1,
        pointSize: 4
    });

print(chart_LC);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------