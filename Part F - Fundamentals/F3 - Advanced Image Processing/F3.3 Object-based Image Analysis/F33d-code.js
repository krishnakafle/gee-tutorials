//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.3 Object-Based Image Analysis
//  Checkpoint:   F33d
//  Authors:      Morgan A. Crowley, Jeffrey Cardille, Noel Gorelick
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
// 1.1 Unsupervised k-Means classification

// This function does unsupervised clustering classification 
// input = any image. All bands will be used for clustering.
// numberOfUnsupervisedClusters = tunable parameter for how 
//        many clusters to create.
var afn_Kmeans = function(input, numberOfUnsupervisedClusters,
    defaultStudyArea, nativeScaleOfImage) {

    // Make a new sample set on the input. Here the sample set is 
    // randomly selected spatially. 
    var training = input.sample({
        region: defaultStudyArea,
        scale: nativeScaleOfImage,
        numPixels: 1000
    });

    var cluster = ee.Clusterer.wekaKMeans(
            numberOfUnsupervisedClusters)
        .train(training);

    // Now apply that clusterer to the raw image that was also passed in. 
    var toexport = input.cluster(cluster);

    // The first item is the unsupervised classification. Name the band.
    var clusterUnsup = toexport.select(0).rename(
        'unsupervisedClass');
    return (clusterUnsup);
};

// 1.2 Simple normalization by maxes function.
var afn_normalize_by_maxes = function(img, bandMaxes) {
    return img.divide(bandMaxes);
};

// 1.3 Seed Creation and SNIC segmentation Function
var afn_SNIC = function(imageOriginal, SuperPixelSize, Compactness,
    Connectivity, NeighborhoodSize, SeedShape) {
    var theSeeds = ee.Algorithms.Image.Segmentation.seedGrid(
        SuperPixelSize, SeedShape);
    var snic2 = ee.Algorithms.Image.Segmentation.SNIC({
        image: imageOriginal,
        size: SuperPixelSize,
        compactness: Compactness,
        connectivity: Connectivity,
        neighborhoodSize: NeighborhoodSize,
        seeds: theSeeds
    });
    var theStack = snic2.addBands(theSeeds);
    return (theStack);
};

// 1.4 Simple add mean to Band Name function
var afn_addMeanToBandName = (function(i) {
    return i + '_mean';
});
 
////////////////////////////////////////////////////////////
// 2. Parameters to function calls
////////////////////////////////////////////////////////////
 
// 2.1. Unsupervised KMeans Classification Parameters
var numberOfUnsupervisedClusters = 4;

////////////////////////////////////////////////////////////
// 2.2. Visualization and Saving parameters
// For different images, you might want to change the min and max 
// values to stretch. Useful for images 2 and 3, the normalized images.
var centerObjectYN = true;

// 2.3 Object-growing parameters to change
// Adjustable Superpixel Seed and SNIC segmentation Parameters:
// The superpixel seed location spacing, in pixels.
var SNIC_SuperPixelSize = 16;
// Larger values cause clusters to be more compact (square/hexagonal). 
// Setting this to 0 disables spatial distance weighting.
var SNIC_Compactness = 0;
// Connectivity. Either 4 or 8. 
var SNIC_Connectivity = 4;
// Either 'square' or 'hex'.
var SNIC_SeedShape = 'square';

// 2.4 Parameters that can stay unchanged
// Tile neighborhood size (to avoid tile boundary artifacts). Defaults to 2 * size.
var SNIC_NeighborhoodSize = 2 * SNIC_SuperPixelSize;

//////////////////////////////////////////////////////////
// 3. Statements
//////////////////////////////////////////////////////////

