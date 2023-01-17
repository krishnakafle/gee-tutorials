// Import roads.
var grip4_africa = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Africa');
  var grip4_europe = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Europe');
  var grip4_north_america = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/North-America');
  
  // Function to add line length in km
  var addLength = function(feature) {
    return feature.set({lengthKm: feature.length().divide(1000)}) // km;
  };
  
  // Calculate line lengths for all roads in Africa
  var grip4_africaLength = grip4_africa.map(addLength)
  
  // Convert to roads to raster
  var empty = ee.Image().float();
  
  var grip4_africaRaster = empty.paint({
    featureCollection: grip4_africaLength, 
    color: 'lengthKm'
  });
  
  // Import simplified countries
  var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  
  // Filter to Africa
  var Africa = countries.filter(ee.Filter.eq('wld_rgn', 'Africa'))
  
  // Import global power transmission lines
  var transmission = ee.FeatureCollection(
    'projects/sat-io/open-datasets/predictive-global-power-system/distribution-transmission-lines');
  
  // Filter transmission lines to Africa
  var transmissionAfrica = transmission.filterBounds(Africa)
  
  // Calculate line lengths for all transmission lines in Africa
  var transmissionAfricaLength = transmissionAfrica.map(addLength)
  
  // Convert to transmission lines to raster
  var transmissionAfricaRaster = empty.paint({
    featureCollection: transmissionAfricaLength, 
    color: 'lengthKm'
  });
  
  // Add roads and transmission lines together into one image
  // Clip to Africa feature collection
  var stack = grip4_africaRaster
    .addBands(transmissionAfricaRaster)
    .rename(['roads', 'transmission'])
    .clipToCollection(Africa);
  
  // Calculate spatial statistics: local Geary's C
  // Create a list of weights for a 9x9 kernel.
  var list = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  
  // The center of the kernel is zero.
  var centerList = [1, 1, 1, 1, 0, 1, 1, 1, 1];
  
  // Assemble a list of lists: the 9x9 kernel weights as a 2-D matrix.
  var lists = [list, list, list, list, centerList, list, list, list, list];
  
  // Create the kernel from the weights.
  // Non-zero weights represent the spatial neighborhood.
  var kernel = ee.Kernel.fixed(9, 9, lists, -4, -4, false);
  
  // Use the max among bands as the input.
  var maxBands = stack.reduce(ee.Reducer.max());
  
  // Convert the neighborhood into multiple bands.
  var neighs = maxBands.neighborhoodToBands(kernel);
  
  // Compute local Geary's C, a measure of spatial association
  // – 0 indicates perfect positive autocorrelation/clustered
  // – 1 indicates no autocorrelation/random
  // – 2 indicates perfect negative autocorrelation/dispersed
  var gearys = maxBands.subtract(neighs).pow(2).reduce(ee.Reducer.sum())
               .divide(Math.pow(9, 2));
  
  // Convert to a -/+1 scale by: calculating C* = 1 – C
  // – 1 indicates perfect positive autocorrelation/clustered
  // – 0 indicates no autocorrelation/random
  // – -1 indicates perfect negative autocorrelation/dispersed
  var gearysStar = ee.Image(1).subtract(gearys)
  
  // Import palettes
  var palettes = require('users/gena/packages:palettes');
  
  // Create custom palette, blue is negative while red is positive autocorrelation/clustered
  var palette = palettes.colorbrewer.Spectral[7].reverse();
  
  // Normalize the image and add it to the map.
  var visParams = {min: -1, max: 1, palette: palette};
  
  // Import custom basemap
  var basemap = require('users/erintrochim/GEE_workshops:backgroundMaps')
  
  // Add basemap
  basemap.addCustomBasemap('BlackAndWhite')
  
  // Display
  Map.setCenter(3.6, 32.5, 11)
  Map.addLayer(gearysStar.focalMax(1), 
               visParams, 
               'local Gearys C*')
  
  // LGTM (nclinton)
  