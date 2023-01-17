//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.7 Humanitarian Applications
//  Checkpoint:   A17b
//  Authors:      Jamon Van Den Hoek, Hannah K. Friedrich
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//////////////////////////////////////////////////////
/// Section One: Seeing refugee settlements from above
//////////////////////////////////////////////////////
Map.setOptions('SATELLITE');

// Load UNHCR settlement boundary for Pagirinya Refugee Settlement.
var pagirinya = ee.Feature(ee.FeatureCollection(
    'projects/gee-book/assets/A1-7/pagirinya_settlement_boundary'
).first());

Map.addLayer(pagirinya, {}, 'Pagirinya Refugee Settlement');
Map.centerObject(pagirinya, 14);

// Create buffered settlement boundary geometry.
// 500 meter buffer size is arbitrary but large enough 
// to capture area outside of the study settlement.
var bufferSize = 500; // (in meters)

// Buffer and convert to Geometry for spatial filtering and clipping.
var bufferedBounds = pagirinya.buffer(bufferSize)
    .bounds().geometry();

function addIndices(img) {
    var ndvi = img.normalizedDifference(['nir', 'red'])
        .rename('NDVI'); // NDVI = (nir-red)/(nir+red)
    var ndbi = img.normalizedDifference(['swir1', 'nir'])
        .rename(['NDBI']); // NDBI = (swir1-nir)/(swir1+nir)
    var nbr = img.normalizedDifference(['nir', 'swir2'])
        .rename(['NBR']); // NBR = (nir-swir2)/(nir+swir2)
    var imgIndices = img.addBands(ndvi).addBands(ndbi).addBands(nbr);
    return imgIndices;
}

// Create L8 SR Collection 2 band names and new names.
var landsat8BandNames = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6',
    'SR_B7'
];
var landsat8BandRename = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

// Create image collection.
var landsat8Sr = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
var ic = ee.ImageCollection(landsat8Sr.filterDate('2015-01-01',
        '2020-12-31')
    .filterBounds(bufferedBounds)
    .filter(ee.Filter.lt('CLOUD_COVER', 40))
    .select(landsat8BandNames, landsat8BandRename)
    .map(addIndices));

// Make annual pre- and post-establishment composites.
var preMedian = ic.filterDate('2015-01-01', '2015-12-31').median()
    .clip(bufferedBounds);
var postMedian = ic.filterDate('2017-01-01', '2017-12-31').median()
    .clip(bufferedBounds);

// Import visualization palettes https://github.com/gee-community/ee-palettes.
var palettes = require('users/gena/packages:palettes');
var greenPalette = palettes.colorbrewer.Greens[9];
var prGreenPalette = palettes.colorbrewer.PRGn[9];

// Set-up "true color" visualization parameters.
var TCImageVisParam = {
    bands: ['red', 'green', 'blue'],
    gamma: 1,
    max: 13600,
    min: 8400,
    opacity: 1
};

// Set-up "false color" visualization parameters.
var FCImageVisParam = {
    bands: ['nir', 'red', 'green'],
    gamma: 1,
    min: 9000,
    max: 20000,
    opacity: 1
};

// Display true-color composites.
Map.addLayer(preMedian, TCImageVisParam,
    'Pre-Establishment Median TC');
Map.addLayer(postMedian, TCImageVisParam,
    'Post-Establishment Median TC');

// Display false-color composites.
Map.addLayer(preMedian, FCImageVisParam,
    'Pre-Establishment Median FC');
Map.addLayer(postMedian, FCImageVisParam,
    'Post-Establishment Median FC');

// Display median NDVI composites.
Map.addLayer(preMedian, {
    min: 0,
    max: 0.7,
    bands: ['NDVI'],
    palette: greenPalette
}, 'Pre-Establishment Median NDVI');
Map.addLayer(postMedian, {
    min: 0,
    max: 0.7,
    bands: ['NDVI'],
    palette: greenPalette
}, 'Post-Establishment Median NDVI');

// Create an empty byte Image into which we’ll paint the settlement boundary.
var empty = ee.Image().byte();

// Convert settlement boundary’s geometry to an Image for overlay.
var pagirinyaOutline = empty.paint({
    featureCollection: pagirinya,
    color: 1,
    width: 2
});

// Display Pagirinya boundary in blue.
Map.addLayer(pagirinyaOutline,
    {
        palette: '0000FF'
    },
    'Pagirinya Refugee Settlement boundary');

// Compare pre- and post-establishment differences in NDVI.
var diffMedian = postMedian.subtract(preMedian);
Map.addLayer(diffMedian,
    {
        min: -0.1,
        max: 0.1,
        bands: ['NDVI'],
        palette: prGreenPalette
    },
    'Difference Median NDVI');

// Chart the NDVI distributions for pre- and post-establishment.
var combinedNDVI = preMedian.select(['NDVI'], ['pre-NDVI'])
    .addBands(postMedian.select(['NDVI'], ['post-NDVI']));

