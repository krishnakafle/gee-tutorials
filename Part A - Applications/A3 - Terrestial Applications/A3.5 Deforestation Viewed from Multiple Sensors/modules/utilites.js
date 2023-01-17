// Fusion Near Real-time (Lite).
// Near real-time monitoring of forest disturbance by fusion of 
// multi-sensor data.  @author Xiaojing Tang (xjtang@bu.edu).

// Utility functions.

// Common utilities.
var runCCD = function(col, period, band) {
    var prepareData = function(col, band) {
      return ee.ImageCollection(col.map(function(img){
        return addDependents(img
            .select(band))
            .select(['INTP', 'SLP', 'COS', 'SIN', 'COS2', 'SIN2', 'COS3', 'SIN3', band])
            .updateMask(img.select(band).mask());
      }));
    };
    var addDependents = function(img){
      var t = ee.Number(convertDateFormat(ee.Date(img.get('system:time_start')), 1));
      var omega = 2.0 * Math.PI;
      var dependents = ee.Image.constant([1, t, t.multiply(omega).cos(),
              t.multiply(omega).sin(),
              t.multiply(omega * 2).cos(),
              t.multiply(omega * 2).sin(),
              t.multiply(omega * 3).cos(),
              t.multiply(omega * 3).sin()]).float()
              .rename(['INTP', 'SLP', 'COS', 'SIN', 'COS2', 'SIN2', 'COS3', 'SIN3']);
      return img.addBands(dependents);
    };
    var col2 = prepareData(col, band);
    var ccd = col2
      .reduce(ee.Reducer.robustLinearRegression(8, 1), 4)
      .rename([band + '_coefs', band + '_rmse']);
    return ccd.select(band + '_coefs')
      .arrayTranspose()
      .addBands(ccd.select(band + '_rmse'));
  };
  
  var convertDateFormat = function(date, format) {
    if (format == 0) { 
      var epoch = 719529;
      var days = date.difference(ee.Date('1970-01-01'), 'day');
      return days.add(epoch);
    } else if (format == 1) {
      var year = date.get('year');
      var fYear = date.difference(ee.Date.fromYMD(year, 1, 1), 'year');
      return year.add(fYear);
    } else {
      return date.millis();
    }
  };
  
  var getData = function(region, params, sensor, endMembers) {
    if (sensor == 'Sentinel-2') {
      return(getSen2TS(region, params, endMembers));
    } else if (sensor == 'Sentinel-1') {
      return(getSen1TS(region, params));
    } else {
      return(getLandsatTS(region, params, endMembers));
    }
  };
  
  var getImage = function(region, date, sensor) {
    if (sensor == 'Sentinel-2') {
      return(getSen2Img(region, date));
    } else if (sensor == 'Sentinel-1') {
      return(getSen1Img(region, date));
    } else {
      return(getLandsatImage(region, date));
    }
  };
  
  var harmonicFit = function(t, coef, dateFormat) {
    var PI2 = 2.0 * Math.PI;
    var OMEGAS = [PI2 / 365.25, PI2, 
      PI2 / (1000 * 60 * 60 * 24 * 365.25)];
    var omega = OMEGAS[dateFormat];
    return coef.get([0])
      .add(coef.get([1]).multiply(t))
      .add(coef.get([2]).multiply(t.multiply(omega).cos()))
      .add(coef.get([3]).multiply(t.multiply(omega).sin()))
      .add(coef.get([4]).multiply(t.multiply(omega * 2).cos()))
      .add(coef.get([5]).multiply(t.multiply(omega * 2).sin()))
      .add(coef.get([6]).multiply(t.multiply(omega * 3).cos()))
      .add(coef.get([7]).multiply(t.multiply(omega * 3).sin()));
  };
  
  var getCCDImage = function(ccd, band) {
    band = band + '_';
    var genCoefImg = function(ccd, band, coef) {
      var zeros = ee.Array(0).repeat(0, 1);
      var coefImg = ccd
        .select(band + coef)
        .arrayCat(zeros, 0)
        .float()
        .arraySlice(0, 0, 1);
      return ee.Image(coefImg
        .arrayFlatten([[ee.String('S1_').cat(band).cat(coef)]]));
    };
    var genHarmImg = function(ccd, band) {
      var harms = ['INTP', 'SLP', 'COS', 'SIN', 'COS2', 'SIN2', 'COS3', 'SIN3'];
      var zeros = ee.Image(ee.Array([ee.List.repeat(0, harms.length)]))
        .arrayRepeat(0, 1);
      var coefImg = ccd
        .select(band + 'coefs')
        .arrayCat(zeros, 0)
        .float()
        .arraySlice(0, 0, 1);
      return ee.Image(coefImg
        .arrayFlatten([[ee.String('S1_').cat(band).cat('coef')], harms]));
    };
    var rmse = genCoefImg(ccd, band, 'rmse');
    var coef = genHarmImg(ccd, band);
    return ee.Image.cat(rmse, coef);
  };
  
  // Near-real-time utilities.
  var addSynthetic = function(data, ccd, band, sensor) {
    var genSyntImg = function(ccd, img, band, sensor) {
      var date = convertDateFormat(ee.Date(img.get('system:time_start')), 1);
      var dateString = ee.Date(img.get('system:time_start'))
        .format('yyyyMMdd');
      var coefs = ['INTP', 'SLP', 'COS', 'SIN', 'COS2', 'SIN2', 'COS3', 'SIN3'];
      var coef = ee.Image(coefs.map(function(coef){
        return ccd.select('.*'.concat(band).concat('.*').concat(coef));
      })).rename(coefs);
      var t = ee.Number(date);
      var omega = 2.0 * Math.PI;
      var synt = ee.Image.constant([1, t, t.multiply(omega).cos(),
        t.multiply(omega).sin(),
        t.multiply(omega * 2).cos(),
        t.multiply(omega * 2).sin(),
        t.multiply(omega * 3).cos(),
        t.multiply(omega * 3).sin()]).float();
      return synt
        .multiply(coef)
        .reduce('sum')
        .addBands(img, [band])
        .rename(['synt', band])
        .set({
          'sensor': sensor, 
          'system:time_start': img.get('system:time_start'), 
          'dateString': dateString
        });
    };
    
    return ee.ImageCollection(data.map(function(img){
      return genSyntImg(ccd, img, band, sensor);
    }));
  };
  
  var getResiduals = function(data, band) {
    return ee.ImageCollection(data.map(function(img) {
      return img
        .select('synt')
        .where(img.select('synt').gt(10000), 10000)
        .subtract(img.select(band))
        .rename('residual')
        .set({
          'sensor': img.get('sensor'), 
          'system:time_start': img.get('system:time_start'),
          'dateString': img.get('dateString')
        });
    })); 
  };
  
  var getChangeScores = function(data, rmse, mean, 
    minSTD, threshold, strikeOnly) {
    var mask = ee.Image(0);
    if (strikeOnly) {mask = ee.Image(1)}
    return ee.ImageCollection(data.map(function(img) {
      var z = img.divide(rmse.max(mean.abs().multiply(minSTD)));
      var strike = z.multiply(z.gt(threshold));
      var zStack = ee.Image.cat(z, strike)
        .rename(['z', 'strike'])
        .set({
          'sensor': img.get('sensor'), 
          'system:time_start': img.get('system:time_start')
        });
      return zStack.updateMask(strike.gt(0).or(mask));
    })); 
  };
  
  var monitorChange = function(zScores, nrtParam) {
    var zeros = ee.Image(0)
      .addBands(ee.Image(0))
      .rename(['change', 'date']);
    var shift = Math.pow(2, nrtParam.m - 1) - 1;
    var monitor = function(img, result) {
      var change = ee.Image(result).select('change');
      var date = ee.Image(result).select('date');
      var shiftImg = img
        .select('z')
        .mask()
        .eq(0)
        .multiply(shift + 1)
        .add(shift);
      change = change
        .bitwiseAnd(shiftImg)
        .multiply(shiftImg.eq(shift).add(1))
        .add(img.select('strike').unmask().gt(0));
      date = date
        .add(change.bitCount().gte(nrtParam.n)
        .multiply(date.eq(0))
        .multiply(ee.Number(convertDateFormat(
          ee.Date(img.get('system:time_start')), 1))));
      return(change.addBands(date));
    };
    return ee.Image(zScores.iterate(monitor, zeros))
      .select('date')
      .rename('Alerts')
      .selfMask();
  };
  
  // Landsat utilities.
  var getLandsatImage = function(region, date) {
    var collection7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
      .filterBounds(region);
    var collection8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(region);
    var col7NoClouds = collection7.map(maskL7);
    var col8NoClouds = collection8.map(maskL8);
    var colNoClouds = col7NoClouds.merge(col8NoClouds);
    var imDate = ee.Date(date);
    var befDate = imDate.advance(-1, 'day');
    var aftDate = imDate.advance(1, 'day');
    var selectedImage = colNoClouds.filterDate(befDate, aftDate);
    return ee.Algorithms.If(
      selectedImage.size().gt(0), 
      selectedImage.first(), 
      null
    );
  };
  
  var getLandsatTS = function(region, params) {
    var collection7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
      .filterBounds(region)
      .filterDate(params.get('start'), params.get('end'));
    var collection8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(region)
      .filterDate(params.get('start'), params.get('end'));
    var col7NoClouds = collection7.map(maskL7);
    var col8NoClouds = collection8.map(maskL8);
    var colNoClouds = col7NoClouds.merge(col8NoClouds);
    return ee.ImageCollection(unmixing(colNoClouds));
  };
  
  var c2ToSR = function(img) {
    return img
      .addBands(
        img.multiply(0.0000275).add(-0.2).multiply(10000), 
        img.bandNames(), 
        true
      );
  };  
  
  var maskL7 = function(img) {
    var sr = c2ToSR(img
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']))
      .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);
    var validQA = [5440, 5504];
    var mask1 = img
      .select('QA_PIXEL')
      .remap(validQA, ee.List.repeat(1, validQA.length), 0);
    var mask2 = sr.reduce(ee.Reducer.min()).gt(0);
    var mask3 = sr.reduce(ee.Reducer.max()).lt(10000);
    return sr.updateMask(mask1.and(mask2).and(mask3));
  };
  
  var maskL8 = function(img) {
    var sr = c2ToSR(img
      .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']))
      .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);
    var validQA = [21824, 21888];
    var mask1 = img
      .select(['QA_PIXEL'])
      .remap(validQA, ee.List.repeat(1, validQA.length), 0);
    var mask2 = sr.reduce(ee.Reducer.min()).gt(0);
    var mask3 = sr.reduce(ee.Reducer.max()).lt(10000);
    return sr.updateMask(mask1.and(mask2).and(mask3));
  };
  
  var unmixing = function(col) { 
    var gv = [500, 900, 400, 6100, 3000, 1000];
    var npv = [1400, 1700, 2200, 3000, 5500, 3000];
    var soil = [2000, 3000, 3400, 5800, 6000, 5800];
    var shade = [0, 0, 0, 0, 0, 0];
    var cloud = [9000, 9600, 8000, 7800, 7200, 6500];
    var cfThreshold = 0.05;
    return col.map(function(img){
      var unmixed = img
        .select(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
        .unmix([gv, shade, npv, soil, cloud], true, true)
        .rename(['GV', 'Shade', 'NPV', 'Soil', 'Cloud']);
      var maskCloud = unmixed.select('Cloud').lt(cfThreshold);
      var maskShade = unmixed.select('Shade').lt(1);
      var NDFI = unmixed.expression(
            '10000 * ((GV / (1 - SHADE)) - (NPV + SOIL)) / ((GV / (1 - SHADE)) + (NPV + SOIL))', 
            {
              'GV': unmixed.select('GV'),
              'SHADE': unmixed.select('Shade'),
              'NPV': unmixed.select('NPV'),
              'SOIL': unmixed.select('Soil')
            }).rename('NDFI');
      var maskNDFI = unmixed.expression(
          '(GV / (1 - SHADE)) + (NPV + SOIL)', 
          {
            'GV': unmixed.select('GV'),
            'SHADE': unmixed.select('Shade'),
            'NPV': unmixed.select('NPV'),
            'SOIL': unmixed.select('Soil')
          }).gt(0);
      return img
        .addBands(unmixed.select(['GV','Shade','NPV','Soil'])
        .multiply(10000))
        .addBands(NDFI)
        .updateMask(maskCloud)
        .updateMask(maskNDFI)
        .updateMask(maskShade);
    });
  };
  
  var spatialFilter = function(img, minSize) {
    var connected = img
      .reduceConnectedComponents(ee.Reducer.sum())
      .rename('size');
    return img.updateMask(connected.gte(minSize));
  };
  
  // Sentinel-2 utilities.
  var getSen2TS = function(region, params) {
    var S2 = ee.ImageCollection('COPERNICUS/S2')
        .filterBounds(region)
        .filterDate(params.get('start'), params.get('end'));
    var S2Cloud = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
        .filterBounds(region)
        .filterDate(params.get('start'), params.get('end'));
    var S2Joined = ee.ImageCollection(ee.Join.saveFirst('cloud_prob')
      .apply({
        primary: S2,
        secondary: S2Cloud,
        condition:ee.Filter.equals({
          leftField: 'system:index', 
          rightField: 'system:index'
        })
      }));
    var masked = ee.ImageCollection(S2Joined.map(function(img){
      return maskSen2Img(img);
    }));
    return ee.ImageCollection(unmixing(masked));
  };
  
  var getSen2Img = function(region, date) {
    var imDate = ee.Date(date);
    var befDate = imDate.advance(-1, 'day');
    var aftDate = imDate.advance(1, 'day');
    var S2 = ee.ImageCollection('COPERNICUS/S2')
      .filterBounds(region)
      .filterDate(befDate, aftDate);
    var S2Cloud = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
      .filterBounds(region)
      .filterDate(befDate, aftDate);
    var S2Joined = ee.ImageCollection(ee.Join.saveFirst('cloud_prob')
      .apply({
        primary: S2,
        secondary: S2Cloud,
        condition: ee.Filter.equals({
          leftField: 'system:index', 
          rightField: 'system:index'
        })
      }));  
    return ee.Algorithms.If(
      S2Joined.size().gt(0), 
      maskSen2Img(S2Joined.first()), 
      null
    );
  };
  
  var maskSen2Img = function(img) {
    var qa = img.select('QA60');
    var cloud = ee.Image(img.get('cloud_prob'))
      .select('probability');
    var cloudProbMask = cloud.lt(65);
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0))
        .and(cloudProbMask);
    return img
      .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
      .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
      .updateMask(mask);
  };
  
  // Sentinel-1 utilities.
  var getSen1TS = function(region, params){
    var spatialSmoothing = function(img) {
      var st = img.get('system:time_start');
      var geom = img.geometry();
      var angle = img.select('angle');
      var edge = img.select('VV').lt(-30.0);
      var fmean = img.select('V.').add(30);
      fmean = fmean.focal_mean(3, 'circle');
      var ratio = fmean
        .select('VH')
        .divide(fmean.select('VV'))
        .rename('ratio')
        .multiply(30);
      return img
        .select()
        .addBands(fmean)
        .addBands(ratio)
        .addBands(angle)
        .set('timeStamp', st);
    };
    
    var slopeCorrection = function(col){
      var model = 'volume';
      var elevation = ee.Image('USGS/SRTMGL1_003');
      var buffer = 0;
      var ninetyRad = ee.Image.constant(90)
        .multiply(Math.PI/180);
      
      function _volume_model(theta_iRad, alpha_rRad) {
        var nominator = (ninetyRad.subtract(theta_iRad)
          .add(alpha_rRad))
          .tan();
        var denominator = (ninetyRad.subtract(theta_iRad))
          .tan();
        return nominator.divide(denominator);
      }
      
      function _surface_model(theta_iRad, alpha_rRad, alpha_azRad) {
        var nominator = (ninetyRad.subtract(theta_iRad)).cos();
        var denominator = alpha_azRad
          .cos()
          .multiply((ninetyRad.subtract(theta_iRad)
            .add(alpha_rRad)).cos());
        return nominator.divide(denominator);
      }
      
      function _erode(img, distance) {
        var d = img
          .not()
          .unmask(1)
          .fastDistanceTransform(30)
          .sqrt()
          .multiply(ee.Image.pixelArea()
          .sqrt());
        return img.updateMask(d.gt(distance));
      }    
      
      function _masking(alpha_rRad, theta_iRad, proj, buffer) {
        var layover = alpha_rRad.lt(theta_iRad).rename('layover');
        var shadow = alpha_rRad
          .gt(ee.Image.constant(-1).multiply(ninetyRad.subtract(theta_iRad)))
          .rename('shadow');
        var mask = layover.and(shadow);
        if (buffer > 0) {mask = _erode(mask, buffer)}
        return mask.rename('no_data_mask');
      }
    
      function _correct(image) {
        var geom = image.geometry();
        var proj = image.select(1).projection();
        var heading = ee.Terrain.aspect(image.select('angle'))
              .reduceRegion(ee.Reducer.mean(), geom, 1000)
              .get('aspect');
        var sigma0Pow = ee.Image.constant(10)
          .pow(image.divide(10.0));
        var theta_iRad = image.select('angle')
          .multiply(Math.PI/180)
          .clip(geom);
        var phi_iRad = ee.Image.constant(heading)
          .multiply(Math.PI/180);
        var alpha_sRad = ee.Terrain.slope(elevation)
          .select('slope')
          .multiply(Math.PI/180)
          .setDefaultProjection(proj)
          .clip(geom);
        var phi_sRad = ee.Terrain.aspect(elevation)
          .select('aspect')
          .multiply(Math.PI/180)
          .setDefaultProjection(proj)
          .clip(geom);
        var phi_rRad = phi_iRad.subtract(phi_sRad);
        var alpha_rRad = (alpha_sRad.tan().multiply(phi_rRad.cos()))
          .atan();
        var alpha_azRad = (alpha_sRad.tan().multiply(phi_rRad.sin()))
          .atan();
        var gamma0 = sigma0Pow.divide(theta_iRad.cos());
        var corrModel = _volume_model(theta_iRad, alpha_rRad);
        var gamma0_flat = gamma0.divide(corrModel);
        var gamma0_flatDB = ee.Image.constant(10)
          .multiply(gamma0_flat.log10())
          .select(['VV', 'VH']);
        var mask = _masking(alpha_rRad, theta_iRad, proj, buffer);
        return gamma0_flatDB
          .addBands(mask)
          .copyProperties(image);
      }
      return col.map(_correct);
    };
    
    var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(region)
      .filterDate(params.get('start'), params.get('end'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .select(['V.','angle'])
      .map(spatialSmoothing)
      .select(['VH','VV','ratio','angle']);
    var passCount = ee.Dictionary(S1.aggregate_histogram('orbitProperties_pass'));
    var passValues = passCount.values().sort().reverse();
    var higherCount = passValues.get(0);
    var maxOrbitalPass = passCount
      .keys()
      .get(passCount.values().indexOf(higherCount));
    var S1Filtered = S1.filter(ee.Filter.eq(
      'orbitProperties_pass', 
      maxOrbitalPass
    ));
    var S1Corrected = slopeCorrection(S1Filtered);
    return ee.ImageCollection(S1Corrected.map(function(img) {
      var st = img.get('timeStamp');
      return img
        .addBands(img.select('VH').divide(img.select('VV'))
        .rename('ratio')
        .multiply(10))
        .set('system:time_start', st);
    }));
  };
  
  var getSen1Img = function(region, date) {
    var addRatio = function(img) {
      var img2 = img.add(30);
      var ratio = img
        .select('VH')
        .divide(img.select('VV'))
        .rename('ratio')
        .multiply(30);
      return img
        .select()
        .addBands(img2)
        .addBands(ratio);
    };
    var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(region);
    var imDate = ee.Date(date);
    var befDate = imDate.advance(-1, 'day');
    var aftDate = imDate.advance(1, 'day');
    var col = S1.filterDate(befDate, aftDate);
    return ee.Algorithms.If(
      col.size().gt(0), 
      addRatio(col.first()), 
      null
    );
  };
  
  // Plotting utilities.
  var getTimeSeries = function(train, monitor, ccd, geometry, band, padding) {
    var dateFormat = 1;
    var proj = ee.Projection('EPSG:4326').atScale(10);
    var ccdFits = ccd.reduceRegion({
      reducer: ee.Reducer.first(), 
      geometry: geometry, 
      crs: proj});
    var coef = ccdFits.getArray(band + '_coefs').project([1]);
    var rmse = ccdFits.getArray(band + '_rmse').get([0]);
  
    function produceTrainSeries(collection, geometry, band) {
      if (padding) {
        collection = collection.sort('system:time_start');
        var first = collection.first();
        var last = collection.sort('system:time_start', false).first();
        var fakeDates = ee.List.sequence(
          first.date().get('year'), 
          last.date().get('year'), 
          padding
        ).map(function(t) {
          var fYear = ee.Number(t);
          var year = fYear.floor();
          return  ee.Date.fromYMD(year, 1, 1)
            .advance(fYear.subtract(year), 'year');
        });
        fakeDates = fakeDates.map(function(d) { 
          return ee.Image()
            .rename(band)
            .set('system:time_start', ee.Date(d).millis());
        });
        collection = collection.merge(fakeDates);
      }    
      collection = collection.sort('system:time_start');
      var timeSeries = collection.map(function(img) {
        var time = convertDateFormat(img.date(), dateFormat);
        var value = img.select(band).reduceRegion({
          reducer: ee.Reducer.first(), 
          geometry: geometry,
          crs: proj
        }).getNumber(band);
        var fit = harmonicFit(time, ee.Array(coef), dateFormat);
        var residual = ee.Algorithms.If(
          value, 
          fit.subtract(value), 
          value
        );
        return ee.Feature(geometry).set({
          train: value,
          x: value,
          fitTime: time,
          fit: fit,
          residual: residual,
          dateString: img
            .date()
            .format('YYYY-MM-dd'),
          rmse: rmse,
          trainFitTime: time
        });
      });
      return timeSeries;
    }
    
    function produceMonitorSeries(collection, geometry, band) {
      if (padding) {
        collection = collection.sort('system:time_start');
        var first = collection.first();
        var last = collection.sort('system:time_start', false).first();
        var fakeDates = ee.List.sequence(
          first.date().get('year'), 
          last.date().get('year'), 
          padding
        ).map(function(t) {
          var fYear = ee.Number(t);
          var year = fYear.floor();
          return ee.Date.fromYMD(year, 1, 1)
            .advance(fYear.subtract(year), 'year')});
        fakeDates = fakeDates.map(function(d) { 
          return ee.Image()
            .rename(band)
            .set('system:time_start', ee.Date(d).millis());
        });
        collection = collection.merge(fakeDates);
      }    
      collection = collection.sort('system:time_start');
      return collection.map(function(img) {
        var time = convertDateFormat(img.date(), dateFormat);
        var value = img.select(band).reduceRegion({
          reducer: ee.Reducer.first(), 
          geometry: geometry,
          crs: proj
        }).getNumber(band);
        var fit = harmonicFit(time, ee.Array(coef), dateFormat);
        var residual = ee.Algorithms.If(
          value, 
          fit.subtract(value), 
          value
        );
        return ee.Feature(geometry).set({
          monitor: value,
          fitTime: time,
          fit: fit,
          x: residual,
          rmse: rmse,
          dateString: img
            .date()
            .format('YYYY-MM-dd'),
          monitorFitTime: time,
        });
      });
    }
    
    return produceTrainSeries(train, geometry, band)
      .merge(produceMonitorSeries(monitor, geometry, band));
  };
  
  var transformToTable = function(ccdTS, colNames) {
    var listLen = colNames.length;
    return ccdTS
      .reduceColumns(ee.Reducer.toList(listLen, listLen), colNames)
      .get('list');
  };
  
  var createCCDChart = function(table, band, lat, lon) {
    function formatTable(table) {
      var cols = [
        {id: 'A', label: 'Date', type: 'date'},
        {id: 'B', label: 'Training', type: 'number'},
        {id: 'C', label: 'Monitoring', type: 'number'},
        {id: 'D', label: 'Fit', type: 'number'}
      ];
      var values = table.map(function(list) {
        return {c: list.map(function(item, index) {
          return {'v': index == 0 ? new Date(item): item};
        })};
      });
      return {cols: cols, rows: values};
    }
    var formatted = formatTable(table);
    var chart = ui.Chart(formatted, 'LineChart', {
      title: 'Pixel located at ' + lat.toFixed(3) + ', ' + lon.toFixed(3),
      pointSize: 0,
      series: {
        0: { pointSize: 1.8, lineWidth: 0},
        1: { pointSize: 1.8, lineWidth: 0}
      },
      vAxis: {
        title: band,
      },
      height: '90%',
      stretch: 'both'
    });
    return chart;
  };
  
  var addPixelZScore = function(timeSeries, maxZ, minRMSE){
    var values = timeSeries.aggregate_array('train');
    var minSD = ee.Number(
      timeSeries
        .aggregate_array('train')
        .reduce(ee.Reducer.mean()))
      .abs()
      .multiply(minRMSE);
    var rmse = ee.Number(timeSeries.first().get('rmse'))
      .max(minRMSE);
    return timeSeries.map(function(img) {
      var x = img.get('x');
      var residual = img.get('residual');
      var train = img.get('trainFitTime');
      return ee.Algorithms.If(
        train, 
        img.set({Z_train: ee.Number(
          ee.Algorithms.If(
            ee.Number(residual).divide(rmse).gt(maxZ),
            maxZ,
            ee.Number(residual).divide(rmse)
          )
        )}),
        ee.Algorithms.If(
          x,
          img.set({Z_monitor: ee.Number(
            ee.Algorithms.If(
              ee.Number(x).divide(rmse).gt(maxZ),
              maxZ,
              ee.Number(x).divide(rmse)
            )
          )}),
          img
        )
      );
    });
  };
  
  var checkPixelZScore = function(timeSeries, threshold) {
    return timeSeries.map(function(img) {
      var x = img.get('Z_monitor');
      return ee.Algorithms.If(
        x,
        ee.Algorithms.If(
          ee.Number(x).gt(threshold),
          img.set({Strike: x}),
          img.set({Ball: x})
          ),
        img);
    });
  };
  
  var monitorPixelChange = function(zScoreSeries, nrtParam) {
    var nrtDetect = function(zScores, nrtParam) {
      return ee.Number(ee.List(zScores.iterate(function(img, flags){
        flags = ee.List(flags);
        return ee.Algorithms.If(
          ee.Number(flags.get(-1)).gt(1),
          flags,
          ee.Algorithms.If(
            img.get('Strike'),
            ee.Algorithms.If(
              flags.slice(1).add(1).frequency(1).gte(nrtParam.n),
              flags.add(img.get('fitTime')),
              flags.slice(1).add(1)
            ),
            flags.slice(1).add(0)
          )
        );
      }, ee.List.repeat(0, nrtParam.m))).get(-1));
    };
    var flag = nrtDetect(zScoreSeries, nrtParam);
    return ee.Algorithms.If(
      flag.gt(0),
      zScoreSeries.map(function(img){
        var date = img.get('fitTime');
        var z = img.get('Strike');
        return ee.Algorithms.If(
          flag.eq(date),
          img.set({StrikeOut: z, Strike: null}),
          img
        );
      }),
      zScoreSeries
    );
  };
  
  var createNRTChart = function(table, lat, lon) {
    function formatTable(table) {
      var cols = [
        {id: 'A', label: 'Date', type: 'date'},
        {id: 'B', label: 'Training', type: 'number'},
        {id: 'C', label: 'Ball', type: 'number'},
        {id: 'D', label: 'Strike', type: 'number'},
        {id: 'E', label: 'StrikeOut', type: 'number'}
      ];
      var values = table.map(function(list) {
        return {c: list.map(function(item, index) {
          return {'v': index == 0 ? new Date(item): item};
        })};
      });
      return {cols: cols, rows: values};
    }
    var formatted = formatTable(table);
    var chart = ui.Chart(formatted, 'ScatterChart', {
      title: 'Pixel located at ' + lat.toFixed(3) + ', ' + lon.toFixed(3),
      pointSize: 1.8,
      vAxis: {
        title: 'Z Score',
        viewWindowMode: 'explicit',
      },
      height: '90%',
      stretch: 'both'
    });
    return chart;
  };
  
  // ---------------------------------------------------------------
  // Exports
  exports = {
    getData: getData,
    getImage: getImage,
    getLandsatImage: getLandsatImage,
    getLandsatTS: getLandsatTS,
    getSen2TS: getSen2TS,
    getSen2Img: getSen2Img,
    getSen1TS: getSen1TS,
    getSen1Img: getSen1Img,
    runCCD: runCCD,
    transformToTable: transformToTable,
    createCCDChart: createCCDChart,
    getTimeSeries: getTimeSeries,
    addPixelZScore: addPixelZScore,
    checkPixelZScore: checkPixelZScore,
    monitorPixelChange: monitorPixelChange,
    createNRTChart: createNRTChart,
    getCCDImage: getCCDImage,
    addSynthetic: addSynthetic,
    getResiduals: getResiduals,
    getChangeScores: getChangeScores,
    monitorChange: monitorChange,
    spatialFilter: spatialFilter
  };
  
  // Comments (nclinton).  This is too much for me to reformat.
  // Please adhere to Google JavaScript stype guidelines as
  // described in:
  // https://docs.google.com/document/d/19KQBEDA-hYQEg4EizWOXPRNLmeOyc77YqEkqtHH6770/edit?usp=sharing&resourcekey=0-SRpYwdFqCLHgB5rA145AAw
  
  // LGTM (nclinton)