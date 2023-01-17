//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.3 The Remote Sensing Vocabulary
//  Checkpoint:   F13d
//  Authors:      K. Dyson, A. P. Nicolau, D. Saah, and N. Clinton
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//////
// Explore spatial resolution
//////

// Define a region of interest as a point at San Francisco airport.
var sfoPoint = ee.Geometry.Point(-122.3774, 37.6194);

// Center the map at that point.
Map.centerObject(sfoPoint, 16);

// MODIS
// Get an image from your imported MODIS MYD09GA collection.
var modisImage = mod09.filterDate('2020-02-01', '2020-03-01').first();

// Use these MODIS bands for near infrared, red, and green, respectively.
var modisBands = ['sur_refl_b02', 'sur_refl_b01', 'sur_refl_b04'];

// Define visualization parameters for MODIS.
var modisVis = {
    bands: modisBands,
    min: 0,
    max: 3000
};

// Add the MODIS image to the map.
Map.addLayer(modisImage, modisVis, 'MODIS');

// Get the scale of the data from the NIR band's projection:
var modisScale = modisImage.select('sur_refl_b02')
    .projection().nominalScale();

print('MODIS NIR scale:', modisScale);

// TM
// Filter TM imagery by location and date.

var tmImage = tm
    .filterBounds(Map.getCenter())
    .filterDate('1987-03-01', '1987-08-01')
    .first();

// Display the TM image as a false color composite.
Map.addLayer(tmImage, {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 100
}, 'TM');

// Get the scale of the TM data from its projection:
var tmScale = tmImage.select('B4')
    .projection().nominalScale();

print('TM NIR scale:', tmScale);

// MSI
// Filter MSI imagery by location and date.
var msiImage = msi
    .filterBounds(Map.getCenter())
    .filterDate('2020-02-01', '2020-04-01')
    .first();

// Display the MSI image as a false color composite.
Map.addLayer(msiImage, {
    bands: ['B8', 'B4', 'B3'],
    min: 0,
    max: 2000
}, 'MSI');

// Get the scale of the MSI data from its projection:
var msiScale = msiImage.select('B8')
    .projection().nominalScale();
print('MSI scale:', msiScale);

// NAIP
// Get NAIP images for the study period and region of interest.
var naipImage = naip
    .filterBounds(Map.getCenter())
    .filterDate('2018-01-01', '2018-12-31')
    .first();

// Display the NAIP mosaic as a color-IR composite.
Map.addLayer(naipImage, {
    bands: ['N', 'R', 'G']
}, 'NAIP');

// Get the NAIP resolution from the first image in the mosaic.
var naipScale = naipImage.select('N')
    .projection().nominalScale();

print('NAIP NIR scale:', naipScale);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

/////
// Explore Temporal Resolution
/////

// Use Print to see Landsat revisit time
print('Landsat-5 series:', tm
    .filterBounds(Map.getCenter())
    .filterDate('1987-06-01', '1987-09-01'));

// Create a chart to see Landsat 5's 16 day revisit time.
var tmChart = ui.Chart.image.series({
    imageCollection: tm.select('B4').filterDate('1987-06-01',
        '1987-09-01'),
    region: sfoPoint
}).setSeriesNames(['NIR']);

// Define a chart style that will let us see the individual dates.
var chartStyle = {
    hAxis: {
        title: 'Date'
    },
    vAxis: {
        title: 'NIR Mean'
    },
    series: {
        0: {
            lineWidth: 3,
            pointSize: 6
        }
    },
};

// Apply custom style properties to the chart.
tmChart.setOptions(chartStyle);

// Print the chart.
print('TM Chart', tmChart);

// Sentinel-2 has a 5 day revisit time.
var msiChart = ui.Chart.image.series({
    imageCollection: msi.select('B8').filterDate('2020-06-01',
        '2020-09-01'),
    region: sfoPoint
}).setSeriesNames(['NIR']);

// Apply the previously defined custom style properties to the chart.
msiChart.setOptions(chartStyle);

// Print the chart.
print('MSI Chart', msiChart);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

/////
// Explore spectral resolution
/////

// Get the MODIS band names as an ee.List
var modisBands = modisImage.bandNames();

// Print the list.
print('MODIS bands:', modisBands);

// Print the length of the list.
print('Length of the bands list:', modisBands.length());

// Graph the MODIS spectral bands (bands 11-17).

// Select only the reflectance bands of interest.
var reflectanceImage = modisImage.select(
    'sur_refl_b01',
    'sur_refl_b02',
    'sur_refl_b03',
    'sur_refl_b04',
    'sur_refl_b05',
    'sur_refl_b06',
    'sur_refl_b07'
);

// Define an object of customization parameters for the chart.
var options = {
    title: 'MODIS spectrum at SFO',
    hAxis: {
        title: 'Band'
    },
    vAxis: {
        title: 'Reflectance'
    },
    legend: {
        position: 'none'
    },
    pointSize: 3
};

// Make the chart.
var modisReflectanceChart = ui.Chart.image.regions({
    image: reflectanceImage,
    regions: sfoPoint
}).setOptions(options);

// Display the chart.
print(modisReflectanceChart);

// Get the EO-1 band names as a ee.List
var eo1Image = eo1
    .filterDate('2015-01-01', '2016-01-01')
    .first();

// Extract the EO-1 band names.
var eo1Bands = eo1Image.bandNames();

// Print the list of band names.
print('EO-1 bands:', eo1Bands);

// Create an options object for our chart.
var optionsEO1 = {
    title: 'EO1 spectrum',
    hAxis: {
        title: 'Band'
    },
    vAxis: {
        title: 'Reflectance'
    },
    legend: {
        position: 'none'
    },
    pointSize: 3
};

// Make the chart and set the options.
var eo1Chart = ui.Chart.image.regions({
    image: eo1Image,
    regions: ee.Geometry.Point([6.10, 81.12])
}).setOptions(optionsEO1);

// Display the chart.
print(eo1Chart);

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------

/////
// Examine pixel quality
/////

// Sentinel Quality Visualization.
var msiCloud = msi
    .filterBounds(Map.getCenter())
    .filterDate('2019-12-31', '2020-02-01')
    .first();

// Display the MSI image as a false color composite.
Map.addLayer(msiCloud,
    {
        bands: ['B8', 'B4', 'B3'],
        min: 0,
        max: 2000
    },
    'MSI Quality Image');

Map.addLayer(msiCloud,
    {
        bands: ['QA60'],
        min: 0,
        max: 2000
    },
    'Sentinel Quality Visualization');

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------
