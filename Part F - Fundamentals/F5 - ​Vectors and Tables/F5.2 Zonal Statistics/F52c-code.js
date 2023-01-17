//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.2 Zonal Statistics
//  Checkpoint:   F52c
//  Authors:      Sara Winsemius and Justin Braaten
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Copy properties to computed images

// Define a Landsat image.
var img = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').first();

// Print its properties.
print('All image properties', img.propertyNames());

// Subset the reflectance bands and unscale them.
var computedImg = img.select('SR_B.').multiply(0.0000275).add(-0.2);

// Print the unscaled image's properties.
print('Lost original image properties', computedImg.propertyNames());

// Subset the reflectance bands and unscale them, keeping selected
// source properties.
var computedImg = img.select('SR_B.').multiply(0.0000275).add(-0.2)
    .copyProperties(img, ['system:time_start', 'LANDSAT_PRODUCT_ID']);

// Print the unscaled image's properties.
print('Selected image properties retained', computedImg
.propertyNames());

// Understanding which pixels are included in polygon statistics

// Define polygon geometry.
var geometry = ee.Geometry.Polygon(
    [
        [
            [-118.6019835717645, 37.079867782687884],
            [-118.6019835717645, 37.07838698844939],
            [-118.60036351751951, 37.07838698844939],
            [-118.60036351751951, 37.079867782687884]
        ]
    ], null, false);

// Import the MERIT global elevation dataset.
var elev = ee.Image('MERIT/DEM/v1_0_3');

// Define desired scale and crs for region reduction (for image display too).
var proj = {
    scale: 90,
    crs: 'EPSG:5070'
};

// A count reducer will return how many pixel centers are overlapped by the
// polygon region.
var count = elev.select(0).reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: geometry,
    scale: proj.scale,
    crs: proj.crs
});
print('n pixels in the reduction', count.get('dem'));

// Make a feature collection of pixel center points for those that are
// included in the reduction.
var pixels = ee.Image.pixelLonLat().reduceRegion({
    reducer: ee.Reducer.toCollection(['lon', 'lat']),
    geometry: geometry,
    scale: proj.scale,
    crs: proj.crs
});
var pixelsFc = ee.FeatureCollection(pixels.get('features')).map(
    function(f) {
        return f.setGeometry(ee.Geometry.Point([f.get('lon'), f
            .get('lat')
        ]));
    });

// Display layers on the map.
Map.centerObject(geometry, 18);
Map.addLayer(
    elev.reproject({
        crs: proj.crs,
        scale: proj.scale
    }),
    {
        min: 2500,
        max: 3000,
        palette: ['blue', 'white', 'red']
    }, 'Image');
Map.addLayer(geometry, {
    color: 'white'
}, 'Geometry');
Map.addLayer(pixelsFc, {
    color: 'purple'
}, 'Pixels in reduction');



//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------




