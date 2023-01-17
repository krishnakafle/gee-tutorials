//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.8 Monitoring Gold Mining Activity using SAR
//  Checkpoint:   A18d
//  Authors:      Lucio Villa, Sidney Novoa, Milagros Becerra, 
//                Andréa Puzzi Nicolau, Karen Dyson, Karis Tenneson, John Dilger
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//////////////////////////////////////////////////////
/// Section Two
//////////////////////////////////////////////////////

// Define the area of study.
var aoi = ee.FeatureCollection('projects/gee-book/assets/A1-8/mdd');

// Center the map at the aoi.
Map.centerObject(aoi, 9);

// Create an empty image.
var empty = ee.Image().byte();

// Convert the area of study to an EE image object 
// so we can visualize only the boundary.
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

// Function to mask the SAR images acquired with an incidence angle 
// lower equal than 31 and greater equal than 45 degrees.
function maskAngle(image) {
    var angleMask = image.select('angle');
    return image.updateMask(angleMask.gte(31).and(angleMask.lte(45)));
}

// Function to get the SAR Collection.
function getCollection(dates, roi, orbitPass0) {
    var sarCollFloat = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT')
        .filterBounds(roi)
        .filterDate(dates[0], dates[1])
        .filter(ee.Filter.eq('orbitProperties_pass', orbitPass0));
    return sarCollFloat.map(maskAngle).select(['VV', 'VH']);
}

// Define variables: the period of time and the orbitpass.
var listOfDates = ['2021-01-01', '2022-01-01'];
var orbitPass = 'DESCENDING';

// Apply the function to get the SAR Collection.
var sarImageColl = getCollection(listOfDates, aoi, orbitPass);
print('SAR Image Collection', sarImageColl);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// Function to get dates in 'YYYY-MM-dd' format.
function getDates(dd) {
    return ee.Date(dd).format('YYYY-MM-dd');
}

// Function to get a SAR Mosaic clipped to the study area.
function mosaicSAR(dates1) {
    dates1 = ee.Date(dates1);
    var imageFilt = sarImageColl
        .filterDate(dates1, dates1.advance(1, 'day'));
    return imageFilt.mosaic()
        .clip(aoi)
        .set({
            'system:time_start': dates1.millis(),
            'dateYMD': dates1.format('YYYY-MM-dd')
        });
}

// Function to get a SAR Collection of mosaics by date.
var datesMosaic = ee.List(sarImageColl
        .aggregate_array('system:time_start'))
    .map(getDates)
    .distinct();

// Get a SAR List and Image Collection of mosaics by date.
var getMosaicList = datesMosaic.map(mosaicSAR);
var getMosaicColl = ee.ImageCollection(getMosaicList);
print('get Mosaic Collection', getMosaicColl);

// Visualize results.
var sarVis = {
    bands: ['VV', 'VH', 'VV'],
    min: [-18, -23, 3],
    max: [-4, -11, 15]
};

var image1 = getMosaicColl
    .filter(ee.Filter.eq('dateYMD', '2021-01-04'))
    .first().log10().multiply(10.0);
var image2 = getMosaicColl
    .filter(ee.Filter.eq('dateYMD', '2021-12-18'))
    .first().log10().multiply(10.0);

Map.addLayer(image1, sarVis, 'Sentinel-1 | 2021-01-04');
Map.addLayer(image2, sarVis, 'Sentinel-1 | 2021-12-18');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

//////////////////////////////////////////////////////
/// Section Three
//////////////////////////////////////////////////////
  
// Libraries of SAR Change Detection (version modified).
// The original version can be found in: 
// users/mortcanty/changedetection
var omb = require(
    'projects/gee-edu/book:Part A - Applications/A1 - Human Applications/A1.8 Monitoring Gold Mining Activity Using SAR/modules/omnibusTest_v1.1'
    );
var util = require(
    'projects/gee-edu/book:Part A - Applications/A1 - Human Applications/A1.8 Monitoring Gold Mining Activity Using SAR/modules/utilities_v1.1'
    );

// Count the length of the list of dates of the time-series.
var countDates = datesMosaic.size().getInfo();

// Run the algorithm and print the results.
var significance = 0.0001;
var median = true;
var result = ee.Dictionary(omb.omnibus(getMosaicList, significance,
    median));
print('result', result);

// Change maps generated (cmap, smap, fmap and bmap) 
// are detailed in the next commented lines.

// cmap: the interval in which the most recent significant change occurred (single-band).
// smap: the interval in which the first significant change occurred (single-band).
// fmap: the frequency of significant changes (single-band).
// bmap: the interval in which each significant change occurred ((k − 1)-band).

// Extract and print the images result 
// (cmap, smap, fmap and bmap) from the ee.Dictionary.
var cmap = ee.Image(result.get('cmap')).byte();
var smap = ee.Image(result.get('smap')).byte();
var fmap = ee.Image(result.get('fmap')).byte();
var bmap = ee.Image(result.get('bmap')).byte();

// Build a Feature Collection from Dates.
var fCollectionDates = ee.FeatureCollection(datesMosaic
    .map(function(element) {
        return ee.Feature(null, {
            prop: element
        });
    }));
print('Dates', datesMosaic);

// Visualization parameters.
var jet = ['black', 'blue', 'cyan', 'yellow', 'red'];
var vis = { 
    min: 0,
    max: countDates,
    palette: jet
};

// Add resulting images and legend to the map. 
Map.add(util.makeLegend(vis));
Map.addLayer(cmap, vis, 'cmap - recent change (unfiltered)');
Map.addLayer(smap, vis, 'smap - first change (unfiltered)');
Map.addLayer(fmap.multiply(2), vis, 'fmap*2 - frequency of changes');

//  Export the Feature Collection with the dates of change.
var exportDates = Export.table.toDrive({
    collection: fCollectionDates,
    folder: 'datesChangesDN',
    description: 'dates',
    fileFormat: 'CSV'
});
// Export the image of the first significant changes.
var exportImgChanges = Export.image.toAsset({
    image: smap,
    description: 'smap',
    assetId: 'your_asset_path_here/' + 'smap',
    region: aoi,
    scale: 10,
    maxPixels: 1e13
});

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
