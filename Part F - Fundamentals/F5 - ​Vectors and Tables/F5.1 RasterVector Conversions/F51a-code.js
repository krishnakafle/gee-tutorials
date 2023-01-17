//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.1 Raster/Vector Conversions
//  Checkpoint:   F51a
//  Authors:      Keiko Nomura, Samuel Bowers
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//-------------//
// Section 1.1 //
//-------------//

// Load raster (elevation) and vector (colombia) datasets.
var elevation = ee.Image('USGS/GMTED2010').rename('elevation');
var colombia = ee.FeatureCollection(
        'FAO/GAUL_SIMPLIFIED_500m/2015/level0')
    .filter(ee.Filter.equals('ADM0_NAME', 'Colombia'));

// Display elevation image.
Map.centerObject(colombia, 7);
Map.addLayer(elevation, {
    min: 0,
    max: 4000
}, 'Elevation');

// Initialize image with zeros and define elevation zones.
var zones = ee.Image(0)
    .where(elevation.gt(100), 1)
    .where(elevation.gt(200), 2)
    .where(elevation.gt(500), 3);

// Mask pixels below sea level (<= 0 m) to retain only land areas.
// Name the band with values 0-3 as 'zone'.
zones = zones.updateMask(elevation.gt(0)).rename('zone');

Map.addLayer(zones, {
    min: 0,
    max: 3,
    palette: ['white', 'yellow', 'lime', 'green'],
    opacity: 0.7
}, 'Elevation zones');

var projection = elevation.projection();
var scale = elevation.projection().nominalScale();

var elevationVector = zones.reduceToVectors({
    geometry: colombia.geometry(),
    crs: projection,
    scale: 1000, // scale
    geometryType: 'polygon',
    eightConnected: false,
    labelProperty: 'zone',
    bestEffort: true,
    maxPixels: 1e13,
    tileScale: 3 // In case of error.
});

print(elevationVector.limit(10));

var elevationDrawn = elevationVector.draw({
    color: 'black',
    strokeWidth: 1
});
Map.addLayer(elevationDrawn, {}, 'Elevation zone polygon');

var zonesSmooth = zones.focalMode(4, 'square');

zonesSmooth = zonesSmooth.reproject(projection.atScale(scale));

Map.addLayer(zonesSmooth, {
    min: 1,
    max: 3,
    palette: ['yellow', 'lime', 'green'],
    opacity: 0.7
}, 'Elevation zones (smooth)');

var elevationVectorSmooth = zonesSmooth.reduceToVectors({
    geometry: colombia.geometry(),
    crs: projection,
    scale: scale,
    geometryType: 'polygon',
    eightConnected: false,
    labelProperty: 'zone',
    bestEffort: true,
    maxPixels: 1e13,
    tileScale: 3
});

var smoothDrawn = elevationVectorSmooth.draw({
    color: 'black',
    strokeWidth: 1
});
Map.addLayer(smoothDrawn, {}, 'Elevation zone polygon (smooth)');

//-------------//
// Section 1.2 //
//-------------//

var geometry = ee.Geometry.Polygon([
    [-89.553, -0.929],
    [-89.436, -0.929],
    [-89.436, -0.866],
    [-89.553, -0.866],
    [-89.553, -0.929]
]);

// To zoom into the area, un-comment and run below
// Map.centerObject(geometry,12);
Map.addLayer(geometry, {}, 'Areas to extract points');

var elevationSamples = elevation.sample({
    region: geometry,
    projection: projection,
    scale: scale,
    geometries: true,
});

Map.addLayer(elevationSamples, {}, 'Points extracted');

// Add three properties to the output table: 
// 'Elevation', 'Longitude', and 'Latitude'.
elevationSamples = elevationSamples.map(function(feature) {
    var geom = feature.geometry().coordinates();
    return ee.Feature(null, {
        'Elevation': ee.Number(feature.get(
            'elevation')),
        'Long': ee.Number(geom.get(0)),
        'Lat': ee.Number(geom.get(1))
    });
});

// Export as CSV.
Export.table.toDrive({
    collection: elevationSamples,
    description: 'extracted_points',
    fileFormat: 'CSV'
});

var elevationSamplesStratified = zones.stratifiedSample({
    numPoints: 10,
    classBand: 'zone',
    region: geometry,
    scale: scale,
    projection: projection,
    geometries: true
});

Map.addLayer(elevationSamplesStratified, {}, 'Stratified samples');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
