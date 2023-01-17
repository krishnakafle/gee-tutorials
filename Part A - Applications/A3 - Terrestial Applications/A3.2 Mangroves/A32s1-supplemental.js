//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A3.2 Mangroves
//  Section:      Synthesis (Assignment 2)
//  Author:       Aurélie Shapiro
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Index functions - many sources for Sentinel-2 are here: 
// https://www.indexdatabase.de/db/s-single.php?id=96 

// Various NDVI calculations.  
var NDVI = S2.normalizedDifference(['nir', 'red'])
    .rename('NDVI');
var NDVI_red = S2.normalizedDifference(['red', 'green'])
    .rename(['NDVI_red']);
var NDVI_re1 = S2.normalizedDifference(['nir', 'redEdge1'])
    .rename('NDVI_re1');
var NDVI_re2 = S2.normalizedDifference(['nir', 'redEdge2'])
    .rename('NDVI_re2');
var NDVI_re3 = S2.normalizedDifference(['nir', 'redEdge3'])
    .rename('NDVI_re3');
//  NDYI: Yellowness index
var NDYI = S2.normalizedDifference(['green', 'blue'])
    .rename('NDYI');
//  MNDWI: Modified Normalized Difference Wetness Index
var MNDWI = S2.normalizedDifference(['green', 'swir1'])
    .rename('MNDWI');
//  MNDWI: Normalized Difference Wetness Index
var NDWI = S2.normalizedDifference(['blue', 'red'])
    .rename(['NDWI']);
//  MNDWI: Normalized Difference Blue/Nir Index
var NDBN = S2.normalizedDifference(['blue', 'nir'])
    .rename(['NDBN']);
var SAVI = S2.select('nir').subtract(S2.select('red')).multiply(1.5)
    .divide(S2.select('nir').add(S2.select('red').add(0.5)));
var OSAVI = S2.select('red').subtract(S2.select('nir'))
    .divide((S2.select('red')).add(S2.select('nir')).add(0.16))
    .rename(['OSAVI']);
var LSWI = S2.normalizedDifference(['red', 'nir']).rename(['LSWI']);

var ratio_swir1_nir = S2.expression(
        'swir1/(nir+0.1)', {
            'swir1': S2.select('swir1'),
            'nir': S2.select('nir')
        })
    .rename('ratio_swir1_nir_wet');

// ratio_red_swir1
var ratio_red_swir1 = S2.expression('red/(swir1+0.1)', {
        'red': S2.select('red'),
        'swir1': S2.select('swir1')
    })
    .rename('ratio_red_swir1_wet');

// FDI Forest Discrimination Index from Wang et al., 2018
var FDI = S2.expression('nir-(red+green)', {
        'nir': S2.select('nir'),
        'red': S2.select('red'),
        'green': S2.select('green')
    })
    .rename('FDI_wet');

// Tasseled cap wetness.
var wetTC = S2.expression(
    '(0.1509 * BLUE) + (0.1973 * GREEN) + (0.3279 * RED) + ' +
    '(3406 * NIR) - (0.7112 * SWIR) - (0.4572 * SWIR2)', {
        'BLUE': S2.select('blue'),
        'GREEN': S2.select('green'),
        'RED': S2.select('red'),
        'NIR': S2.select('nir'),
        'SWIR': S2.select('swir1'),
        'SWIR2': S2.select('swir2')
    }).rename('wetTC');

// Tasseled cap greenness.
var greenTC = S2.expression(
    '(-0.2848 * BLUE) - (0.2435 * GREEN) - (0.5436 * RED) + ' +
    '(0.7243 * NIR) + (0.084011 * NIR) - (0.1800 * SWIR)', {
        'BLUE': S2.select('blue'),
        'GREEN': S2.select('green'),
        'RED': S2.select('red'),
        'NIR': S2.select('nir'),
        'SWIR': S2.select('swir1'),
        'SWIR2': S2.select('swir2')
    }).rename('greenTC');

// Stack all bands together
var data_stack = S2.addBands(ratio_swir1_nir)
    .addBands(ratio_red_swir1)
    .addBands(FDI)
    .addBands(NDVI)
    .addBands(NDVI_red)
    .addBands(NDVI_re1)
    .addBands(NDVI_re2)
    .addBands(NDVI_re3)
    .addBands(NDYI)
    .addBands(MNDWI)
    .addBands(NDWI)
    .addBands(MNDWI)
    .addBands(SAVI)
    .addBands(OSAVI)
    .addBands(wetTC)
    .addBands(greenTC)
    .addBands(LSWI)
    .addBands(wetS1)
    .addBands(wetS1);

print(data_stack, 'data stack');