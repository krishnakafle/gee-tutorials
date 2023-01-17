

// Function to calculate predicted ndvi and residuals from precipitation.
var calcPredNdviAndResiduals = function(img1) {
    var predNDVI = img1
        .select('scale')
        .multiply(img1.select('precipitation'))
        .add(img1.select('offset'))
        .rename('predictedNDVI');
    img1 = img1.addBands([predNDVI]);
    var residual = img1
        .select('predictedNDVI')
        .subtract(img1.select('greenness'))
        .multiply(-1) //Corrects direction of residual 
        .toFloat()
        .rename('residual');
    return img1.addBands([residual]);
  };
    
  // Prepares Collection to be run in LandTrendr subsetting Residual and Greenness.
  var compileresidualColl = function(image) {
    return image.select(['residual', 'greenness']);  
  };
  
  // Combine Precipitation and Greenness Lists into Image Collection
  var createResidColl = function(greenColl, precipColl, aoi) {
    
    // set some params
    var startYear_Num = 1985; 
    var endYear_Num   = 2019; 
    var numYears = endYear_Num - startYear_Num;
    var startMonth = '-01-01';  
    var endMonth = '-12-31';  
    
    // ----  HERE WE USE LISTS TO COMBINE the two Image Collections : 
    // Send GreennessColl to List to prepare integration of precip data.
    var greenestList = greenColl.toList(numYears + 1, 0);
    var precipList = precipColl.toList(numYears + 1, 0);
    
    // Add precipitation band to greenest pixel composites.
    var greenestWprecipList = ee.List([]);
    for (var i = 0; i <= numYears; i++) {
      var greenestThisYear = ee.Image(greenestList.get(i));
      greenestThisYear = greenestThisYear.addBands(precipList.get(i));
      greenestWprecipList = greenestWprecipList.add(greenestThisYear);
    }
    
    // Create New Image Collection of Precip and Greenest NDVI per Pixel per Year.
    var greenestWprecip = ee.ImageCollection(greenestWprecipList);
    
    var aoi_clip = function(image) {
      return image.clip(aoi);
    };
    
    // Clips Images in Collection
    var greenestWprecipColl = greenestWprecip.map(aoi_clip);
    
    //----------- Regress Precipitation and Greenness per Year per AOI
    
    // Precipitation vs ndvi regression.
    var linearFit = greenestWprecipColl
        .select(['precipitation', 'greenness'])
        .reduce(ee.Reducer.linearFit());
    
    // Function to add a list of scale and offset from 'linearFit' to collection.
    var addRegression2Collection = function(img) {
      var scale = linearFit.select('scale');
      var offset = linearFit.select('offset');
      return img.addBands([scale, offset]);
    };
    
    // Add scale and offset as bands in greenestWprecipList collection.
    greenestWprecipColl = greenestWprecipColl.map(addRegression2Collection); 
    
    // Calculate predicted ndvi and residuals.
    greenestWprecipColl = greenestWprecipColl.map(calcPredNdviAndResiduals);
    print(greenestWprecipColl, 'see all bands in here now'); 
    // FYI, this Image Collection now contains the following bands for each year:
    // greeness
    // precipitation        
    // scale
    // offset
    // predicted NDVI
    // residual
    
    // Maps compileresidualColl.
    var residualColl = greenestWprecipColl.map(compileresidualColl);
  
    return residualColl;
  };
  
  exports.createResidColl = createResidColl;
  
  // LGTM (nclinton)
  