//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.5 Water Balance and Drought 
//  Checkpoint:   A25s1
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

var classNamesList = getIds(classStruct);
var probNames = cleanList(classNamesList);
var classNames = ee.List(classNamesList);
var classNumbers = getList(classStruct, 'number');
var paletteList = getList(classStruct, 'color');
var PALETTE = paletteList.join(',');

var collection = ee.ImageCollection(
    'projects/gee-book/assets/A2-5/RLCMSv3');

var lcVis = {
    palette: PALETTE,
    min: 0,
    max: classNamesList.length - 1
};

for (var y = 2000; y < 2019; y++) {
    var startDate = ee.Date.fromYMD(y, 1, 1);
    var endDate = ee.Date.fromYMD(y, 12, 31);
    var lcMap = ee.Image(collection.filterDate(startDate, endDate)
            .first())
        .select('lc')
        .clip(mekongBasin);
    Map.addLayer(lcMap, lcVis, y.toString(), false);
}

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

for (var i = 0; i < classNamesList.length; i++) {
    legend.add(makeRow(paletteList[i], classNamesList[i]));
}

legend.add(legendTitle);

// Add the legend to the map.
Map.add(legend);

// -----------------------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------------------