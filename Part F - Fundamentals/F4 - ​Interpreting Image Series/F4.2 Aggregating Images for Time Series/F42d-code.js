//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.2 Aggregating Images for Time Series
//  Checkpoint:   F42d
//  Author:       Ujaval Gandhi
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');
var year = 2019;
var startDate = ee.Date.fromYMD(year, 1, 1);

var endDate = startDate.advance(1, 'year');

var yearFiltered = chirps
    .filter(ee.Filter.date(startDate, endDate));
print(yearFiltered, 'Date-filtered CHIRPS images');

print(startDate, 'Start date');
print(endDate, 'End date');

print('Start date as timestamp', startDate.millis());
print('End date as timestamp', endDate.millis());

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Aggregate this time series to compute monthly images.
// Create a list of months
var months = ee.List.sequence(1, 12);

// Write a function that takes a month number
// and returns a monthly image.
var createMonthlyImage = function(beginningMonth) {
    var startDate = ee.Date.fromYMD(year, beginningMonth, 1);
    var endDate = startDate.advance(1, 'month');
    var monthFiltered = yearFiltered
        .filter(ee.Filter.date(startDate, endDate));

    // Calculate total precipitation.
    var total = monthFiltered.reduce(ee.Reducer.sum());
    return total.set({
        'system:time_start': startDate.millis(),
        'system:time_end': endDate.millis(),
        'year': year,
        'month': beginningMonth
    });
};

// map() the function on the list of months
// This creates a list with images for each month in the list
var monthlyImages = months.map(createMonthlyImage);

// Create an ee.ImageCollection.
var monthlyCollection = ee.ImageCollection.fromImages(monthlyImages);
print(monthlyCollection);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Create a point with coordinates for the city of Bengaluru, India.
var point = ee.Geometry.Point(77.5946, 12.9716);

var chart = ui.Chart.image.series({
    imageCollection: monthlyCollection,
    region: point,
    reducer: ee.Reducer.mean(),
    scale: 5566,
});
print(chart);


var chart = ui.Chart.image.series({
    imageCollection: monthlyCollection,
    region: point,
    reducer: ee.Reducer.mean(),
    scale: 5566
}).setOptions({
    lineWidth: 1,
    pointSize: 3,
    title: 'Monthly Rainfall at Bengaluru',
    vAxis: {
        title: 'Rainfall (mm)'
    },
    hAxis: {
        title: 'Month',
        gridlines: {
            count: 12
        }
    }
});
print(chart);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

