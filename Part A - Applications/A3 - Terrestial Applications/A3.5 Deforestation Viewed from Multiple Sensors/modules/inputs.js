// Fusion Near Real-time (Lite)
// Near real-time monitoring of forest disturbance by fusion of 
// multi-sensor data.  @author Xiaojing Tang (xjtang@bu.edu).

// Input data functions.

// Load Landsat time series.
var loadLandsatData = function(region, period) {
    var c2ToSR = function(img) {
      return img.addBands({
        srcImg: img.multiply(0.0000275).add(-0.2).multiply(10000), 
        names: img.bandNames(), 
        overwrite: true
      });
    };  
    
    var maskL8 = function(img) {
      var bands = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
      var sr = c2ToSR(img.select(bands))
          .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);
      var validQA = [21824, 21888];
      var mask1 = img.select(['QA_PIXEL'])
          .remap(validQA, ee.List.repeat(1, validQA.length), 0);
      var mask2 = sr.reduce(ee.Reducer.min()).gt(0);
      var mask3 = sr.reduce(ee.Reducer.max()).lt(10000);
      return sr.updateMask(mask1.and(mask2).and(mask3));
    };
    
    var maskL7 = function(img) {
      var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
      var sr = c2ToSR(img.select(bands))
          .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);
      var validQA = [5440, 5504];
      var mask1 = img.select('QA_PIXEL')
          .remap(validQA, ee.List.repeat(1, validQA.length), 0);
      var mask2 = sr.reduce(ee.Reducer.min()).gt(0);
      var mask3 = sr.reduce(ee.Reducer.max()).lt(10000);
      return sr.updateMask(mask1.and(mask2).and(mask3));
    };
  
    var collection7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
        .filterBounds(region)
        .filterDate(period.get('start'), period.get('end'))
        .map(maskL7);
    var collection8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .filterBounds(region)
        .filterDate(period.get('start'), period.get('end'))
        .map(maskL8);
    return ee.ImageCollection(collection7.merge(collection8));
  };
  
  // Load Sentinel-2 time series.
  var loadS2Data = function(region, period) {
    var maskS2Img = function(img) {
      var qa = img.select('QA60');
      var cloud = ee.Image(img.get('cloud_prob')).select('probability');
      var cloudProbMask = cloud.lt(65);
      var cloudBitMask = 1 << 10;
      var cirrusBitMask = 1 << 11;
      var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
          .and(qa.bitwiseAnd(cirrusBitMask).eq(0))
          .and(cloudProbMask);
      return img.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
          .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
          .updateMask(mask);
    };  
  
    var S2 = ee.ImageCollection('COPERNICUS/S2')
        .filterBounds(region)
        .filterDate(period.get('start'), period.get('end'));
    var S2Cloud = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
        .filterBounds(region)
        .filterDate(period.get('start'), period.get('end'));
    var S2Joined = ee.ImageCollection(ee.Join.saveFirst('cloud_prob').apply({
      primary: S2,
      secondary: S2Cloud,
      condition:
        ee.Filter.equals({leftField: 'system:index', rightField: 'system:index'})
    }));
    var masked = ee.ImageCollection(S2Joined.map(function(img){
      return maskS2Img(img);
    }));
    return ee.ImageCollection(masked);
  };
  
  // Load Sentinel-1 time series.
  var loadS1Data = function(region, period) {
    var slopeLib = require('projects/gee-edu/book:Part A - Applications/A3 - Terrestrial Applications/A3.5 Deforestation Viewed from Multiple Sensors/modules/slope_correction_lib.js');
  
    var spatialMean = function(img) {
      var st = img.get('system:time_start');
      var geom = img.geometry();
      var angle = img.select('angle');
      var edge = img.select('VV').lt(-30.0);
      var fmean = img.select('V.').add(30);
      fmean = fmean.focal_mean(3, 'circle');
      var ratio = fmean.select('VH').divide(fmean.select('VV')).rename('ratio').multiply(30);
      return img.select().addBands(fmean).addBands(ratio).addBands(angle).set('timeStamp', st);
    };
    
    var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterBounds(region).filterDate(period.get('start'), period.get('end'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .select(['V.','angle']).map(spatialMean)
        .select(['VH','VV','ratio','angle']);
    var passCount = ee.Dictionary(S1.aggregate_histogram('orbitProperties_pass'));
    var passValues = passCount.values().sort().reverse();
    var higherCount = passValues.get(0);
    var maxOrbitalPass = passCount.keys().get(passCount.values().indexOf(higherCount));
    var S1Filtered = S1.filter(ee.Filter.eq('orbitProperties_pass', maxOrbitalPass));
    var S1Corrected = slopeLib.slope_correction(S1Filtered);
    return ee.ImageCollection(S1Corrected.map(function(img) {
      var st = img.get('timeStamp');
      return img.addBands(img.select('VH').divide(img.select('VV'))
          .rename('ratio').multiply(10)).set('system:time_start', st);
    }));
  };
  
  // Exports.
  exports = {
    loadLandsatData: loadLandsatData,
    loadS2Data: loadS2Data,
    loadS1Data: loadS1Data
  };
  
  // LGTM (nclinton). Reformatted and refactored.