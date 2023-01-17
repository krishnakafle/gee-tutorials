//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A2.3 Surface Water Mapping
//  Checkpoint:   A23c
//  Authors:      K. Markert, G. Donchyts, A. Haag
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// *** Section 1 ***

// Define a point in Cambodia to filter by location.
var point = ee.Geometry.Point(104.9632, 11.7686);

Map.centerObject(point, 11);

// Get the Sentinel-1 collection and filter by space/time.
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(point)
    .filterDate('2019-10-05', '2019-10-06')
    .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'));

// Grab the first image in the collection.
var s1Image = s1Collection.first();

// Add the Sentinel-1 image to the map.
Map.addLayer(s1Image, {
    min: -25,
    max: 0,
    bands: 'VV'
}, 'Sentinel-1 image');

// Specify band to use for Otsu thresholding.
var band = 'VV';

// Define a reducer to calculate a histogram of values.
var histogramReducer = ee.Reducer.histogram(255, 0.1);

// Reduce all of the image values.
var globalHistogram = ee.Dictionary(
    s1Image.select(band).reduceRegion({
        reducer: histogramReducer,
        geometry: s1Image.geometry(),
        scale: 90,
        maxPixels: 1e10
    }).get(band)
);

// Extract out the histogram buckets and counts per bucket.
var x = ee.List(globalHistogram.get('bucketMeans'));
var y = ee.List(globalHistogram.get('histogram'));

// Define a list of values to plot.
var dataCol = ee.Array.cat([x, y], 1).toList();

// Define the header information for data.
var columnHeader = ee.List([
    [
    {
        label: 'Backscatter',
        role: 'domain',
        type: 'number'
    },
    {
        label: 'Values',
        role: 'data',
        type: 'number'
    }, ]
]);

// Concat the header and data for plotting.
var dataTable = columnHeader.cat(dataCol);

// Create plot using the ui.Chart function with the dataTable.
// Use 'evaluate' to transfer the server-side table to the client.
// Define the chart and print it to the console.
dataTable.evaluate(function(dataTableClient) {
    var chart = ui.Chart(dataTableClient)
        .setChartType('AreaChart')
        .setOptions({
            title: band + ' Global Histogram', 
            hAxis: {
                title: 'Backscatter [dB]',
                viewWindow: {
                    min: -35,
                    max: 15
                }
            },
            vAxis: {
                title: 'Count'
            }
        });
    print(chart);
});

// See:
// https://medium.com/google-earth/otsus-method-for-image-segmentation-f5c48f405e
function otsu(histogram) {
    // Make sure histogram is an ee.Dictionary object.
    histogram = ee.Dictionary(histogram);
    // Extract relevant values into arrays.
    var counts = ee.Array(histogram.get('histogram'));
    var means = ee.Array(histogram.get('bucketMeans'));
    // Calculate single statistics over arrays
    var size = means.length().get([0]);
    var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
    var sum = means.multiply(counts).reduce(ee.Reducer.sum(), [0])
        .get([0]);
    var mean = sum.divide(total);
    // Compute between sum of squares, where each mean partitions the data.
    var indices = ee.List.sequence(1, size);
    var bss = indices.map(function(i) {
        var aCounts = counts.slice(0, 0, i);
        var aCount = aCounts.reduce(ee.Reducer.sum(), [0])
            .get([0]);
        var aMeans = means.slice(0, 0, i);
        var aMean = aMeans.multiply(aCounts)
            .reduce(ee.Reducer.sum(), [0]).get([0])
            .divide(aCount);
        var bCount = total.subtract(aCount);
        var bMean = sum.subtract(aCount.multiply(aMean))
            .divide(bCount);
        return aCount.multiply(aMean.subtract(mean).pow(2))
            .add(
                bCount.multiply(bMean.subtract(mean).pow(2)));
    });
    // Return the mean value corresponding to the maximum BSS.
    return means.sort(bss).get([-1]);
}

// Apply otsu thresholding.
var globalThreshold = otsu(globalHistogram);
print('Global threshold value:', globalThreshold);

