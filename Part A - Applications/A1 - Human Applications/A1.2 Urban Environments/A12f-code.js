//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.2 Urban Environments
//  Checkpoint:   A12f
//  Authors:      Michelle Stuhlmacher and Ran Goldblatt
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Map.centerObject(bu, 13);

// Surface reflectance function from example:
function maskL457sr(image) {
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111',
        2)).eq(0);
    var saturationMask = image.select('QA_RADSAT').eq(0);

    // Apply the scaling factors to the appropriate bands.
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-
        0.2);
    var thermalBand = image.select('ST_B6').multiply(0.00341802).add(
        149.0);

    // Replace the original bands with the scaled ones and apply the masks.
    return image.addBands(opticalBands, null, true)
        .addBands(thermalBand, null, true)
        .updateMask(qaMask)
        .updateMask(saturationMask);
}

// Map the function over one year of data.
var collection = L7.filterDate('2020-01-01', '2021-01-01').map(
    maskL457sr);
var landsat7_2020 = collection.median();

Map.addLayer(landsat7_2020, {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 0,
    max: 0.3
}, 'landsat 7, 2020');

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------

var lc = nbu.merge(bu);

// -----------------------------------------------------------------------
// CHECKPOINT
// -----------------------------------------------------------------------