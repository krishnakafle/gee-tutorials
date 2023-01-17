//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.3 Built Environments
//  Checkpoint:   A13d
//  Author:       Erin Trochim
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import roads data.
var grip4_africa = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Africa'),
grip4_europe = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Europe'),
grip4_north_america = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/North-America');

// Add a function to add line length in km.
var addLength = function(feature) {
return feature.set({
    lengthKm: feature.length().divide(1000)
}); // km;
};

// Calculate line lengths for all roads in Africa.
var grip4_africaLength = grip4_africa.map(addLength);

// Convert the roads to raster.
var empty = ee.Image().float();

var grip4_africaRaster = empty.paint({
featureCollection: grip4_africaLength,
color: 'lengthKm'
});

// Import simplified countries.
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');

// Filter to Africa.
var Africa = countries.filter(ee.Filter.eq('wld_rgn', 'Africa'));

// Import global power transmission lines.
var transmission = ee.FeatureCollection(
'projects/sat-io/open-datasets/predictive-global-power-system/distribution-transmission-lines'
);

// Filter transmission lines to Africa.
var transmissionAfrica = transmission.filterBounds(Africa);

// Calculate line lengths for all transmission lines in Africa.
var transmissionAfricaLength = transmissionAfrica.map(addLength);

// Convert the transmission lines to raster.
var transmissionAfricaRaster = empty.paint({
featureCollection: transmissionAfricaLength,
color: 'lengthKm'
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
