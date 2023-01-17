//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.1 Raster/Vector Conversions
//  Checkpoint:   F51b
//  Authors:      Keiko Nomura, Samuel Bowers
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//-------------//
// Section 1.3 //
//-------------//

// Read input data.
// Note: these datasets are periodically updated.
// Consider searching the Data Catalog for newer versions.
var gfc = ee.Image('UMD/hansen/global_forest_change_2020_v1_8');
var wdpa = ee.FeatureCollection('WCMC/WDPA/current/polygons');

// Print assets to show available layers and properties.
print(gfc);
print(wdpa.limit(10)); // Show first 10 records.


// Display deforestation.
var deforestation = gfc.select('lossyear');

Map.addLayer(deforestation, {
    min: 1,
    max: 20,
    palette: ['yellow', 'orange', 'red']
}, 'Deforestation raster');

// Display WDPA data.
var protectedArea = wdpa.filter(ee.Filter.equals('NAME', 'La Paya'));

// Display protected area as an outline (see F5.3 for paint()).
var protectedAreaOutline = ee.Image().byte().paint({
    featureCollection: protectedArea,
    color: 1,
    width: 3
});

Map.addLayer(protectedAreaOutline, {
    palette: 'white'
}, 'Protected area');

// Set up map display.
Map.centerObject(protectedArea);
Map.setOptions('SATELLITE');

// Convert from a deforestation raster to vector.
var deforestationVector = deforestation.reduceToVectors({
    scale: deforestation.projection().nominalScale(),
    geometry: protectedArea.geometry(),
    labelProperty: 'lossyear', // Label polygons with a change year.
    maxPixels: 1e13
});

// Count the number of individual change events
print('Number of change events:', deforestationVector.size());

// Display deforestation polygons. Color outline by change year.
var deforestationVectorOutline = ee.Image().byte().paint({
    featureCollection: deforestationVector,
    color: 'lossyear',
    width: 1
});

Map.addLayer(deforestationVectorOutline, {
    palette: ['yellow', 'orange', 'red'],
    min: 1,
    max: 20
}, 'Deforestation vector');

var chart = ui.Chart.feature
    .histogram({
        features: deforestationVector,
        property: 'lossyear'
    })
    .setOptions({
        hAxis: {
            title: 'Year'
        },
        vAxis: {
            title: 'Number of deforestation events'
        },
        legend: {
            position: 'none'
        }
    });

print(chart);

// Generate deforestation point locations.
var deforestationCentroids = deforestationVector.map(function(feat) {
    return feat.centroid();
});

Map.addLayer(deforestationCentroids, {
    color: 'darkblue'
}, 'Deforestation centroids');

// Add a new property to the deforestation FeatureCollection 
// describing the area of the change polygon.
deforestationVector = deforestationVector.map(function(feat) {
    return feat.set('area', feat.geometry().area({
        maxError: 10
    }).divide(10000)); // Convert m^2 to hectare.
});

// Filter the deforestation FeatureCollection for only large-scale (>10 ha) changes
var deforestationLarge = deforestationVector.filter(ee.Filter.gt(
    'area', 10));

// Display deforestation area outline by year.
var deforestationLargeOutline = ee.Image().byte().paint({
    featureCollection: deforestationLarge,
    color: 'lossyear',
    width: 1
});

Map.addLayer(deforestationLargeOutline, {
    palette: ['yellow', 'orange', 'red'],
    min: 1,
    max: 20
}, 'Deforestation (>10 ha)');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
