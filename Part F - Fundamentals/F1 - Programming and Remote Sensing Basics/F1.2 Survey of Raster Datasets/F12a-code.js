//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.2 Survey of Raster Datasets
//  Checkpoint:   F12a
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
print(landsat8);

// Add the Landsat 8 dataset to the Map as a mosaic. The collection is 
// already chronologically sorted, so the most recent pixel is displayed.
Map.addLayer(landsat8,
    {
        bands: ['B4', 'B3', 'B2'],
        min: 5000,
        max: 15000
    },
    'Landsat 8 Image Collection');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


