//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25b
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

// Import the MOD16 dataset.
var mod16 = ee.ImageCollection('MODIS/006/MOD16A2').select('ET');

// Filter for the relevant time period.
mod16 = mod16.filterDate(startDate, endDate);

// We apply a nested loop where we first map over 
// the relevant years and then map over the relevant 
// months. The function returns an image with the total (sum)
// evapotranspiration for each month. A flatten is applied to convert a
// collection of collections into a single collection.
// We multiply by 0.1 because of the ET scaling factor. 
var monthlyEvap = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {
            var w = mod16.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum()
                .multiply(0.1);
            return w.set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

// Add the layer with monthly mean. Note that we clip for the Mekong river basin.
var evapVis = {
    min: 0,
    max: 140,
    palette: 'red, orange, yellow, blue, darkblue'
};

Map.addLayer(monthlyEvap.mean().clip(mekongBasin),
    evapVis,
    'Mean monthly ET');

// Set the title and axis labels for the chart.
var title = {
    title: 'Monthly evapotranspiration',
    hAxis: {
        title: 'Time'
    },
    vAxis: {
        title: 'Evapotranspiration (mm)'
    },
    colors: ['red']
};

// Plot the chart using the Mekong boundary.
var chartMonthly = ui.Chart.image.seriesByRegion({
        imageCollection: monthlyEvap,
        regions: mekongBasin.geometry(),
        reducer: ee.Reducer.mean(),
        band: 'ET',
        scale: 500,
        xProperty: 'system:time_start'
    }).setSeriesNames(['ET'])
    .setOptions(title)
    .setChartType('ColumnChart');

// Print the chart.
print(chartMonthly);

// -----------------------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------------------