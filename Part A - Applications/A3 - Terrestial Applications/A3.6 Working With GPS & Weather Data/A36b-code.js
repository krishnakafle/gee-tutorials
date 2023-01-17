//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.6 Working With GPS and Weather Data
//  Checkpoint:   A36b
//  Authors:      Peder Engelstad, Daniel Carver, Nicholas E. Young
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import the data and add it to the map and print.
var cougarF53 = ee.FeatureCollection(
    'projects/gee-book/assets/A3-6/cougarF53');

Map.centerObject(cougarF53, 10);

Map.addLayer(cougarF53, {}, 'cougar presence data');

print(cougarF53, 'cougar data');

// Call in image collection and filter.
var Daymet = ee.ImageCollection('NASA/ORNL/DAYMET_V4')
    .filterDate('2014-02-11', '2014-11-02')
    .filterBounds(geometry)
    .map(function(image) {
        return image.clip(geometry);
    });

print(Daymet, 'Daymet');

// Convert to a multiband image.
var DaymetImage = Daymet.toBands();

print(DaymetImage, 'DaymetImage');

// Call the sample regions function.
var samples = DaymetImage.sampleRegions({
    collection: cougarF53,
    properties: ['id'],
    scale: 1000
});

print(samples, 'samples');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// Export value added data to your Google Drive.
Export.table.toDrive({
    collection: samples,
    description: 'cougarDaymetToDriveExample',
    fileFormat: 'csv'
});

// Apply a median reducer to the dataset.
var daymet1 = Daymet
    .median()
    .clip(geometry);

print(daymet1);

// Export the image to drive.
Export.image.toDrive({
    image: daymet1,
    description: 'MedianValueForStudyArea',
    scale: 1000,
    region: geometry,
    maxPixels: 1e9
});

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------