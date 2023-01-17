//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.4 Air Pollution and Population Exposures
//  Checkpoint:   A14c
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

/* 
 * Section 3: calculating population-weighted concentrations
 */

// Define the spatial resolution of the population data.
var scalePop = 927.67; // See details in GEE Catalogue.

// Now we define a function that will map over the NO2 collection 
// and calculate population-weighted concentrations.
// We will use the formula Exp = SUM {(Pi/P)*Ci}.
// We can calculate P outside of the function 
// so that it is not computed multiple times for each NO2 image.
var P = population.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: adminSelect.geometry(),
    scale: scalePop
}).get('population_count');

// And here is the function.
function getPopWeightedConc(P, region, regionName, img) {
    return function(img) {
        var Ci = img;
        var Pi = population;
        // Calculate the percentage of valid pixels in the region.
        // (masked pixels will not be counted).
        var pixelCoverPerc = Ci.gte(0).unmask(0).multiply(100)
            .reduceRegion({
                reducer: ee.Reducer.mean(),
                geometry: region.geometry(),
                scale: scalePop // Add in the scale of the population raster.
            }).get('tropospheric_NO2_column_number_density');

        // Calculate the per-pixel EXP (see formula above).
        var exp = Pi.divide(ee.Image(ee.Number(P))).multiply(Ci);

        // Sum the exp over the region.
        var expSum = exp.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: region.geometry(),
            scale: scalePop
        }).get('population_count');

        // Calculate the mean NO2 - the approach that would usually 
        // be taken without population weighting.
        var no2Mean = Ci.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: region.geometry(),
            scale: scalePop
        }).get('tropospheric_NO2_column_number_density');

        // Return a feature with properties
        var featOut = ee.Feature(null, {
            'system:time_start': img.get(
                'system:time_start'),
            'dateString': img.date().format('YYYY-MM-DD'),
            'regionName': regionName,
            'no2ConcPopWeighted': expSum,
            'no2ConcRaw': no2Mean,
            'pixelCoverPerc': pixelCoverPerc
        });

        return featOut;
    };

}

// Filter the NO2 collection for March 2020 and map the function over it.
var no2Agg_popWeighted = no2.filterDate('2020-03-01', '2020-04-01')
    .map(getPopWeightedConc(P, adminSelect, 'Wuhan'));
no2Agg_popWeighted = ee.FeatureCollection(no2Agg_popWeighted);

// Define the percentage of valid pixels you want in your region per time point.
// Here we choose 25; i.e. only images with at least 25% valid NO2 pixels.
var validPixelPerc = 25; // you can play around with this value

// Filter the feature collection based on your pixel criteria.
no2Agg_popWeighted = no2Agg_popWeighted
    .filter(ee.Filter.greaterThanOrEquals('pixelCoverPerc',
        validPixelPerc));
print('Population weighted no2 feature collection:',
    no2Agg_popWeighted);

// Create a feature collection for plotting the mean [NO2] 
// and the mean pop-weighted [NO2] on the same graph.
var no2Agg_forPlotting = no2Agg_popWeighted.map(function(ft) {
    return ft.set('conc', ft.get('no2ConcPopWeighted'),
        'type', 'no2ConcPopWeighted');
}).merge(no2Agg_popWeighted.map(function(ft) {
    return ft.set('conc', ft.get('no2ConcRaw'), 'type',
        'no2ConcRaw');
}));

// Make a chart
var chart2 = ui.Chart.feature.groups(
        no2Agg_forPlotting, 'system:time_start', 'conc', 'type')
    .setChartType('LineChart')
    .setOptions({
        title: 'Time series for mean [NO2] and the pop-weighted [NO2]'
    });

// Print it to the console
print('Raw vs population-weighted NO2 for the study region', chart2);

// Export population-weighted data for multiple regions.
// First select the regions. This can also be done with 
// .filterBounds() as in Line 9 above.
var regions = adminUnits
    .filter(ee.Filter.inList('ADM1_NAME', ['Chongqing Shi',
        'Hubei Sheng'
    ]));
// Map a function over the regions that calculates population-weighted [NO2].
var No2AggMulti_popWeighted = regions.map(function(region) {
    var P = population.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region.geometry(),
        scale: scalePop
    }).get('population_count');
    var innerTable = no2.filterDate('2020-03-01',
            '2020-04-01')
        .map(getPopWeightedConc(P, region, region.get(
            'ADM1_NAME')));
    return innerTable;
}).flatten();
// Remember to filter out readings that have pixel percentage cover 
// below your threshold
No2AggMulti_popWeighted = No2AggMulti_popWeighted
    .filter(ee.Filter.greaterThanOrEquals('pixelCoverPerc',
        validPixelPerc));

// Run the export under the 'Tasks' tab on the right 
// and find your CSV file in Google Drive later on.
Export.table.toDrive({
    collection: No2AggMulti_popWeighted,
    description: 'no2_popWeighted',
    fileFormat: 'CSV'
});

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------