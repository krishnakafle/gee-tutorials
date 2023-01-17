//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.4 Combining R and Earth Engine
//  Checkpoint:   F64f
//  Authors:      Cesar Aybar, David Montero, Antony Barja, Fernando Herrera, Andrea Gonzales, and Wendy Espinoza
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       
var LandsatLST = require(
    'users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js');

var geometry = ee.Geometry.Rectangle([-8.91, 40.0, -8.3, 40.4]);
var satellite = 'L8';
var date_start = '2018-05-15';
var date_end = '2018-05-31';
var use_ndvi = true;

var LandsatColl = LandsatLST.collection(satellite, date_start,
    date_end, geometry, use_ndvi);

var exImage = LandsatColl.first();

var cmap = ['blue', 'cyan', 'green', 'yellow', 'red'];

Map.centerObject(geometry);

Map.addLayer(exImage.select('LST'), {
    min: 290,
    max: 320,
    palette: cmap
}, 'LST')




//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


