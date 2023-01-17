var text = require('users/gena/packages:text');
var gallery = require('users/gena/packages:gallery');

Map.centerObject(geometryGallery, 12);

var images = ee.ImageCollection('COPERNICUS/S2')
    .filterDate('2020-01-01', '2022-01-01')
    .filterBounds(geometryLabel);
 
var imagesMonthly = ee.List.sequence(0, 11).map(function(month) {
  month = ee.Number(month);
  return images.filter(ee.Filter.calendarRange(month, month.add(1), 'month'))
      .select(['B12', 'B8', 'B4'])
      .reduce(ee.Reducer.percentile([15]))
      .set({
        label: ee.Date.fromYMD(2000, month.add(1), 1).format('MMM')
      });
});

imagesMonthly = ee.ImageCollection(imagesMonthly);
  
// Render monthly images + label.
var imagesRGB = imagesMonthly.map(function(i) {
  var label = text.draw(i.get('label'), geometryLabel, Map.getScale(), {
      fontSize: 24, 
      textColor: 'ffffff', 
      outlineColor: '000000', 
      outlineWidth: 3, 
      outlineOpacity: 0.6
  });
  return i.visualize({min: 300, max: 3500}).blend(label);
});

// Generate a single filmstrip image (rows x columns).
var rows = 3;
var columns = 4;
var imageFilmstrip = gallery
    .draw(imagesRGB, geometryGallery.bounds(), rows, columns);

Map.addLayer(imageFilmstrip);

// LGTM (nclinton)