// 3.1  Selecting Image to Classify 
var whichImage = 1; // will be used to select among images
if (whichImage == 1) {
    // Image 1. 
    // Puget Sound, WA: Forest Harvest
    // (April 21, 2016)
    // Harvested Parcels
    // Clear Parcel Boundaries
    // Sentinel 2, 10m
    var whichCollection = 'COPERNICUS/S2';
    var ImageToUseID = '20160421T191704_20160421T212107_T10TDT';
    var originalImage = ee.Image(whichCollection + '/' +
    ImageToUseID);
    print(ImageToUseID, originalImage);
    var nativeScaleOfImage = 10;
    // var threeBandsToDraw = ['B4', 'B3', 'B2'];
    var threeBandsToDraw = ['B8', 'B11', 'B12'];
    // var bandsToUse = ['B4', 'B3', 'B2'];
    var bandsToUse = ['B8', 'B11', 'B12'];
    var bandMaxes = [1e4, 1e4, 1e4];
    var drawMin = 0;
    var drawMax = 0.3;
    var defaultStudyArea = ee.Geometry.Polygon(
        [
            [
                [-123.13105468749993, 47.612974066532004],
                [-123.13105468749993, 47.56214700543596],
                [-123.00179367065422, 47.56214700543596],
                [-123.00179367065422, 47.612974066532004]
            ]
        ]);
    var zoomArea = ee.Geometry.Polygon(
        [
            [
                [-123.13105468749993, 47.612974066532004],
                [-123.13105468749993, 47.56214700543596],
                [-123.00179367065422, 47.56214700543596],
                [-123.00179367065422, 47.612974066532004]
            ]
        ], null, false);
}
Map.addLayer(originalImage.select(threeBandsToDraw), {
    min: 0,
    max: 2000
}, '3.1 ' + ImageToUseID, true, 1);


////////////////////////////////////////////////////////////
// 4. Image Preprocessing 
////////////////////////////////////////////////////////////
var clippedImageSelectedBands = originalImage.clip(defaultStudyArea)
    .select(bandsToUse);
var ImageToUse = afn_normalize_by_maxes(clippedImageSelectedBands,
    bandMaxes);

Map.addLayer(ImageToUse.select(threeBandsToDraw), {
        min: 0.028,
        max: 0.12
    },
    '4.3 Pre-normalized image', true, 0);
   
////////////////////////////////////////////////////////////
// 5. SNIC Clustering
////////////////////////////////////////////////////////////

// This function returns a multi-banded image that has had SNIC
// applied to it. It automatically determine the new names 
// of the bands that will be returned from the segmentation.
print('5.1 Execute SNIC');
var SNIC_MultiBandedResults = afn_SNIC(
    ImageToUse,
    SNIC_SuperPixelSize,
    SNIC_Compactness,
    SNIC_Connectivity,
    SNIC_NeighborhoodSize,
    SNIC_SeedShape
);

var SNIC_MultiBandedResults = SNIC_MultiBandedResults
    .reproject('EPSG:3857', null, nativeScaleOfImage);
print('5.2 SNIC Multi-Banded Results', SNIC_MultiBandedResults);

Map.addLayer(SNIC_MultiBandedResults.select('clusters')
    .randomVisualizer(), {}, '5.3 SNIC Segment Clusters', true, 1);

var theSeeds = SNIC_MultiBandedResults.select('seeds');
Map.addLayer(theSeeds, {
    palette: 'red'
}, '5.4 Seed points of clusters', true, 1);

var bandMeansToDraw = threeBandsToDraw.map(afn_addMeanToBandName);
print('5.5 band means to draw', bandMeansToDraw);
var clusterMeans = SNIC_MultiBandedResults.select(bandMeansToDraw);
print('5.6 Cluster Means by Band', clusterMeans);
Map.addLayer(clusterMeans, {
    min: drawMin,
    max: drawMax
}, '5.7 Image repainted by segments', true, 0);



////////////////////////////////////////////////////////////
// 6. Execute Classifications
////////////////////////////////////////////////////////////

// 6.1 Per Pixel Unsupervised Classification for Comparison
var PerPixelUnsupervised = afn_Kmeans(ImageToUse,
    numberOfUnsupervisedClusters, defaultStudyArea,
    nativeScaleOfImage);
Map.addLayer(PerPixelUnsupervised.select('unsupervisedClass')
    .randomVisualizer(), {}, '6.1 Per-Pixel Unsupervised', true, 0
);
print('6.1b Per-Pixel Unsupervised Results:', PerPixelUnsupervised);

// 6.2 SNIC Unsupervised Classification for Comparison
var bandMeansNames = bandsToUse.map(afn_addMeanToBandName);
print('6.2 band mean names returned by segmentation', bandMeansNames);
var meanSegments = SNIC_MultiBandedResults.select(bandMeansNames);
var SegmentUnsupervised = afn_Kmeans(meanSegments,
    numberOfUnsupervisedClusters, defaultStudyArea,
    nativeScaleOfImage);
Map.addLayer(SegmentUnsupervised.randomVisualizer(), {},
    '6.3 SNIC Clusters Unsupervised', true, 0);
print('6.3b Per-Segment Unsupervised Results:', SegmentUnsupervised);
////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////
// 7. Zoom if requested
////////////////////////////////////////////////////////////
if (centerObjectYN === true) {
    Map.centerObject(zoomArea, 14);
}

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
