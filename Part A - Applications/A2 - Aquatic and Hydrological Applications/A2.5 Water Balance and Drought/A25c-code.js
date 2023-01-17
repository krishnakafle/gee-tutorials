//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25c
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

// We apply a nested loop where we first iterate over 
// the relevant years and then iterate over the relevant 
// months. The function returns an image with P - ET
// for each month. A flatten is applied to convert an
// collection of collections into a single collection.
var waterBalance = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {

            var P = CHIRPS.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum();

            var ET = mod16.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum()
                .multiply(0.1);

            var wb = P.subtract(ET).rename('wb');

            return wb.set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

// Add layer with monthly mean. note that we clip for the Mekong river basin.
var balanceVis = {
    min: -50,
    max: 200,
    palette: 'red, orange, yellow, blue, darkblue, purple'
};

Map.addLayer(waterBalance.mean().clip(mekongBasin),
    balanceVis,
    'Mean monthly water balance');

// Set the title and axis labels for the chart.
var title = {
    title: 'Monthly water balance',
    hAxis: {
        title: 'Time'
    },
    vAxis: {
        title: 'Evapotranspiration (mm)'
    },
    colors: ['green']
};

// Plot the chart using the Mekong boundary.
var chartMonthly = ui.Chart.image.seriesByRegion({
        imageCollection: waterBalance,
        regions: mekongBasin.geometry(),
        reducer: ee.Reducer.mean(),
        band: 'wb',
        scale: 500,
        xProperty: 'system:time_start'
    }).setSeriesNames(['WB'])
    .setOptions(title)
    .setChartType('ColumnChart');

// Print the chart.
print(chartMonthly);

// -----------------------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------------------