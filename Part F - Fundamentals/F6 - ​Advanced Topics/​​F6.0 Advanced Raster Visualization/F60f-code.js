//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60f
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
var text = require('users/gena/packages:text');

var geometry = ee.Geometry.Polygon(
    [
        [
            [-109.248, 43.3913],
            [-109.248, 33.2689],
            [-86.5283, 33.2689],
            [-86.5283, 43.3913]
        ]
    ], null, false);

Map.centerObject(geometry, 6);

function annotate(image) {
    // Annotates an image by adding outline border and cloudiness 
    // Cloudiness is shown as a text string rendered at the image center.

    // Add an edge around the image.
    var edge = ee.FeatureCollection([image])
        .style({
            color: 'cccc00cc',
            fillColor: '00000000'
        });

    // Draw cloudiness as text.
    var props = {
        textColor: '0000aa',
        outlineColor: 'ffffff',
        outlineWidth: 2,
        outlineOpacity: 0.6,
        fontSize: 24,
        fontType: 'Consolas'
    };
    var center = image.geometry().centroid(1);
    var str = ee.Number(image.get('CLOUD_COVER')).format('%.2f');
    var scale = Map.getScale();
    var textCloudiness = text.draw(str, center, scale, props);

    // Shift left 25 pixels.
    textCloudiness = textCloudiness
        .translate(-scale * 25, 0, 'meters', 'EPSG:3857');

    // Merge results.
    return ee.ImageCollection([edge, textCloudiness]).mosaic();
}

// Select images.
var images = ee.ImageCollection('LANDSAT/LC08/C02/T1_RT_TOA')
    .select([5, 4, 2])
    .filterBounds(geometry)
    .filterDate('2018-01-01', '2018-01-7');

// dim background.
Map.addLayer(ee.Image(1), {
    palette: ['black']
}, 'black', true, 0.5);

// Show images.
Map.addLayer(images, {
    min: 0.05,
    max: 1,
    gamma: 1.4
}, 'images');

// Show annotations.
var labels = images.map(annotate);
var labelsLayer = ui.Map.Layer(labels, {}, 'annotations');
Map.layers().add(labelsLayer);

// re-render (rescale) annotations when map zoom changes.
Map.onChangeZoom(function(zoom) {
    labelsLayer.setEeObject(images.map(annotate));
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
