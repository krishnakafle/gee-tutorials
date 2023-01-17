//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      Chapter A3.9 Conservation Applications - Assessing the 
//                spatial relationship between burned area and precipitation
//  Checkpoint:   A39b
//  Authors:      Harriet Branson, Chelsea Smith
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ** Upload the area of interest ** //
var AOI = ee.Geometry.Polygon([
    [
        [37.72, -11.22],
        [38.49, -11.22],
        [38.49, -12.29],
        [37.72, -12.29]
    ]
]);
Map.centerObject(AOI, 9);
Map.addLayer(AOI, {
    color: 'white'
}, 'Area of interest');

// ** MODIS Monthly Burn Area ** //

// Load in the MODIS Monthly Burned Area dataset.
var dataset = ee.ImageCollection('MODIS/006/MCD64A1')
    // Filter based on the timespan requirements.
    .filter(ee.Filter.date('2010-01-01', '2021-12-31'));

// Select the BurnDate band from the images in the collection.
var MODIS_BurnDate = dataset.select('BurnDate');

// A function that will calculate the area of pixels in each image by date.
var addArea = function(img) {
    var area = ee.Image.pixelArea()
        .updateMask(
            img
        ) // Limit area calculation to areas that have burned data.
        .divide(1e6) // Divide by 1,000,000 for square kilometers.
        .clip(AOI) // Clip to the input geometry.
        .reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: AOI,
            scale: 500,
            bestEffort: true
        }).getNumber(
            'area'
        ); // Retrieve area from the reduce region calculation.
    // Add a new band to each image in the collection named area.
    return img.addBands(ee.Image(area).rename('area'));
};

// Apply function on image collection.
var burnDateArea = MODIS_BurnDate.map(addArea);

// Select only the area band as we are using system time for date.
var burnedArea = burnDateArea.select('area');

// Create a chart that shows the total burned area over time.
var burnedAreaChart =
    ui.Chart.image
    .series({
        imageCollection: burnedArea, // Our image collection.
        region: AOI,
        reducer: ee.Reducer.mean(),
        scale: 500,
        xProperty: 'system:time_start' // time
    })
    .setSeriesNames(['Area']) // Label for legend.
    .setOptions({
        title: 'Total monthly area burned in AOI',
        hAxis: {
            title: 'Date', // The x axis label.
            format: 'YYYY', // Years only for date format.
            gridlines: {
                count: 12
            },
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxis: {
            title: 'Total burned area (km²)', // The y-axis label
            maxValue: 2250, // The bounds for y-axis
            minValue: 0,
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        lineWidth: 1.5,
        colors: ['d74b46'], // The line color
    });
print(burnedAreaChart);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

// Load in the CHIRPS rainfall pentad dataset.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Define the temporal range
var startyear = 2010;
var endyear = 2021;

// Set the advancing dates from the temporal range.
var startdate = ee.Date.fromYMD(startyear, 1, 1);
var enddate = ee.Date.fromYMD(endyear, 12, 31);

// Create a list of years
var years = ee.List.sequence(startyear, endyear);
// Create a list of months
var months = ee.List.sequence(1, 12);

// Filter the dataset based on the temporal range.
var Pchirps = chirps.filterDate(startdate, enddate)
    .sort('system:time_start',
        false) // Sort chronologically in descending order.
    .filterBounds(AOI) // Filter to AOI
    .select('precipitation'); // Select precipitation band
    
// Calculate the precipitation per month.
var MonthlyRainfall = ee.ImageCollection.fromImages(
    years.map(function(
        y
    ) { // Using the list of years based on temporal range.
        return months.map(function(m) {
            var w = Pchirps.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum(); // Calculating the sum for the month
            return w.set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1).millis()
                ) // Use millis to keep the system time number.
                .set('date', ee.Date.fromYMD(y, m,
                    1));
        });
    }).flatten());
// Print the image collection.
print('Monthly Precipitation Image Collection', MonthlyRainfall);

// ** Chart: CHIRPS Precipitation ** //

// Create a chart displaying monthly rainfall over a temporal range.
var monthlyRainfallChart =
    ui.Chart.image
    .series({
        imageCollection: MonthlyRainfall.select(
            'precipitation'), // Select precipitation band
        region: AOI,
        reducer: ee.Reducer
            .mean(), // Use mean reducer to calculate AMR
        scale: 500,
        xProperty: 'system:time_start' // Use system time start for x-axis
    })
    .setSeriesNames(['Precipitation']) // /The label legend
    .setOptions({
        title: 'Total monthly precipitation in AOI', // Add title
        hAxis: {
            title: 'Date',
            format: 'YYYY', // Year only date format
            gridlines: {
                count: 12
            },
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxis: {
            title: 'Precipitation (mm)', // The y-axis label
            maxValue: 450, // The bounds for y-axis
            minValue: 0,
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        lineWidth: 1.5,
        colors: ['4f5ebd'],
    });
print(monthlyRainfallChart);

// 2010/2011 wet season total
var year = 2010; // Adjust year
var startDate = ee.Date.fromYMD(year, 11, 1); // Adjust months/days
var endDate = ee.Date.fromYMD(year + 1, 5, 31); // Adjust months/days
var filtered = chirps
    .filter(ee.Filter.date(startDate, endDate));
var Rains10_11Total = filtered.reduce(ee.Reducer.sum()).clip(AOI);

// 2011/2012 wet season total
var year = 2011; // Adjust year
var startDate = ee.Date.fromYMD(year, 11, 1); // Adjust months/days
var endDate = ee.Date.fromYMD(year + 1, 5, 31); // Adjust months/days
var filtered = chirps
    .filter(ee.Filter.date(startDate, endDate));
var Rains11_12Total = filtered.reduce(ee.Reducer.sum()).clip(AOI);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
