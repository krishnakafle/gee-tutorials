//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.4 Forest Degradation and Deforestation
//  Checkpoint:   A34a
//  Author:       Carlos Souza Jr., Karis Tenneson, John Dilger, 
//                Crystal Wespestad, Eric Bullock
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// SMA Model - Section 1

// Define the Landsat endmembers (source: Souza et al. 2005)
// They can be applied to Landsat 5, 7, 8, and potentially 9.
var endmembers = [
    [0.0119,0.0475,0.0169,0.625,0.2399,0.0675], // GV
    [0.1514,0.1597,0.1421,0.3053,0.7707,0.1975], // NPV
    [0.1799,0.2479,0.3158,0.5437,0.7707,0.6646], // Soil
    [0.4031,0.8714,0.79,0.8989,0.7002,0.6607] // Cloud
  ];
  
  // Select a Landsat 5 scene on which to apply the SMA model.
  var image = ee.Image('LANDSAT/LT05/C02/T1_L2/LT05_226068_19840411')
      .multiply(0.0000275).add(-0.2);
  
  // Center the map on the image object.
  Map.centerObject(image, 10);
  
  // Define and select the Landsat bands to apply the SMA model.
  // use ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'] for Landsat 5 and 7.
  // use ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'] for Landsat 8.
  var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
  image = image.select(bands);
  
  // Unmixing image using Singular Value Decomposition. 
  var getSMAFractions = function(image, endmembers) {
      var unmixed = ee.Image(image)
          .select([0, 1, 2, 3, 4,
          5]) // Use the visible, NIR, and SWIR bands only!
          .unmix(endmembers)
          .max(0) // Remove negative fractions, mostly Soil.
          .rename('GV', 'NPV', 'Soil', 'Cloud');
      return ee.Image(unmixed.copyProperties(image));
  };
  
  // Calculate GVS and NDFI and add them to image fractions.
  // Run the SMA model passing the Landsat image and the endmembers.
  var sma = getSMAFractions(image, endmembers);
  
  Map.addLayer(sma, {
      bands: ['NPV', 'GV', 'Soil'],
      min: 0,
      max: 0.45
  }, 'sma');
  
  // Calculate the Shade and GV shade-normalized (GVs) fractions from the SMA bands.
  var Shade = sma.reduce(ee.Reducer.sum())
      .subtract(1.0)
      .abs()
      .rename('Shade');
  
  var GVs = sma.select('GV')
      .divide(Shade.subtract(1.0).abs())
      .rename('GVs');
  
  // Add the new bands to the SMA image variable.
  sma = sma.addBands([Shade, GVs]);
  
  // Calculate the NDFI using image expression.	
  var NDFI = sma.expression(
      '(GVs - (NPV + Soil))  / (GVs + NPV + Soil)', {
          'GVs': sma.select('GVs'),
          'NPV': sma.select('NPV'),
          'Soil': sma.select('Soil')
      }).rename('NDFI');
  
  // Add the NDFI band to the SMA image.
  sma = sma.addBands(NDFI);
  
  // Define NDFI color table.
  var palettes = require(
      'projects/gee-edu/book:Part A - Applications/A3 - Terrestrial Applications/A3.4 Forest Degradation and Deforestation/modules/palettes'
  );
  var ndfiColors = palettes.ndfiColors;
  
  var imageVis = {
      'bands': ['SR_B5', 'SR_B4', 'SR_B3'],
      'min': 0,
      'max': 0.4
  };
  
  // Add the Landsat color composite to the map.
  Map.addLayer(image, imageVis, 'Landsat 5 RGB-543', true);
  
  // Add the fraction images to the map.
  Map.addLayer(sma.select('Soil'), {
      min: 0,
      max: 0.2
  }, 'Soil');
  Map.addLayer(sma.select('GV'), {
      min: 0,
      max: 0.6
  }, 'GV');
  Map.addLayer(sma.select('NPV'), {
      min: 0,
      max: 0.2
  }, 'NPV');
  Map.addLayer(sma.select('Shade'), {
      min: 0,
      max: 0.8
  }, 'Shade');
  Map.addLayer(sma.select('GVs'), {
      min: 0,
      max: 0.9
  }, 'GVs');
  Map.addLayer(sma.select('NDFI'), {
      palette: ndfiColors
  }, 'NDFI');
  
  var getWaterMask = function(sma) {
      var waterMask = (sma.select('Shade').gte(0.65))
          .and(sma.select('GV').lte(0.15))
          .and(sma.select('Soil').lte(0.05));
      return waterMask.rename('Water');
  };
  
  // You can use the variable below to get the cloud mask.
  var cloud = sma.select('Cloud').gte(0.1);
  var water = getWaterMask(sma);
  
  var cloudWaterMask = cloud.max(water);
  Map.addLayer(cloudWaterMask.selfMask(),
      {
          min: 1,
          max: 1,
          palette: 'blue'
      },
      'Cloud and water mask');
  
  // Mask NDFI.
  var maskedNDFI = sma.select('NDFI').updateMask(cloudWaterMask.not());
  Map.addLayer(maskedNDFI, {
      palette: ndfiColors
  }, 'NDFI');
  
  // ------------------------------------------------------------------------
  // CHECKPOINT
  // ------------------------------------------------------------------------