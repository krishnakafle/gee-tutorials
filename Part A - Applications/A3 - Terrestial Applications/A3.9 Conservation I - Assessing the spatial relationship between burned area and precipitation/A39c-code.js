//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      Chapter A3.9 Conservation Applications - Assessing the 
//                spatial relationship between burned area and precipitation
//  Checkpoint:   A39c
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

// ** Combine: CHIRPS Average Rainfall & MODIS Monthly Burn ** //

// Combine the two image collections for joint analysis
var bpMerged = burnedArea.merge(MonthlyRainfall);
print('Merged image collection', bpMerged);

// ** Chart: CHIRPS Average Rainfall & MODIS Monthly Burn ** //
// Plot the two time series on a graph
var bpChart =
    ui.Chart.image.series({
        imageCollection: bpMerged, // The merged image collection
        region: AOI,
        reducer: ee.Reducer.mean(),
        scale: 500,
        xProperty: 'system:time_start' // Use system time start for synchronous plotting
    })
    .setSeriesNames(['Burned Area', 'Precipitation']) // Label series
    .setChartType('LineChart') // Define chart type
    .setOptions({
        title: 'Relationship between burned area and rainfall in Chuilexi',
        interpolateNulls: true, // Interpolate nulls to provide continuous data
        series: { // Use two sets of series with a target axis to create the two y-axes needed for plotting
            0: { // 0 and 1 reference the vAxes settings below
                targetAxisIndex: 0,
                type: 'line',
                lineWidth: 1.5,
                color: 'd74b46'
            },
            1: {
                targetAxisIndex: 1,
                type: 'line',
                lineWidth: 1.5,
                color: '4f5ebd'
            },
        },
        hAxis: {
            title: 'Date',
            format: 'YYYY',
            gridlines: {
                count: 12
            },
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxes: {
            0: {
                title: 'Burned area (km²)', // Label left-hand y-axis
                baseline: 0,
                viewWindow: {
                    min: 0
                },
                titleTextStyle: {
                    italic: false,
                    bold: true
                }
            },
            1: {
                title: 'Precipitation (mm)', // Label right-hand y-axis
                baseline: 0,
                viewWindow: {
                    min: 0
                },
                titleTextStyle: {
                    italic: false,
                    bold: true
                }
            },
        },
        curveType: 'function' // For smoothing
    });
bpChart.style().set({
    position: 'bottom-right',
    width: '492px',
    height: '300px'
});

// ** Legend: Rainfall ** //
var rain_palette = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8',
    '#253494'
];

function ColorBar(rain_palette) {
    return ui.Thumbnail({
        image: ee.Image.pixelLonLat().select(0),
        params: {
            bbox: [0, 0, 1, 0.1],
            dimensions: '300x15',
            format: 'png',
            min: 0,
            max: 1,
            palette: rain_palette,
        },
        style: {
            stretch: 'horizontal',
            margin: '0px 22px'
        },
    });
}

function makeRainLegend(lowLine, midLine, highLine, lowText, midText,
    highText, palette) {
    var labelheader = ui.Label(
        'Total precipitation in wet season (mm)', {
            margin: '5px 17px',
            textAlign: 'center',
            stretch: 'horizontal',
            fontWeight: 'bold'
        });
    var labelLines = ui.Panel(
        [
            ui.Label(lowLine, {
                margin: '-4px 21px'
            }),
            ui.Label(midLine, {
                margin: '-4px 0px',
                textAlign: 'center',
                stretch: 'horizontal'
            }),
            ui.Label(highLine, {
                margin: '-4px 21px'
            })
        ],
        ui.Panel.Layout.flow('horizontal'));
    var labelPanel = ui.Panel(
        [
            ui.Label(lowText, {
                margin: '0px 14.5px'
            }),
            ui.Label(midText, {
                margin: '0px 0px',
                textAlign: 'center',
                stretch: 'horizontal'
            }),
            ui.Label(highText, {
                margin: '0px 1px'
            })
        ],
        ui.Panel.Layout.flow('horizontal'));
    return ui.Panel({
        widgets: [labelheader, ColorBar(rain_palette),
            labelLines, labelPanel
        ],
        style: {
            position: 'bottom-left'
        }
    });
}
Map.add(makeRainLegend('|', '|', '|', '0', '250', '500', ['#ffffcc',
    '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'
]));

// ** Legend: Burned area ** //
var burnLegend = ui.Panel({
    style: {
        position: 'top-left',
        padding: '8px 15px'
    }
});

var makeRow = function(color, name) {
    var colorBox = ui.Label({
        style: {
            backgroundColor: '#' + color,
            padding: '10px',
            margin: '0 10px 0 0'
        }
    });
    var description = ui.Label({
        value: name,
        style: {
            margin: 'o o 6px 6px'
        }
    });
    return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
    });
};

var burnPalette = ['FF0000'];
var names = ['Burned area'];
for (var i = 0; i < 1; i++) {
    burnLegend.add(makeRow(burnPalette[i], names[i]));
}
Map.add(burnLegend);

Map.centerObject(AOI, 9); // Centre the map on the AOI
Map.add(
    bpChart
); // Add the merged burned area & precipitation chart to the map

// ** Chart: Adding an interactive query ** //

// Add a function where if you click on a point in the map it displays the burned area and rainfall for that date
bpChart.onClick(function(xValue, yValue, seriesName) {
    if (!xValue) return;
    // Show layer for date selected on the chart
    var equalDate = ee.Filter.equals('system:time_start',
        xValue);
    // Search for the layer in the image collection that links to the selected date
    var classificationB = ee.Image(MODIS_BurnDate.filter(
        equalDate).first()).clip(AOI).select('BurnDate');
    var classificationR = ee.Image(MonthlyRainfall.filter(
        equalDate).first()).clip(AOI).select(
        'precipitation');
    var burnImage = ee.Image(MODIS_BurnDate.filter(equalDate)
        .first());
    var date_string = new Date(xValue).toLocaleString(
        'en-EN', {
            dateStyle: 'full'
        });
    var rainImage = ee.Image(MonthlyRainfall.filter(equalDate)
        .first());
    var date_stringR = new Date(xValue).toLocaleString(
        'en-EN', {
            dateStyle: 'full'
        });
    // Reset the map layers each time a new date is clicked
    Map.layers().reset([classificationB]);
    Map.layers().reset([classificationR]);
    var visParamsBurnLayer = { // Visualisation for burned area
        min: 0,
        max: 365,
        palette: ['red']
    };
    var visParamsRainLayer = { // Visualisation for rain
        min: 0,
        max: 450,
        palette: ['#ffffcc', '#a1dab4', '#41b6c4',
            '#2c7fb8', '#253494'
        ]
    };
    // Add the layers to the map
    Map.addLayer(classificationR, visParamsRainLayer,
        'Total monthly rainfall on [' + date_string + ']');
    Map.addLayer(classificationB, visParamsBurnLayer,
        'Burned area on [' + date_string + ']');
});

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------
