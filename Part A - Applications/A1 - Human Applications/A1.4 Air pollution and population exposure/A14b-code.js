//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.4 Air Pollution and Population Exposures
//  Checkpoint:   A14b
//  Authors:      Zander Venter and Sourangsu Chowdhury
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/*
 * Section 1: data import and cleaning
 */

// Import a global dataset of administrative units level 1.
var adminUnits = ee.FeatureCollection(
    'FAO/GAUL_SIMPLIFIED_500m/2015/level1');

// Filter for the administrative unit that intersects 
// the geometry located at the top of this script.
var adminSelect = adminUnits.filterBounds(geometry);

// Center the map on this area.
Map.centerObject(adminSelect, 8);

// Make the base map HYBRID.
Map.setOptions('HYBRID');

// Add it to the map to make sure you have what you want.
Map.addLayer(adminSelect, {}, 'selected admin unit');

// Import the population count data from Gridded Population of the World Version 4.
var population = ee.ImageCollection(
        'CIESIN/GPWv411/GPW_Population_Count')
    // Filter for 2020 using the calendar range function.
    .filter(ee.Filter.calendarRange(2020, 2020, 'year'))
    // There should be only 1 image, but convert to an image using .mean().
    .mean();

// Clip it to your area of interest (only necessary for visualization purposes).
var populationClipped = population.clipToCollection(adminSelect);

// Add it to the map to see the population distribution.
var popVis = {
    min: 0,
    max: 4000,
    palette: ['black', 'yellow', 'white'],
    opacity: 0.55
};
Map.addLayer(populationClipped, popVis, 'population count');

// Import the Sentinel-5P NO2 offline product.
var no2Raw = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2');

// Define function to exclude cloudy pixels.
function maskClouds(image) {
    // Get the cloud fraction band of the image.
    var cf = image.select('cloud_fraction');
    // Create a mask using 0.3 threshold.
    var mask = cf.lte(0.3); // You can play around with this value.
    // Return a masked image.
    return image.updateMask(mask).copyProperties(image);
}

// Clean and filter the Sentinel-5P NO2 offline product.
var no2 = no2Raw
    // Filter for images intersecting our area of interest.
    .filterBounds(adminSelect)
    // Map the cloud masking function over the image collection.
    .map(maskClouds)
    // Select the tropospheric vertical column of NO2 band.
    .select('tropospheric_NO2_column_number_density');

// Create a median composite for March 2021
var no2Median = no2.filterDate('2021-03-01', '2021-04-01').median();

// Clip it to your area of interest (only necessary for visualization purposes).
var no2MedianClipped = no2Median.clipToCollection(adminSelect);

// Visualize the median NO2.
var no2Viz = {
    min: 0,
    max: 0.00015,
    palette: ['black', 'blue', 'purple', 'cyan', 'green',
        'yellow', 'red'
    ]
};
Map.addLayer(no2MedianClipped, no2Viz, 'median no2 Mar 2021');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

/* 
 * Section 2: quantifying and vizualizing change
 */

// Define a lockdown NO2 median composite.
var no2Lockdown = no2.filterDate('2020-03-01', '2020-04-01')
    .median().clipToCollection(adminSelect);

// Define a baseline NO2 median using the same month in the previous year.
var no2Baseline = no2.filterDate('2019-03-01', '2019-04-01')
    .median().clipToCollection(adminSelect);

// Create a ui map widget to hold the baseline NO2 image.
var leftMap = ui.Map().centerObject(adminSelect, 8).setOptions(
    'HYBRID');

// Create ta ui map widget to hold the lockdown NO2 image.
var rightMap = ui.Map().setOptions('HYBRID');

// Create a split panel widget to hold the two maps.
var sliderPanel = ui.SplitPanel({
    firstPanel: leftMap,
    secondPanel: rightMap,
    orientation: 'horizontal',
    wipe: true,
    style: {
        stretch: 'both'
    }
});
var linker = ui.Map.Linker([leftMap, rightMap]);

// Make a function to add a label with fancy styling.
function makeMapLab(lab, position) {
    var label = ui.Label({
        value: lab,
        style: {
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold',
            backgroundColor: '#ffffff00',
            padding: '0px'
        }
    });
    var panel = ui.Panel({
        widgets: [label],
        layout: ui.Panel.Layout.flow('horizontal'),
        style: {
            position: position,
            backgroundColor: '#00000057',
            padding: '0px'
        }
    });
    return panel;
}

// Create baseline map layer, add it to the left map, and add the label.
var no2BaselineLayer = ui.Map.Layer(no2Baseline, no2Viz);
leftMap.layers().reset([no2BaselineLayer]);
leftMap.add(makeMapLab('Baseline 2019', 'top-left'));

// Create lockdown map layer, add it to the right map, and add the label.
var no2LockdownLayer = ui.Map.Layer(no2Lockdown, no2Viz);
rightMap.layers().reset([no2LockdownLayer]);
rightMap.add(makeMapLab('Lockdown 2020', 'top-right'));

// Reset the map interface (ui.root) with the split panel widget.
// Note that the Map.addLayer() calls earlier on in Section 1 
// will no longer be shown because we have replaced the Map widget 
// with the sliderPanel widget.
ui.root.widgets().reset([sliderPanel]);

// Create a function to get the mean NO2 for the study region 
// per image in the NO2 collection.
function getConc(collectionLabel, img) {
    return function(img) {
        // Calculate the mean NO2.
        var no2Mean = img.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: adminSelect.geometry(),
            scale: 7000
        }).get('tropospheric_NO2_column_number_density');

        // Get the day-of-year of the image.
        var doy = img.date().getRelative('day', 'year');

        // Return a feature with NO2 concentration and day-of-year properties.
        return ee.Feature(null, {
            'conc': no2Mean,
            'DOY': doy,
            'type': collectionLabel
        });
    };
}

// Get the concentrations for a baseline and lockdown collection 
// and merge for plotting.
var no2AggChange_forPlotting = no2
    .filterDate('2020-03-01', '2020-04-01')
    .map(getConc('lockdown'))
    .merge(no2.filterDate('2019-03-01', '2019-04-01')
        .map(getConc('baseline')));
no2AggChange_forPlotting = no2AggChange_forPlotting
    .filter(ee.Filter.notNull(['conc']));

// Make a chart.
var chart1 = ui.Chart.feature.groups(
        no2AggChange_forPlotting, 'DOY', 'conc', 'type')
    .setChartType('LineChart')
    .setOptions({
        title: 'DOY time series for mean [NO2] during ' +
            'March 2019 (baseline) and 2020 (lockdown)'
    });

// Print it to the console.
print('Baseline vs lockdown NO2 for the study region by DOY', chart1);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------