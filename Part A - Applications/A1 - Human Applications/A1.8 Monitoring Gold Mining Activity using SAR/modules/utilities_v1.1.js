//*********************************************************************************
// Utilities for change detection   
//*********************************************************************************
// References:
//
// Updated April 4, 2020 : Modified from 'users/mortcanty/changedetection:utilities' 
//
//*********************************************************************************
exports.chi2cdf = function(chi2,df){
    // Chi square cumulative distribution function '''
      return ee.Image(chi2.divide(2)).gammainc(ee.Number(df).divide(2));
    };
    exports.makefeature = function(data){
    // for exporting as CSV to Drive 
      return ee.Feature(null, {'data': data});};
    exports.makeLegend = function(vis) {
      var lon = ee.Image.pixelLonLat().select('longitude');
      var gradient = lon.multiply((vis.max-vis.min)/100.0).add(vis.min);
      var legendImage = gradient.visualize(vis);
    // Add legend to a panel
      var thumb = ui.Thumbnail({
        image: legendImage, 
        params: {bbox:'0,0,100,8', dimensions:'256x15'}, 
        style: {padding: '1px', position: 'top-center'}
      });
      var panel = ui.Panel({
        widgets: [
          ui.Label(String(vis['min'])), 
          ui.Label({style: {stretch: 'horizontal'}}), 
          ui.Label(vis['max'])
        ],
        layout: ui.Panel.Layout.flow('horizontal'),
        style: {stretch: 'horizontal'}
      });
      return ui.Panel().add(panel).add(thumb);
    };
    exports.rcut = function(image,geometry,k,title,max){
    // generate time axis chart  
           var bmap = image.select(ee.List.sequence(3,k+2));
           var zeroes = bmap.multiply(0)
           var ones = zeroes.add(1);
           var twos = zeroes.add(2);
           var threes = zeroes.add(3)
           var bmapall = zeroes.where(bmap.gt(0),ones)
           var bmappos = zeroes.where(bmap.eq(ones),ones);
           var bmapneg = zeroes.where(bmap.eq(twos),ones);
           var bmapind = zeroes.where(bmap.eq(threes),ones);
           
           var cutall = ee.Dictionary(bmapall.reduceRegion(ee.Reducer.mean(),geometry,null,null,null,false,1e11));
           var keys = cutall.keys().map( function(x) {return ee.String(x).slice(1,9)});
           var chartall = ui.Chart.array.values(cutall.toArray(),0,keys).setChartType('ColumnChart');
           
           var cutpos = ee.Dictionary(bmappos.reduceRegion(ee.Reducer.mean(),geometry,null,null,null,false,1e11));
           var chartpos = ui.Chart.array.values(cutpos.toArray(),0,keys).setChartType('ColumnChart');
           
           var cutneg = ee.Dictionary(bmapneg.reduceRegion(ee.Reducer.mean(),geometry,null,null,null,false,1e11));
           var chartneg = ui.Chart.array.values(cutneg.toArray(),0,keys).setChartType('ColumnChart');
           
           var cutind = ee.Dictionary(bmapind.reduceRegion(ee.Reducer.mean(),geometry,null,null,null,false,1e11));
           var chartind = ui.Chart.array.values(cutind.toArray(),0,keys).setChartType('ColumnChart');
           
           chartall.setOptions({
           title: title,
           hAxis: {
              title: 'End of Change Interval'
              },
           vAxis: {
             title: 'Fraction of Changes',
             viewWindow: {
                      min: 0.0,
                       max: max
                         },
              textStyle : {
                fontSize: 16
            }
              }});
           chartpos.setOptions({
           title: title,
           hAxis: {
              title: 'End of Change Interval'
              },
           vAxis: {
             title: 'Fraction of Positive Definite Changes',
             viewWindow: {
                      min: 0.0,
                       max: max
                         },
              textStyle : {
                fontSize: 16
            }
              }});
           chartneg.setOptions({
           title: title,
           hAxis: {
              title: 'End of Change Interval'
              },
           vAxis: {
             title: 'Fraction of Negative Definite Changes',
             viewWindow: {
              min: 0.0,
               max: max
                 },
              textStyle : {
                fontSize: 16
            }
              }});
          chartind.setOptions({
           title: title,
           hAxis: {
              title: 'End of Change Interval'
              },
           vAxis: {
             title: 'Fraction of Indefinite Changes',
             viewWindow: {
              min: 0.0,
               max: max
                 },
              textStyle : {
                fontSize: 16
            }
              }});    
           return([chartall,chartpos,chartneg,chartind]);
    };
    exports.makevideo = function(current,prev){
    // iterator function to generate video frames  
      var n = ee.Number(current);
      prev = ee.Dictionary(prev);
      var bmap = ee.Image(prev.get('bmap'));
      var bnames = bmap.bandNames();
      var label = bnames.get(n);
      var background = ee.Image(prev.get('background'));
      var framelist = ee.List(prev.get('framelist'));
      var bmapband = bmap.select(n);
      var zeroes = bmapband.multiply(0);
      var ones = zeroes.add(1); 
      var twos = zeroes.add(2);
      var threes = zeroes.add(3)
      var idxr = bmapband.eq(ones); 
      var idxg = bmapband.eq(twos);
      var idxy = bmapband.eq(threes);
      var imager = background.where(idxr,ones);
      var imageg = background.where(idxr,zeroes);
      var imageb = background.where(idxr,zeroes);
      var imageg = imageg.where(idxg,ones);
      var imager = imager.where(idxg,zeroes);
      var imageb = imageb.where(idxg,zeroes);
      var imageb = imageb.where(idxy,zeroes);
      var imager = imager.where(idxy,ones);
      var imageg = imageg.where(idxy,ones);
      var frame = imager.addBands(imageg).addBands(imageb) 
                  .multiply(256) 
                  .uint8() 
                  .rename(['r','g','b'])
                  .set({label:label});
      return ee.Dictionary({'bmap':bmap,'background':background,'framelist':framelist.add(frame)});
    };