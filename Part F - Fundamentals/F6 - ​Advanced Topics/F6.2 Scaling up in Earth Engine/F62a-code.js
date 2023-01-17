//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.2 Scaling Up in Earth Engine
//  Checkpoint:   F62a
//  Authors:      Jillian M. Deines, Stefania Di Tommaso, Nicholas Clinton, Noel Gorelick    
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Load county dataset.
// Filter counties in Indiana, Illinois, and Iowa by state FIPS code.
// Select only the unique ID column for simplicity.
var countiesAll = ee.FeatureCollection('TIGER/2018/Counties');
var states = ['17', '18', '19'];
var uniqueID = 'GEOID';
var featColl = countiesAll.filter(ee.Filter.inList('STATEFP', states))
    .select(uniqueID);

print(featColl.size());
print(featColl.limit(1));

// Visualize target features (create Figure F6.2.1).
Map.centerObject(featColl, 5);
Map.addLayer(featColl);

// specify years of interest
var startYear = 2020;
var endYear = 2020;

// climate dataset info
var imageCollectionName = 'IDAHO_EPSCOR/GRIDMET';
var bandsWanted = ['pr', 'tmmn', 'tmmx'];
var scale = 4000;

// Load and format climate data.
var startDate = startYear + '-01-01';

var endYear_adj = endYear + 1;
var endDate = endYear_adj + '-01-01';

var imageCollection = ee.ImageCollection(imageCollectionName)
    .select(bandsWanted)
    .filterBounds(featColl)
    .filterDate(startDate, endDate);
    
// get values at features
var sampledFeatures = imageCollection.map(function(image) {
    return image.reduceRegions({
            collection: featColl,
            reducer: ee.Reducer.mean(),
            scale: scale
        }).filter(ee.Filter.notNull(
        bandsWanted)) // drop rows with no data
        .map(function(f) { // add date property 
            var time_start = image.get(
                'system:time_start');
            var dte = ee.Date(time_start).format(
                'YYYYMMdd');
            return f.set('date_ymd', dte);
        });
}).flatten();

print(sampledFeatures.limit(1));

// export info
var exportFolder = 'GEE_scalingUp';
var filename = 'Gridmet_counties_IN_IL_IA_' + scale + 'm_' +
    startYear + '-' + endYear;

// prepare export: specify properties/columns to include
var columnsWanted = [uniqueID].concat(['date_ymd'], bandsWanted);
print(columnsWanted);

Export.table.toDrive({
    collection: sampledFeatures,
    description: filename,
    folder: exportFolder,
    fileFormat: 'CSV',
    selectors: columnsWanted
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------



