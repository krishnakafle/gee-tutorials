//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60i
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
// Include packages.
var palettes = require('users/gena/packages:palettes');
var text = require('users/gena/packages:text');

var point = /* color: #98ff00 */ ee.Geometry.Point([-
    106.15944300895228, -74.58262940096245
])

var rect = /* color: #d63000 */
    ee.Geometry.Polygon(
        [ 
            [
                [-106.19789515738981, -74.56509549360152],
                [-106.19789515738981, -74.78071448733921],
                [-104.98115931754606, -74.78071448733921],
                [-104.98115931754606, -74.56509549360152]
            ]
        ], null, false);
 
// Lookup the ice palette.
var palette = palettes.cmocean.Ice[7];

// Show it in the console.
palettes.showPalette('Ice', palette);

// Center map on geometry.
Map.centerObject(point, 9);

// Select S1 images for the Thwaites glacier.
var images = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(rect)
    .filterDate('2021-01-01', '2021-03-01')
    .select('HH')
    // Make sure we include only images which fully contain the region geometry.
    .filter(ee.Filter.isContained({
        leftValue: rect,
        rightField: '.geo'
    }))
    .sort('system:time_start');

// Print number of images.
print(images.size());

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Render images.
var vis = {
    palette: palette,
    min: -15,
    max: 1
};

var scale = Map.getScale();
var textProperties = {
    outlineColor: '000000',
    outlineWidth: 3,
    outlineOpacity: 0.6
};

var imagesRgb = images.map(function(i) {
    // Use the date as the label.
    var label = i.date().format('YYYY-MM-dd');
    var labelImage = text.draw(label, point, scale,
        textProperties);

    return i.visualize(vis)
        .blend(labelImage) // Blend label image on top.
        .set({
            label: label
        }); // Keep the text property.
});
Map.addLayer(imagesRgb.first());
Map.addLayer(rect, {color:'blue'}, 'rect', 1, 0.5);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// ==================================
// 1. Animate as a GIF

// Define GIF visualization parameters.
var gifParams = {
    region: rect,
    dimensions: 600,
    crs: 'EPSG:3857',
    framesPerSecond: 10
};

// Print the GIF URL to the console.
print(imagesRgb.getVideoThumbURL(gifParams));

// Render the GIF animation in the console.
print(ui.Thumbnail(imagesRgb, gifParams));

// ==================================
// 2. Export animation as a video file to Google Drive.

Export.video.toDrive({
    collection: imagesRgb,
    description: 'ice-animation',
    fileNamePrefix: 'ice-animation',
    framesPerSecond: 10,
    dimensions: 600,
    region: rect,
    crs: 'EPSG:3857'
});

// ==================================
// 3. Animate multiple images as map layers, 
//    Use image date as labels (layer names).

// include the animation package
var animation = require('users/gena/packages:animation');

// show animation controls
animation.animate(imagesRgb, {
  label: 'label',
  maxFrames: 50
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
