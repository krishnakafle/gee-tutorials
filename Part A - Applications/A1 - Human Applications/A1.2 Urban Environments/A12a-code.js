//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.2 Urban Environments
//  Checkpoint:   A12a
//  Authors:      Michelle Stuhlmacher and Ran Goldblatt
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Map.centerObject(geometry);

// Filter collection.
var collection = L8
    .filterBounds(geometry)
    .filterDate('2010-01-01', '2020-12-31')
    .filter(ee.Filter.lte('CLOUD_COVER_LAND', 3));

// Define GIF visualization arguments.
var gifParams = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.07 * 65536,
    max: 0.3 * 65536,
    region: geometry,
    framesPerSecond: 15,
    format: 'gif'
};

// Render the GIF animation in the console.
print(ui.Thumbnail(collection, gifParams));

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------