// Create list of empty strings that will be used for annotation.
var thresholdCol = ee.List.repeat('', x.length());
// Find the index where the bucketMean equals the threshold.
var threshIndex = x.indexOf(globalThreshold);
// Set the index to the annotation text.
thresholdCol = thresholdCol.set(threshIndex, 'Otsu Threshold');

// Redefine the column header information with annotation column.
columnHeader = ee.List([
    [
    {
        label: 'Backscatter',
        role: 'domain',
        type: 'number'
    },
    {
        label: 'Values',
        role: 'data',
        type: 'number'
    },
    {
        label: 'Threshold',
        role: 'annotation',
        type: 'string'
    }]
]);

// Loop through the data rows and add the annotation column.
dataCol = ee.List.sequence(0, x.length().subtract(1)).map(function(
i) {
    i = ee.Number(i);
    var row = ee.List(dataCol.get(i));
    return row.add(ee.String(thresholdCol.get(i)));
});

// Concat the header and data for plotting.
dataTable = columnHeader.cat(dataCol);

// Create plot using the ui.Chart function with the dataTable.
// Use 'evaluate' to transfer the server-side table to the client.
// Define the chart and print it to the console.
dataTable.evaluate(function(dataTableClient) {
    // loop through the client-side table and set empty strings to null
    for (var i = 0; i < dataTableClient.length; i++) {
        if (dataTableClient[i][2] === '') {
            dataTableClient[i][2] = null;
        }
    }
    var chart = ui.Chart(dataTableClient)
        .setChartType('AreaChart')
        .setOptions({
            title: band +
                ' Global Histogram with Threshold annotation',
            hAxis: {
                title: 'Backscatter [dB]',
                viewWindow: {
                    min: -35,
                    max: 15
                }
            },
            vAxis: {
                title: 'Count'
            },
            annotations: {
                style: 'line'
            }
        });
    print(chart);
});

// Apply the threshold on the image to extract water.
var globalWater = s1Image.select(band).lt(globalThreshold);

// Add the water image to the map and mask 0 (no-water) values.
Map.addLayer(globalWater.selfMask(),
    {
        palette: 'blue'
    },
    'Water (global threshold)');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// *** Section 2 ***

// Define parameters for the adaptive thresholding.
// Initial estimate of water/no-water for estimating the edges
var initialThreshold = -16;
// Number of connected pixels to use for length calculation.
var connectedPixels = 100;
// Length of edges to be considered water edges.
var edgeLength = 20;
// Buffer in meters to apply to edges.
var edgeBuffer = 300;
// Threshold for canny edge detection.
var cannyThreshold = 1;
// Sigma value for gaussian filter in canny edge detection.
var cannySigma = 1;
// Lower threshold for canny detection.
var cannyLt = 0.05;

// Get preliminary water.
var binary = s1Image.select(band).lt(initialThreshold)
    .rename('binary');

// Get projection information to convert buffer size to pixels.
var imageProj = s1Image.select(band).projection();

// Get canny edges.
var canny = ee.Algorithms.CannyEdgeDetector({
    image: binary,
    threshold: cannyThreshold,
    sigma: cannySigma
});

// Process canny edges.

// Get the edges and length of edges.
var connected = canny.updateMask(canny).lt(cannyLt)
    .connectedPixelCount(connectedPixels, true);

// Mask short edges that can be noise.
var edges = connected.gte(edgeLength);

// Calculate the buffer in pixel size.
var edgeBufferPixel = ee.Number(edgeBuffer).divide(imageProj
    .nominalScale());

// Buffer the edges using a dilation operation.
var bufferedEdges = edges.fastDistanceTransform().lt(edgeBufferPixel);

// Mask areas not within the buffer .
var edgeImage = s1Image.select(band).updateMask(bufferedEdges);

// Add the detected edges and buffered edges to the map.
Map.addLayer(edges, {
    palette: 'red'
}, 'Detected water edges');
var edgesVis = {
    palette: 'yellow',
    opacity: 0.5
};
Map.addLayer(bufferedEdges.selfMask(), edgesVis,
    'Buffered water edges');

