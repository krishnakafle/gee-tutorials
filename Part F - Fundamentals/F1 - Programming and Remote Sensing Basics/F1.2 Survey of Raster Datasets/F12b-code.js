//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.2 Survey of Raster Datasets
//  Checkpoint:   F12b
//  Authors:      Andréa, Karen, Nick Clinton, David Saah
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


/////
// View an Image Collection
/////

// Import the Landsat 8 Raw Collection.
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1');

// Print the size of the Landsat 8 dataset.
print('The size of the Landsat 8 image collection is:', landsat8
.size());

// Try to print the image collection.
// WARNING! Running the print code immediately below produces an error because 
// the Console can not print more than 5000 elements.
// print(landsat8);

// Add the Landsat 8 dataset to the map as a mosaic. The collection is 
// already chronologically sorted, so the most recent pixel is displayed.
// Map.addLayer(landsat8,
//     {
//         bands: ['B4', 'B3', 'B2'],
//         min: 5000,
//         max: 15000
//     },
//     'Landsat 8 Image Collection');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

/////
// Filter an Image Collection
/////

// Filter the collection by date.
var landsatWinter = landsat8.filterDate('2020-12-01', '2021-03-01');

Map.addLayer(landsatWinter,
    {
        bands: ['B4', 'B3', 'B2'],
        min: 5000,
        max: 15000
    },
    'Winter Landsat 8');

print('The size of the Winter Landsat 8 image collection is:',
    landsatWinter.size());

// Create an Earth Engine Point object.
var pointMN = ee.Geometry.Point([-93.79, 45.05]);

// Filter the collection by location using the point.
var landsatMN = landsatWinter.filterBounds(pointMN);
Map.addLayer(landsatMN,
    {
        bands: ['B4', 'B3', 'B2'],
        min: 5000,
        max: 15000
    },
    'MN Landsat 8');

// Add the point to the map to see where it is.
Map.addLayer(pointMN, {}, 'Point MN');

print('The size of the Minneapolis Winter Landsat 8 image collection is: ', 
      landsatMN.size());

// Select the first image in the filtered collection.
var landsatFirst = landsatMN.first();

// Display the first image in the filtered collection.
Map.centerObject(landsatFirst, 7);
Map.addLayer(landsatFirst,
    {
        bands: ['B4', 'B3', 'B2'],
        min: 5000,
        max: 15000
    },
    'First Landsat 8');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
