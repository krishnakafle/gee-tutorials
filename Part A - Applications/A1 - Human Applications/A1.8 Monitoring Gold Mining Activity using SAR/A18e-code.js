//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.6 Monitoring Gold Mining Activity using SAR
//  Checkpoint:   A16e
//  Authors:      Lucio Villa, Sidney Novoa, Milagros Becerra, 
//                Andréa Puzzi Nicolau, Karen Dyson, Karis Tenneson, John Dilger
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//////////////////////////////////////////////////////
/// Section Four
//////////////////////////////////////////////////////

// Define the area of study.
var aoi = ee.FeatureCollection('projects/gee-book/assets/A1-8/mdd');

// Center the map.
Map.centerObject(aoi, 10);

// Create an empty image.
var empty = ee.Image().byte();

// Convert the area of study to an EE image object so we can visualize
// only the boundary.
var aoiOutline = empty.paint({
    featureCollection: aoi,
    color: 1,
    width: 2
});

// Select the satellite basemap view.
Map.setOptions('SATELLITE');

// Add the area of study boundary to the map.
Map.addLayer(aoiOutline, {
    palette: 'red'
}, 'Area of Study');

// Import the smap result from section 3.
var changeDetect = ee.Image('projects/gee-book/assets/A1-8/smap');

// Visualization parameters.
var countDates = 30;
var jet = ['black', 'blue', 'cyan', 'yellow', 'red'];
var vis = {
    min: 0,
    max: countDates,
    palette: jet
};

// Add results to the map.
Map.addLayer(changeDetect, vis, 'Change Map Unfiltered');

// Digital Elevation Model SRTM.
// https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003
var srtm = ee.Image('USGS/SRTMGL1_003').clip(aoi);
var slope = ee.Terrain.slope(srtm);
var srtmVis = {
    min: 0,
    max: 1000,
    palette: ['black', 'blue', 'cyan', 'yellow', 'red']
};
Map.addLayer(srtm, srtmVis, 'SRTM Elevation');
var slopeVis = {
    min: 0,
    max: 15,
    palette: ['black', 'blue', 'cyan', 'yellow', 'red']
};
Map.addLayer(slope, slopeVis, 'SRTM Slope');

// Hansen Global Forest Change v1.8 (2000-2020)
// https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8
var gfc = ee.Image('UMD/hansen/global_forest_change_2020_v1_8').clip(
    aoi);
var forest2020 = gfc.select('treecover2000')
    .gt(0)
    .updateMask(gfc.select('loss')
        .neq(1))
    .selfMask();
Map.addLayer(forest2020,
    {
        min: 0,
        max: 1,
        palette: ['black', 'green']
    },
    'Forest cover 2020');

// JRC Yearly Water Classification History, v1.3 (Updated until Dec 2020).
// https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_3_GlobalSurfaceWater
var waterJRC = ee.Image('JRC/GSW1_3/GlobalSurfaceWater').select(
    'max_extent');
var waterVis = {
    min: 0,
    max: 1,
    palette: ['blue', 'black']
};
Map.addLayer(waterJRC.eq(0), waterVis, 'Water Bodies until 2020');

// Apply filters through masks.
var alertsFiltered = changeDetect
    .updateMask(srtm.lt(1000))
    .updateMask(slope.lt(15))
    .updateMask(forest2020.eq(1))
    .updateMask(waterJRC.eq(0))
    .selfMask();

// Add filtered results to the map.
Map.addLayer(alertsFiltered,
    {
        min: 0,
        max: countDates,
        palette: jet
    },
    'Change Map Filtered',
    1);

// Function to filter small patches and isolated pixels.
function filterMinPatchs(alerts0, minArea0, maxSize0) {
    var pixelCount = alerts0.gt(0).connectedPixelCount(maxSize0);
    var minPixelCount = ee.Image(minArea0).divide(ee.Image
    .pixelArea());
    return alerts0.updateMask(pixelCount.gte(minPixelCount));
}

// Apply the function and visualize the filtered results.
var alertsFiltMinPatchs = filterMinPatchs(alertsFiltered, 10000, 200);

Map.addLayer(alertsFiltMinPatchs, vis,
    'Alerts Filtered - Minimum Patches');

// Export filtered results to the Drive.
Export.image.toDrive({
    image: alertsFiltMinPatchs,
    description: 'alertsFiltered',
    folder: 'alertsFiltered',
    region: aoi,
    scale: 10,
});

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
