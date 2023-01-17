//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.1 Groundwater Monitoring with GRACE
//  Checkpoint:   A21a
//  Authors:      A.J. Purdy, J.S. Famiglietti
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import Basins.
var basins = ee.FeatureCollection('USGS/WBD/2017/HUC04');

// Extract the 3 HUC 04 basins for the Central Valley.
var codes = ['1802', '1803', '1804'];
var basin = basins.filter(ee.Filter.inList('huc4', codes));

// Add the basin to the map to show the extent of our analysis.
Map.centerObject(basin, 6);
Map.addLayer(basin, {
    color: 'green'
}, 'Central Valley Basins', true, 0.5);

var landcover = ee.ImageCollection('USDA/NASS/CDL')
    .filter(ee.Filter.date('2019-01-01', '2019-12-31'))
    .select('cultivated');

Map.addLayer(landcover.first().clip(basin), {}, 'Cropland', true,
    0.5);

// This table was generated using the index from the CDEC website
var res = ee.FeatureCollection(
    'projects/gee-book/assets/A2-1/ca_reservoirs_index');
// Filter reservoir locations by the Central Valley geometry
var res_cv = res.filterBounds(basin);
Map.addLayer(res_cv, {
    'color': 'blue'
}, 'Reservoirs');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------