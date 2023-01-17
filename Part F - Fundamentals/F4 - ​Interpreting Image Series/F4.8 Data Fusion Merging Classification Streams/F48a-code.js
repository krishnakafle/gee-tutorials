//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.8 Data Fusion: Merging Classification Streams
//  Checkpoint:   F48a
//  Authors:      Jeff Cardille, Rylan Boothman, Mary Villamor, Elijah Perez,
//                Eidan Willis, Flavie Pelletier
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var events = ee.ImageCollection(
    'projects/gee-book/assets/F4-8/cleanEvents');
print(events, 'List of Events');
print('Number of events:', events.size());

print(ui.Thumbnail(events, {
    min: 0,
    max: 3,
    palette: ['black', 'green', 'blue', 'yellow'],
    framesPerSecond: 1,
    dimensions: 1000
}));

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
