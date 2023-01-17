//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.8 Monitoring Gold Mining Activity using SAR
//  Checkpoint:   A18c
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