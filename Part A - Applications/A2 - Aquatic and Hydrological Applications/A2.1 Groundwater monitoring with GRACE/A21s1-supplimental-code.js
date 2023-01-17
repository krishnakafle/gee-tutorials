//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.1 Groundwater Monitoring with GRACE
//  Section:      Section 3 (A21s1 - Supplemental)
//  Authors:      A.J. Purdy, J.S. Famiglietti
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// The basins feature is being used to subset GLDAS geographically
// The first 7 lines are set for California. 
// A user will need to adjust the basin to reflect another region
var basins = ee.FeatureCollection('USGS/WBD/2017/HUC04');
// Extract the 3 HUC 04 basins for the Central Valley.
var codes = ['1802', '1803', '1804'];
var basin = basins.filter(ee.Filter.inList('huc4', codes));

// Set start / end year.
var yrStart = 2003;
var yrEnd = 2016;
var years = ee.List.sequence(yrStart, yrEnd);

// The varBand variable is set to evaluated Snow Water Equivalent.
// Need to adjust to export Soil Moisture (SM_inst)
var varBand = 'SWE_inst';

var waterstorage = ee.ImageCollection('NASA/GLDAS/V021/NOAH/G025/T3H')
    .select(varBand)
    .filterDate({
        start: ee.Date.fromYMD(yrStart, 1, 1),
        end: ee.Date.fromYMD(yrEnd, 12, 1)
    });
var waterstorage_mean = waterstorage.select(varBand).mean();
print(waterstorage_mean);

var y = 2003;
var date = ee.Date.fromYMD(y, 1, 1);

var waterstorageIC = ee.Image(ee.ImageCollection(
        'NASA/GLDAS/V021/NOAH/G025/T3H')
    .select(varBand)
    .filter(ee.Filter.calendarRange(y, y, 'year'))
    .mean());
print(waterstorageIC);

var waterstorage_out = ee.Image(waterstorageIC.subtract(
        waterstorage_mean)
    .set('year', y)
    .set('system:time_start', date));
print(waterstorage_out);

// Change the assetId & description below to reflect the variable being exported.
// These should be changed to reflect SM, SWE, Can etc.

Export.image.toAsset({
    image: waterstorage_out,
    description: 'swe2003',
    assetId: 'swe2003',
    region: basin,
    scale: 10000,
    maxPixels: 1e13
});