// Reduce all of the image values.
var localHistogram = ee.Dictionary(
    edgeImage.reduceRegion({
        reducer: histogramReducer,
        geometry: s1Image.geometry(),
        scale: 90,
        maxPixels: 1e10
    }).get(band)
);

// Apply otsu thresholding.
var localThreshold = otsu(localHistogram);
print('Adaptive threshold value:', localThreshold);

// Extract out the histogram buckets and counts per bucket.
var x = ee.List(localHistogram.get('bucketMeans'));
var y = ee.List(localHistogram.get('histogram'));

// Define a list of values to plot.
var dataCol = ee.Array.cat([x, y], 1).toList();

// Concat the header and data for plotting.
var dataTable = columnHeader.cat(dataCol);

// Create list of empty strings that will be used for annotation.
var thresholdCol = ee.List.repeat('', x.length());
// Find the index that bucketMean equals the threshold.
var threshIndex = x.indexOf(localThreshold);
// Set the index to the annotation text.
thresholdCol = thresholdCol.set(threshIndex, 'Otsu Threshold');

// Redefine the column header information now with annotation col.
columnHeader = ee.List([
    [
    {
        label: 'Backscatter',
        role: 'domain',
        type: 'number'
    },
    {
        label: 'Values',
        role: 'data',
        type: 'number'
    },
    {
        label: 'Threshold',
        role: 'annotation',
        type: 'string'
    }]
]);

// Loop through the data rows and add the annotation col.
dataCol = ee.List.sequence(0, x.length().subtract(1)).map(function(
i) {
    i = ee.Number(i);
    var row = ee.List(dataCol.get(i));
    return row.add(ee.String(thresholdCol.get(i)));
});

// Concat the header and data for plotting.
dataTable = columnHeader.cat(dataCol);

// Create plot using the ui.Chart function with the dataTable.
// Use 'evaluate' to transfer the server-side table to the client.
// Define the chart and print it to the console.
dataTable.evaluate(function(dataTableClient) {
    // Loop through the client-side table and set empty strings to null.
    for (var i = 0; i < dataTableClient.length; i++) {
        if (dataTableClient[i][2] === '') {
            dataTableClient[i][2] = null;
        } 
    }
    var chart = ui.Chart(dataTableClient)
        .setChartType('AreaChart')
        .setOptions({
            title: band +
                ' Adaptive Histogram with Threshold annotation',
            hAxis: {
                title: 'Backscatter [dB]',
                viewWindow: {
                    min: -35,
                    max: 15
                }
            },
            vAxis: {
                title: 'Count'
            },
            annotations: {
                style: 'line'
            }
        });
    print(chart);
});

// Apply the threshold on the image to extract water.
var localWater = s1Image.select(band).lt(localThreshold);

// Add the water image to the map and mask 0 (no-water) values.
Map.addLayer(localWater.selfMask(),
    {
        palette: 'darkblue'
    },
    'Water (adaptive threshold)');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Get the previous 5 years of permanent water.

// Get the JRC historical yearly dataset.
var jrc = ee.ImageCollection('JRC/GSW1_3/YearlyHistory')
    // Filter for historical data up to date of interest.
    .filterDate('1985-01-01', s1Image.date())
    // Grab the 5 latest images/years.
    .limit(5, 'system:time_start', false);

var permanentWater = jrc.map(function(image) {
        // Extract out the permanent water class.
        return image.select('waterClass').eq(3);
        // Reduce the collection to get information on if a pixel has
        // been classified as permanent water in the past 5 years.
    }).sum()
    // Make sure we have a value everywhere.
    .unmask(0)
    // Get an image of 1 if permanent water in the past 5 years, otherwise 0.
    .gt(0)
    // Mask for only the water image we just calculated.
    .updateMask(localWater.mask());

// Add the permanent water layer to the map.
Map.addLayer(permanentWater.selfMask(),
    {
        palette: 'royalblue'
    },
    'JRC permanent water');

// Find areas where there is not permanent water, but water is observed.
var floodImage = permanentWater.not().and(localWater);

// Add flood image to map.
Map.addLayer(floodImage.selfMask(), {
    palette: 'firebrick'
}, 'Flood areas');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------