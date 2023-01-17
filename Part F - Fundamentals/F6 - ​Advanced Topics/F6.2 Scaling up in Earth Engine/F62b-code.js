//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.2 Scaling Up in Earth Engine
//  Checkpoint:   F62b
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
Map.addLayer(featColl);

// Specify years of interest.
var startYear = 2001;
var endYear = 2020;

// Climate dataset info.
var imageCollectionName = 'IDAHO_EPSCOR/GRIDMET';
var bandsWanted = ['pr', 'tmmn', 'tmmx'];
var scale = 4000;

// Export info.
var exportFolder = 'GEE_scalingUp';
var filenameBase = 'Gridmet_counties_IN_IL_IA_' + scale + 'm_';

// Initiate a loop, in which the variable i takes on values of each year.
for (var i = startYear; i <= endYear; i++) {        // for each year....
  
  // Load climate collection for that year.
  var startDate = i + '-01-01';

  var endYear_adj = i + 1;
  var endDate = endYear_adj + '-01-01';

  var imageCollection = ee.ImageCollection(imageCollectionName)
      .select(bandsWanted)
      .filterBounds(featColl)
      .filterDate(startDate, endDate);

  // Get values at feature collection.
  var sampledFeatures = imageCollection.map(function(image) {
    return image.reduceRegions({
      collection: featColl,
      reducer: ee.Reducer.mean(),         
      tileScale: 1,
      scale: scale
    }).filter(ee.Filter.notNull(bandsWanted))  // remove rows without data 
      .map(function(f) {                  // add date property
        var time_start = image.get('system:time_start');
        var dte = ee.Date(time_start).format('YYYYMMdd');
        return f.set('date_ymd', dte);
    });
  }).flatten();

  // Prepare export: specify properties and filename.
  var columnsWanted = [uniqueID].concat(['date_ymd'], bandsWanted);
  var filename = filenameBase + i;
 
  Export.table.toDrive({
    collection: sampledFeatures,
    description: filename,
    folder: exportFolder,
    fileFormat: 'CSV',
    selectors: columnsWanted
  });
  
}
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------



