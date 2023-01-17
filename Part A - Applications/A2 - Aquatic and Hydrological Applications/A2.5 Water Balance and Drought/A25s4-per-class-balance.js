//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25s4
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

// Import and filter the MOD13 dataset.
var mod13 = ee.ImageCollection('MODIS/006/MOD13A1');
mod13 = mod13.filterDate(startDate, endDate);

// Select the EVI.
var EVI = mod13.select('EVI');

// Import and filter the MODIS Terra surface reflectance dataset.
var mod09 = ee.ImageCollection('MODIS/006/MOD09A1');
mod09 = mod09.filterDate(startDate, endDate);

var landcover = ee.Image(
        'projects/gee-book/assets/A2-5/RLCMSv3/Mekonglandcover2018')
    .select('lc').clip(mekongBasin);

var lcVis = {
    palette: PALETTE,
    min: 0,
    max: classNamesList.length - 1
};
Map.addLayer(landcover, lcVis, '2018 Land Cover');

// We use a function to remove clouds and cloud shadows.
// We map over the mod09 image collection and select the StateQA band.
// We mask pixels and return the image with clouds and cloud shadows masked.
var mod09 = mod09.map(function(image) {
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
    var msi = swirband.divide(nirband)
        .rename('MSI')
        .set('system:time_start', image.get(
            'system:time_start'));
    return msi;
});

// We apply a nested loop where we first iterate over 
// the relevant years and then iterate over the relevant 
// months. The function returns an image with the MSI and EVI
// for each month. A flatten is applied to convert an
// collection of collections into a single collection.
var monthlyIndices = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {

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

            // Return an image with all images as bands.
            return evi.addBands(msi)
                .set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

// We select the landcover types for evergreen, deciduous forest, cropland and rice.
var evergreenForest = landcover.eq(7);
var deciduousForest = landcover.eq(5);
var cropland = landcover.eq(10);
var rice = landcover.eq(11);

// Mask pixels that do not belong to the category.
var evergreenIndex = monthlyIndices.map(function(img) {
    return img.updateMask(evergreenForest);
});

// Mask pixels that do not belong to the category.
var deciduousIndex = monthlyIndices.map(function(img) {
    return img.updateMask(deciduousForest);
});

// Mask pixels that do not belong to the category.
var croplandIndex = monthlyIndices.map(function(img) {
    return img.updateMask(cropland);
});

// Mask pixels that do not belong to the category.
var riceIndex = monthlyIndices.map(function(img) {
    return img.updateMask(rice);
});

// Define the chart and print it to the console.
var chartIndices =
    ui.Chart.image.series({
        imageCollection: deciduousIndex.select(['EVI', 'MSI']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 1000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['EVI', 'MSI'])
    .setOptions({
        title: 'Monthly deciduous forest indices',
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

// Print the chart.
print(chartIndices);

// Define the chart and print it to the console.
var chartIndices =
    ui.Chart.image.series({
        imageCollection: evergreenIndex.select(['EVI', 'MSI']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 1000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['EVI', 'MSI'])
    .setOptions({
        title: 'Monthly deciduous forest indices',
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

// Print the chart.
print(chartIndices);

// Define the chart and print it to the console.
var chartIndices =
    ui.Chart.image.series({
        imageCollection: croplandIndex.select(['EVI', 'MSI']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 1000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['EVI', 'MSI'])
    .setOptions({
        title: 'Monthly cropland indices',
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

// Print the chart.
print(chartIndices);

// Define the chart and print it to the console.
var chartIndices =
    ui.Chart.image.series({
        imageCollection: riceIndex.select(['EVI', 'MSI']),
        region: mekongBasin,
        reducer: ee.Reducer.mean(),
        scale: 1000,
        xProperty: 'system:time_start'
    })
    .setSeriesNames(['EVI', 'MSI'])
    .setOptions({
        title: 'Monthly rice indices',
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

// Print the chart.
print(chartIndices);

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