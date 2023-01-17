// Snapshot of users/andreasvollrath/radar:slope_correction_lib.js 
// on 11/4/2020 (reformated)

var slope_correction = function (collection, options) {
    // Set defaults if undefined.
    options = options || {};
    var model = options.model || 'volume';
    var elevation = options.elevation || ee.Image('USGS/SRTMGL1_003');
    var buffer = options.buffer || 0;
   
    // We need a 90 degree in radians 
    // image for a couple of calculations.
    var ninetyRad = ee.Image.constant(90)
      .multiply(Math.PI/180);
    
    // Volumetric model Hoekman 1990.
    function _volume_model(theta_iRad, alpha_rRad) {
      var nominator = (ninetyRad.subtract(theta_iRad).add(alpha_rRad))
        .tan();
      var denominator = (ninetyRad.subtract(theta_iRad))
        .tan();
      return nominator.divide(denominator);
    }
    
    // Surface model Ulander et al. 1996.
    function _surface_model(theta_iRad, alpha_rRad, alpha_azRad) {
      var nominator = (ninetyRad.subtract(theta_iRad))
        .cos();
      var denominator = alpha_azRad
        .cos()
        .multiply((ninetyRad
          .subtract(theta_iRad)
          .add(alpha_rRad))
          .cos()
        );
      return nominator.divide(denominator);
    }
    
    // Buffer function (thanks Noel).
    function _erode(img, distance) {
      var d = img
        .not()
        .unmask(1)
        .fastDistanceTransform(30)
        .sqrt()
        .multiply(ee.Image.pixelArea().sqrt());
      return img.updateMask(d.gt(distance));
    }    
    
    // Calculate masks.
    function _masking(alpha_rRad, theta_iRad, proj, buffer) {
      // Layover, where slope > radar viewing angle.
      var layover = alpha_rRad.lt(theta_iRad).rename('layover');
      // Shadow.
      var shadow = alpha_rRad
        .gt(ee.Image.constant(-1)
        .multiply(ninetyRad.subtract(theta_iRad)))
        .rename('shadow');
      // Combine layover and shadow.
      var mask = layover.and(shadow);
      // Add buffer to final mask.
      if (buffer > 0) {mask = _erode(mask, buffer)}
      return mask.rename('no_data_mask');
    }
  
    function _correct(image) {
      // Get image geometry and projection .
      var geom = image.geometry();
      var proj = image.select(1).projection();
  
      // Get look direction angle.
      var heading = ee.Terrain.aspect(image.select('angle'))
        .reduceRegion(ee.Reducer.mean(), geom, 1000)
        .get('aspect');
      
      // The numbering follows the article chapters.
      // Sigma0 to Power of input image.
      var sigma0Pow = ee.Image.constant(10)
        .pow(image.divide(10.0));
     
      // 2.1.1 radar geometry.
      var theta_iRad = image
        .select('angle')
        .multiply(Math.PI/180)
        .clip(geom);
      var phi_iRad = ee.Image.constant(heading)
        .multiply(Math.PI/180);
      
      // 2.1.2 terrain geometry.
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
      
      // 2.1.3 model geometry.
      // Reduce to 3 angle.
      var phi_rRad = phi_iRad.subtract(phi_sRad);
  
      // Slope steepness in range (eq. 2).
      var alpha_rRad = (alpha_sRad.tan().multiply(phi_rRad.cos()))
        .atan();
  
      // Slope steepness in azimuth (eq 3).
      var alpha_azRad = (alpha_sRad.tan().multiply(phi_rRad.sin()))
        .atan();
  
      // 2.2 gamma_nought.
      var gamma0 = sigma0Pow.divide(theta_iRad.cos());
        
      // Models.
      if (model == 'volume') {
        var corrModel = _volume_model(theta_iRad, alpha_rRad);
      }
      if (model == 'surface') {
        var corrModel = _surface_model(theta_iRad, alpha_rRad, alpha_azRad);
      }
      if (model == 'direct') {
        var corrModel = _direct_model(theta_iRad, alpha_rRad, alpha_azRad);
      }
  
      // Apply model for Gamm0_f.
      var gamma0_flat = gamma0.divide(corrModel);
  
      // Transform to dB-scale.
      var gamma0_flatDB = ee.Image.constant(10)
        .multiply(gamma0_flat.log10())
        .select(['VV', 'VH']);
  
      // Get layover / shadow mask.
      var mask = _masking(alpha_rRad, theta_iRad, proj, buffer);
  
      // Return gamma_flat plus mask.
      return gamma0_flatDB
        .addBands(mask)
        .copyProperties(image);
    }
  
    // Run and return correction.
    return collection.map(_correct);
  };
  
  
  var slope_correction_image = function (image, options) {
    // Set defaults if undefined.
    options = options || {};
    var model = options.model || 'volume';
    var elevation = options.elevation || ee.Image('USGS/SRTMGL1_003');
    var buffer = options.buffer || 0;
   
    // We need a 90 degree in radians 
    // image for a couple of calculations.
    var ninetyRad = ee.Image.constant(90)
      .multiply(Math.PI/180);
    
    // Volumetric Model Hoekman 1990
    function _volume_model(theta_iRad, alpha_rRad) {
      var nominator = (ninetyRad.subtract(theta_iRad).add(alpha_rRad))
        .tan();
      var denominator = (ninetyRad.subtract(theta_iRad))
        .tan();
      return nominator.divide(denominator);
    }
    
    // Surface model Ulander et al. 1996.
    function _surface_model(theta_iRad, alpha_rRad, alpha_azRad) {
      var nominator = (ninetyRad.subtract(theta_iRad))
        .cos();
      var denominator = alpha_azRad
        .cos()
        .multiply((ninetyRad
          .subtract(theta_iRad)
          .add(alpha_rRad))
          .cos()
        );
      return nominator.divide(denominator);
    }
    
    // Buffer function (thanks Noel).
    function _erode(img, distance) {
      var d = img
        .not()
        .unmask(1)
        .fastDistanceTransform(30)
        .sqrt()
        .multiply(ee.Image.pixelArea().sqrt());
      return img.updateMask(d.gt(distance));
    }    
    
    // Calculate masks.
    function _masking(alpha_rRad, theta_iRad, proj, buffer) {
      // Layover where slope > radar viewing angle.
      var layover = alpha_rRad
        .lt(theta_iRad)
        .rename('layover');
      // Shadow.
      var shadow = alpha_rRad
        .gt(ee.Image.constant(-1).multiply(ninetyRad.subtract(theta_iRad)))
        .rename('shadow');
      // Combine layover and shadow.
      var mask = layover.and(shadow);
      // Add buffer to final mask.
      if (buffer > 0) {mask = _erode(mask, buffer)}
      return mask.rename('no_data_mask');
    }
  
    function _correct(image){
      // Get image geometry and projection.
      var geom = image.geometry();
      var proj = image.select(1).projection();
      
      // Get look direction angle.
      var heading = ee.Terrain.aspect(image.select('angle'))
        .reduceRegion(ee.Reducer.mean(), geom, 1000)
        .get('aspect');
  
      // The numbering follows the article chapters.
      // 2.1.1 radar geometry.
      var theta_iRad = image
        .select('angle')
        .multiply(Math.PI/180)
        .clip(geom);
      var phi_iRad = ee.Image.constant(heading)
        .multiply(Math.PI/180);
  
      // 2.1.2 terrain geometry.
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
      
      // 2.1.3 model geometry.
      // Reduce to 3 angle.
      var phi_rRad = phi_iRad.subtract(phi_sRad);
  
      // Slope steepness in range (eq. 2).
      var alpha_rRad = (alpha_sRad.tan().multiply(phi_rRad.cos()))
        .atan();
  
      // Slope steepness in azimuth (eq 3).
      var alpha_azRad = (alpha_sRad.tan().multiply(phi_rRad.sin()))
        .atan();
  
      // 2.2 gamma_nought.
      var gamma0 = image.divide(theta_iRad.cos());
        
      // Models
      if (model == 'volume') {
        var corrModel = _volume_model(theta_iRad, alpha_rRad);
      }
      if (model == 'surface') {
        var corrModel = _surface_model(theta_iRad, alpha_rRad, alpha_azRad);
      }
      if (model == 'direct') {
        var corrModel = _direct_model(theta_iRad, alpha_rRad, alpha_azRad);
      }
  
      // Apply model for Gamm0_f
      var gamma0_flat = gamma0
        .select(['VV', 'VH'])
        .divide(corrModel);
  
      // Get layover / shadow mask
      var mask = _masking(alpha_rRad, theta_iRad, proj, buffer);
  
      // Return gamma_flat plus mask.
      return gamma0_flat
        .addBands(image.select('angle'))
        .addBands(mask)
        .copyProperties(image)
        .set('system:time_start', image.get('system:time_start'));
    }
  
    // Run and return correction.
    return ee.Image(_correct(image));
  };
  
  // Export function.
  exports.slope_correction = slope_correction;
  exports.slope_correction_image = slope_correction_image;
  
  // Comments (nclinton).  This is too much for me to reformat.
  // Please adhere to Google JavaScript stype guidelines as
  // described in:
  // https://docs.google.com/document/d/19KQBEDA-hYQEg4EizWOXPRNLmeOyc77YqEkqtHH6770/edit?usp=sharing&resourcekey=0-SRpYwdFqCLHgB5rA145AAw
  
  // LGTM (nclinton)
  