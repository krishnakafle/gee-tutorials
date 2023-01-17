//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25s3
//  Author:       Ate Poortinga, Quyen Nguyen, Nyein Soe Thwal, Andréa Puzzi Nicolau
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import the Lower Mekong boundary.
var mekongBasin = ee.FeatureCollection(
    'projects/gee-book/assets/A2-5/lowerMekongBasin');

Map.centerObject(mekongBasin, 6);

var classStruct = {
    'unknown': {
        number: 0,
        color: '6f6f6f'
    },
    'surface water': {
        number: 1,
        color: 'aec3d4'
    },
    'snow and ice': {
        number: 2,
        color: 'b1f9ff'
    },
    'mangroves': {
        number: 3,
        color: '111149'
    },
    'flooded forest': {
        number: 4,
        color: '287463'
    },
    'Deciduous forest': {
        number: 5,
        color: '152106'
    },
    'Orchard or plantation forest': {
        number: 6,
        color: 'c3aa69'
    },
    'evergreen Broadleaf': {
        number: 7,
        color: '7db087'
    },
    'mixed forest': {
        number: 8,
        color: '387242'
    },
    'urban and built up': {
        number: 9,
        color: 'cc0013'
    },
    'cropland': {
        number: 10,
        color: '8dc33b'
    },
    'rice': {
        number: 11,
        color: 'ffff00'
    },
    'mining': {
        number: 12,
        color: 'cec2a5'
    },
    'barren': {
        number: 13,
        color: '674c06'
    },
    'wetlands': {
        number: 14,
        color: '3bc3b2'
    },
    'grassland': {
        number: 15,
        color: 'f4a460'
    },
    'shrubland': {
        number: 16,
        color: '800080'
    },
    'aquaculture': {
        number: 17,
        color: '51768e'
    }
};

// Function to get a list of ids (keys) from a structure.
function getIds(struct) {
    return Object.keys(struct);
}

// Function to replace spaces with underscores in a list of strings.
function cleanList(list) {
    return list.map(function(name) {
        return name.replace(/\s+/g, '_');
    });
}

// Function to get a list of column values from a structure.
function getList(struct, column) {
    return Object.keys(struct).map(function(k) {
        var value = struct[k][column];
        return value;
    });
}

var classNamesList = getIds(classStruct);
var probNames = cleanList(classNamesList);
var classNames = ee.List(classNamesList);
var classNumbers = getList(classStruct, 'number');
var paletteList = getList(classStruct, 'color');
var PALETTE = paletteList.join(',');

// JSON dictionary that defines piechart colors based on the
// landcover class palette.
// https://developers.google.com/chart/interactive/docs/gallery/piechart
var colors = [];
for (var i = 0; i < paletteList.length; i++) {
    colors.push({
        'color': '_'.replace('_', paletteList[i])
    });
}

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

// Filter for relevant time period.
mod16 = mod16.filterDate(startDate, endDate);

// Import the CHIRPS dataset.
var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Filter for relevant time period.
CHIRPS = CHIRPS.filterDate(startDate, endDate);

var landcover = ee.Image(
        'projects/gee-book/assets/A2-5/RLCMSv3/Mekonglandcover2018')
    .select('lc').clip(mekongBasin);

var lcVis = {
    palette: PALETTE,
    min: 0,
    max: classNamesList.length - 1
};
Map.addLayer(landcover, lcVis, '2018 Land Cover');

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

            return wb.addBands(P).addBands(ET).set(
                    'year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));
        });
    }).flatten()
);

var wbMonth = ee.ImageCollection(months.map(function(m) {
    var wbM = waterBalance.filter(ee.Filter.eq('month',
            m))
        .mean()
        .select('wb');
    return ee.Image(wbM).set('month', m);
}));

// We convert the image collection to an image.
var wbMonth = wbMonth.toBands()
    .select(['0_wb', '1_wb', '2_wb',
            '3_wb', '4_wb', '5_wb',
            '6_wb', '7_wb', '8_wb',
            '9_wb', '10_wb', '11_wb'
        ],
        ['01_wb', '02_wb', '03_wb',
            '04_wb', '05_wb', '06_wb',
            '07_wb', '08_wb', '09_wb',
            '10_wb', '11_wb', '12_wb'
        ]);

// Select our classes of interest. 
var classNumbers = ee.List([5, 7, 10, 11]);

// Apply reducer per land cover category.
// We create binary map for each class and multiply by the monthly water balance.
// The results are stored in a feature with other properties of the class.
// The function returns a feature which are stored in a feature collection.
var lcFc = ee.FeatureCollection(classNumbers.map(function(nr) {
    var lc = landcover.eq(ee.Number(nr));
    var wbM = wbMonth.multiply(lc);
    var wbSum = wbM.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: mekongBasin,
        scale: 1000
    });
    return ee.Feature(null).set(wbSum)
        .set('label', classNames.get(nr))
        .set('palette', paletteList[nr])
        .set('class_number', nr);
}));

var chart = ui.Chart.feature.byFeature({
        features: lcFc.select('[0-9][0-9]_wb|label'),
        xProperty: 'label',
    })
    .setSeriesNames(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ])
    .setChartType('ColumnChart')
    .setOptions({
        title: 'water balance',
        hAxis: {
            title: 'landcover type',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        vAxis: {
            title: 'Water balance (mm)',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        colors: ['604791', '1d6b99', '39a8a7', '0f8755', '76b349',
            'f0af07',
            'e37d05', 'cf513e', '96356f', '724173', '9c4f97',
            '696969'
        ]
    });

print(chart);

// Create the panel for the legend items.
var legend = ui.Panel({
    style: {
        position: 'bottom-left',
        padding: '8px 15px'
    }
});

// Create and add the legend title.
var legendTitle = ui.Label({
    value: 'Legend',
    style: {
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '0 0 4px 0',
        padding: '0'
    }
});

// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
    // Create the label that is actually the colored box.
    var colorBox = ui.Label({
        style: {
            backgroundColor: '#' + color,
            // Use padding to give the box height and width.
            padding: '8px',
            margin: '0 0 4px 0'
        }
    });

    // Create the label filled with the description text.
    var description = ui.Label({
        value: name,
        style: {
            margin: '0 0 4px 6px'
        }
    });

    return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
    });
};

legend.add(legendTitle);
for (var i = 0; i < classNamesList.length; i++) {
    legend.add(makeRow(paletteList[i], classNamesList[i]));
}

// Add the legend to the map.
Map.add(legend);

// -----------------------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------------------