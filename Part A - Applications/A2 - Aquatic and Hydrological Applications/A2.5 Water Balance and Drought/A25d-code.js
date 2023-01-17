//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25d
//  Authors:      Ate Poortinga, Quyen Nguyen, Nyein Soe Thwal, Andréa Puzzi Nicolau
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import the Lower Mekong boundary.
var mekongBasin = ee.FeatureCollection(
    'projects/gee-book/assets/A2-5/lowerMekongBasin');

// Center the map.
Map.centerObject(mekongBasin, 5);

// Add the Lower Mekong Basin boundary to the map.
Map.addLayer(mekongBasin, {}, 'Lower Mekong basin');

// Set start and end years.
var startYear = 2010;
var endYear = 2020;

// Create two date objects for start and end years.
var startDate = ee.Date.fromYMD(startYear, 1, 1);
var endDate = ee.Date.fromYMD(endYear + 1, 1, 1);

// Make a list with years.
var years = ee.List.sequence(startYear, endYear);

// Make a list with months.
var months = ee.List.sequence(1, 12);

// Import the CHIRPS dataset.
var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Filter for relevant time period.
CHIRPS = CHIRPS.filterDate(startDate, endDate);

// Import the MOD16 dataset.
var mod16 = ee.ImageCollection('MODIS/006/MOD16A2').select('ET');

// Filter for relevant time period.
mod16 = mod16.filterDate(startDate, endDate);

// Import and filter the MOD13 dataset.
var mod13 = ee.ImageCollection('MODIS/006/MOD13A1');
mod13 = mod13.filterDate(startDate, endDate);

// Select the EVI.
var EVI = mod13.select('EVI');

// Import and filter the MODIS Terra surface reflectance dataset.
var mod09 = ee.ImageCollection('MODIS/006/MOD09A1');
mod09 = mod09.filterDate(startDate, endDate);

// We use a function to remove clouds and cloud shadows.
// We map over the mod09 image collection and select the StateQA band.
// We mask pixels and return the image with clouds and cloud shadows masked.
mod09 = mod09.map(function(image) {
    var quality = image.select('StateQA');
    var mask = image.and(quality.bitwiseAnd(1).eq(
            0)) // No clouds.
        .and(quality.bitwiseAnd(2).eq(0)); // No cloud shadow.

    return image.updateMask(mask);
});

// We use a function to calculate the Moisture Stress Index.
// We map over the mod09 image collection and select the NIR and SWIR bands
// We set the timestamp and return the MSI.
var MSI = mod09.map(function(image) {
    var nirband = image.select('sur_refl_b02');
    var swirband = image.select('sur_refl_b06');

    var msi = swirband.divide(nirband).rename('MSI')
        .set('system:time_start', image.get(
            'system:time_start'));
    return msi;
});

// We apply a nested loop where we first iterate over 
// the relevant years and then iterate over the relevant 
// months. The function returns an image with bands for 
// water balance (wb), rainfall (P), evapotranspiration (ET),
// EVI and MSI for each month. A flatten is applied to 
// convert an collection of collections 
// into a single collection.
var ic = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {
            // Calculate rainfall.
            var P = CHIRPS.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum();

            // Calculate evapotranspiration.
            var ET = mod16.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum()
                .multiply(0.1);

            // Calculate EVI.
            var evi = EVI.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .mean()
                .multiply(0.0001);

            // Calculate MSI.
            var msi = MSI.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .mean();

            // Calculate monthly water balance.
            var wb = P.subtract(ET).rename('wb');

            // Return an image with all images as bands.
            return ee.Image.cat([wb, P, ET, evi, msi])
                .set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

// Add the mean monthly EVI and MSI to the map.
var eviVis = {
    min: 0,
    max: 0.7,
    palette: 'red, orange, yellow, green, darkgreen'
};

Map.addLayer(ic.select('EVI').mean().clip(mekongBasin),
    eviVis,
    'EVI');

var msiVis = {
    min: 0.25,
    max: 1,
    palette: 'darkblue, blue, yellow, orange, red'
};

Map.addLayer(ic.select('MSI').mean().clip(mekongBasin),
    msiVis,
    'MSI');

// Define the water balance chart and print it to the console.
var chartWB =
    ui.Chart.image.series({
        imageCollection: ic.select(['wb', 'precipitation', 'ET']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 5000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['wb', 'P', 'ET'])
    .setOptions({
        title: 'water balance',
        hAxis: {
            title: 'Date',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxis: {
            title: 'Water (mm)',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        lineWidth: 1,
        colors: ['green', 'blue', 'red'],
        curveType: 'function'
    });

// Print the water balance chart.
print(chartWB);

// Define the indices chart and print it to the console.
var chartIndices =
    ui.Chart.image.series({
        imageCollection: ic.select(['EVI', 'MSI']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 5000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['EVI', 'MSI'])
    .setOptions({
        title: 'Monthly indices',
        hAxis: {
            title: 'Date',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxis: {
            title: 'Index',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        lineWidth: 1,
        colors: ['darkgreen', 'brown'],
        curveType: 'function'
    });

// Print the indices chart.
print(chartIndices);

// -----------------------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------------------