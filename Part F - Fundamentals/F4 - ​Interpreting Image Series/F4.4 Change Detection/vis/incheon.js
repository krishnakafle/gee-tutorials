var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .select(
      ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
      ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']);
var landsat3 = ee.ImageCollection('LANDSAT/LM03/C01/T2')
    .select(['B4', 'B5', 'B6', 'B7'], ['green', 'red', 'nir1', 'nir2']);
    
var preImage = landsat3
    .filterBounds(point)
    .filterDate('1981-01-01', '1981-12-30')
    .sort('CLOUD_COVER', true)
    .first();
var postImage = landsat8
    .filterBounds(point)
    .filterDate('2020-01-01', '2020-12-30')
    .sort('CLOUD_COVER', true)
    .first();

Map.centerObject(point, 10);
Map.addLayer(preImage, preIncheon, 'pre');
Map.addLayer(postImage, postIncheon, 'post');