var prePostNDVIFrequencyChart =
    ui.Chart.image.histogram({
        image: combinedNDVI,
        region: bufferedBounds,
        scale: 30
    }).setSeriesNames(['Pre-Establishment', 'Post-Establishment'])
    .setOptions({
        title: 'NDVI Frequency Histogram',
        hAxis: {
            title: 'NDVI',
            titleTextStyle: {
                italic: false,
                bold: true
            },
        },
        vAxis:
        {
            title: 'Count',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        colors: ['cf513e', '1d6b99']
    });
print(prePostNDVIFrequencyChart);

// Import package to support text annotation.
var text = require('users/gena/packages:text');
var rgbVisParam = {
    bands: ['red', 'green', 'blue'],
    gamma: 1,
    max: 12011,
    min: 8114,
    opacity: 1
};

// Define arguments for animation function parameters.
var videoArgs = {
    region: bufferedBounds,
    framesPerSecond: 3,
    scale: 10
};

var annotations = [{
    position: 'left',
    offset: '5%',
    margin: '5%',
    property: 'label',
    scale: 30
}];

function addText(image) {
    var date = ee.String(ee.Date(image.get('system:time_start'))
        .format(' YYYY-MM-dd'));
    // Set a property called label for each image.
    var image = image.clip(bufferedBounds).visualize(rgbVisParam)
        .set({
            'label': date
        });
    // Create a new image with the label overlaid using gena's package.
    var annotated = text.annotateImage(image, {}, bufferedBounds,
        annotations);
    return annotated;
}

// Add timestamp annotation to all images in video.
var tempCol = ic.map(addText);

// Click the URL to watch the time series video.
print('L8 Time Series Video', tempCol.getVideoThumbURL(videoArgs));

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

///////////////////////////////////////////////////////////////
/// Section Two: Mapping features within the refugee settlement
///////////////////////////////////////////////////////////////

// Visualize Open Buildings dataset.
var footprints = ee.FeatureCollection(
    'GOOGLE/Research/open-buildings/v1/polygons');
var footprintsHigh = footprints.filter('confidence > 0.75');
var footprintsLow = footprints.filter('confidence <= 0.75');

Map.addLayer(footprintsHigh, {
    color: 'FFA500'
}, 'Buildings high confidence');
Map.addLayer(footprintsLow, {
    color: '800080'
}, 'Buildings low confidence');

// Load land cover samples.
var lcPts = ee.FeatureCollection(
    'projects/gee-book/assets/A1-7/lcPts');
print('lcPts', lcPts);

// Create a function to set Feature properties based on value.
var setColor = function(f) {
    var value = f.get('class');
    var mapDisplayColors = ee.List(['#13a1ed', '#7d02bf',
        '#f0940a', '#d60909'
    ]);
    // Use the class as an index to lookup the corresponding display color.
    return f.set({
        style: {
            color: mapDisplayColors.get(value)
        }
    });
};

// Apply the function and view the results.
var styled = lcPts.map(setColor);
Map.addLayer(styled.style({
    styleProperty: 'style'
}), {}, 'Land cover samples');

// Convert land cover sample FeatureCollection to an Image.
var lcBand = lcPts.reduceToImage({
    properties: ['class'],
    reducer: ee.Reducer.first()
}).rename('class');

// Add lcBand to the post-establishment composite.
postMedian = postMedian.addBands(lcBand);

// Define bands that will be visualized in chart.
var chartBands = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'class'];

print(postMedian, 'postMedian');

// Plot median band value for each land cover type.
var postBandsChart = ui.Chart.image
    .byClass({
      image: postMedian.select(chartBands),
      classBand: 'class',
      region: lcPts,
      reducer: ee.Reducer.median(),
      scale: 30,
      classLabels: ['Settlement', 'Road', 'Forest', 'Agriculture'],
      xLabels: chartBands 
    })
    .setChartType('ScatterChart')
    .setOptions({
      title: 'Band Values',
      hAxis: {
        title: 'Band Name',
        titleTextStyle: {italic: false, bold: true},
      },
      vAxis: {
        title: 'Reflectance (x1e4)',
        titleTextStyle: {italic: false, bold: true}
      },
      colors: ['#13a1ed', '#7d02bf', '#f0940a','#d60909'],
      pointSize: 0,
      lineSize: 5,
      curveType: 'function'
    });
print(postBandsChart);

// Define spectral indices that will be visualized in the chart.
var indexBands = ['NDVI', 'NDBI', 'NBR', 'class'];

// Plot median index value for each land cover type.
var postIndicesChart = ui.Chart.image
    .byClass({
        image: postMedian.select(indexBands),
        classBand: 'class',
        region: lcPts,
        reducer: ee.Reducer.median(),
        scale: 30,
        classLabels: ['Settlement', 'Road', 'Forest',
            'Agriculture'
        ],
        xLabels: indexBands
    })
    .setChartType('ScatterChart')
    .setOptions({
        title: 'Index Values',
        hAxis: {
            title: 'Index Name',
            titleTextStyle: {
                italic: false,
                bold: true
            },
            //viewWindow: {min: wavelengths[0], max: wavelengths[2]}
            scaleType: 'string'
        },
        vAxis: {
            title: 'Value',
            titleTextStyle: {
                italic: false,
                bold: true
            }
        },
        colors: ['#13a1ed', '#7d02bf', '#f0940a', '#d60909'],
        pointSize: 5
    });
print(postIndicesChart);

// Create an empty image into which to paint the features, cast to byte.
var empty = ee.Image().byte();

// Paint all the polygon edges with the same number and width, display.
var pagirinyaOutline = empty.paint({
    featureCollection: pagirinya,
    color: 1,
    width: 2
});

// Map outline of Pagirinya in blue.
Map.addLayer(pagirinyaOutline,
    {
        palette: '0000FF'
    },
    'Pagirinya Refugee Settlement boundary');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------