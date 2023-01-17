//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F3.2 Neighborhood-Based Image Transformation
//  Checkpoint:   F32a
//  Authors:      Karen, Andrea, David, Nick
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Create and print a uniform kernel to see its weights.
print('A uniform kernel:', ee.Kernel.square(2));

// Define a point of interest in Odessa, Washington, USA.
var point = ee.Geometry.Point([-118.71845096212049,
    47.15743083101999]);
Map.centerObject(point);

// Load NAIP data.
var imageNAIP = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterBounds(point)
    .filter(ee.Filter.date('2017-01-01', '2018-12-31'))
    .first();

Map.centerObject(point, 17);

var trueColor = {
    bands: ['R', 'G', 'B'],
    min: 0,
    max: 255
};
Map.addLayer(imageNAIP, trueColor, 'true color');

// Begin smoothing example.
// Define a square, uniform kernel.
var uniformKernel = ee.Kernel.square({
    radius: 2,
    units: 'meters',
});

// Convolve the image by convolving with the smoothing kernel.
var smoothed = imageNAIP.convolve(uniformKernel);
Map.addLayer(smoothed, {
    min: 0,
    max: 255
}, 'smoothed image');

// Begin Gaussian smoothing example.
// Print a Gaussian kernel to see its weights.
print('A Gaussian kernel:', ee.Kernel.gaussian(2));

// Define a square Gaussian kernel:
var gaussianKernel = ee.Kernel.gaussian({
    radius: 2,
    units: 'meters',
});

// Convolve the image with the Gaussian kernel.
var gaussian = imageNAIP.convolve(gaussianKernel);
Map.addLayer(gaussian, {
    min: 0,
    max: 255
}, 'Gaussian smoothed image');

// Begin edge detection example.
// For edge detection, define a Laplacian kernel.
var laplacianKernel = ee.Kernel.laplacian8();

// Print the kernel to see its weights.
print('Edge detection Laplacian kernel:', laplacianKernel);

// Convolve the image with the Laplacian kernel.
var edges = imageNAIP.convolve(laplacianKernel);
Map.addLayer(edges, {
    min: 0,
    max: 255
}, 'Laplacian convolution image');

// Begin image sharpening example.
// Define a "fat" Gaussian kernel.
var fat = ee.Kernel.gaussian({
    radius: 3,
    sigma: 3,
    magnitude: -1,
    units: 'meters'
});

// Define a "skinny" Gaussian kernel.
var skinny = ee.Kernel.gaussian({
    radius: 3,
    sigma: 0.5,
    units: 'meters'
});

// Compute a difference-of-Gaussians (DOG) kernel.
var dog = fat.add(skinny);

// Print the kernel to see its weights.
print('DoG kernel for image sharpening', dog);

// Add the DoG convolved image to the original image.
var sharpened = imageNAIP.add(imageNAIP.convolve(dog));
Map.addLayer(sharpened, {
    min: 0,
    max: 255
}, 'DoG edge enhancement');

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
