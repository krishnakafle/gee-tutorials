//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.0 Filter, Map, Reduce
//  Checkpoint:   F40b
//  Author:       Jeff Cardille
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var imgCol = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
// How many Tier 1 Landsat 5 images have ever been collected? 
print("All images ever: ", imgCol.size()); // A very large number

// How many images were collected in the 2000s?
var startDate = '2000-01-01';
var endDate = '2010-01-01';

var imgColfilteredByDate = imgCol.filterDate(startDate, endDate);
print("All images 2000-2010: ", imgColfilteredByDate.size());
// A smaller (but still large) number

var ShanghaiImage = ee.Image(
    'LANDSAT/LT05/C02/T1_L2/LT05_118038_20000606');
Map.centerObject(ShanghaiImage, 9);

var imgColfilteredByDateHere = imgColfilteredByDate.filterBounds(Map
    .getCenter());
print("All images here, 2000-2010: ", imgColfilteredByDateHere
.size()); // A smaller number

var L5FilteredLowCloudImages = imgColfilteredByDateHere
    .filterMetadata('CLOUD_COVER', 'less_than', 50);
print("Less than 50% clouds in this area, 2000-2010", 
    L5FilteredLowCloudImages.size()); // A smaller number
    
var chainedFilteredSet = imgCol.filterDate(startDate, endDate)
    .filterBounds(Map.getCenter())
    .filterMetadata('CLOUD_COVER', 'less_than', 50);
print('Chained: Less than 50% clouds in this area, 2000-2010',
    chainedFilteredSet.size());
    
var efficientFilteredSet = imgCol.filterBounds(Map.getCenter())
    .filterDate(startDate, endDate)
    .filterMetadata('CLOUD_COVER', 'less_than', 50);
print('Efficient filtering: Less than 50% clouds in this area, 2000-2010',
    efficientFilteredSet.size());
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
 
var makeLandsat5EVI = function(oneL5Image) {
    // compute the EVI for any Landsat 5 image. Note it's specific to 
    // Landsat 5 images due to the band numbers. Don't run this exact 
    // function for images from sensors other than Landsat 5.

    // Extract the bands and divide by 1e4 to account for scaling done.
    var nirScaled = oneL5Image.select('SR_B4').divide(10000);
    var redScaled = oneL5Image.select('SR_B3').divide(10000);
    var blueScaled = oneL5Image.select('SR_B1').divide(10000);

    // Calculate the numerator, note that order goes from left to right.
    var numeratorEVI = (nirScaled.subtract(redScaled)).multiply(
        2.5);

    // Calculate the denominator
    var denomClause1 = redScaled.multiply(6);
    var denomClause2 = blueScaled.multiply(7.5);
    var denominatorEVI = nirScaled.add(denomClause1).subtract(
        denomClause2).add(1);

    // Calculate EVI and name it.
    var landsat5EVI = numeratorEVI.divide(denominatorEVI).rename(
        'EVI');
    return (landsat5EVI);
};

var L5EVIimages = efficientFilteredSet.map(makeLandsat5EVI);
print('Verifying that the .map gives back the same number of images: ',
    L5EVIimages.size());
print(L5EVIimages);

Map.addLayer(L5EVIimages, {}, 'L5EVIimages', 1, 1);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
