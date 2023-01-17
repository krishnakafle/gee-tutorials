//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F1.2 Survey of Raster Datasets
//  Checkpoint:   F12e
//  Authors:      Andréa, Karen, Nick Clinton, David Saah
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/////
// Other satellite products
/////

// Import a Sentinel-5 methane dataset.
var methane = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_CH4');

// Filter the methane dataset.
var methane2018 = methane.select(
        'CH4_column_volume_mixing_ratio_dry_air')
    .filterDate('2018-11-28', '2018-11-29')
    .first();

// Make a visualization for the methane data.
var methaneVis = {
    palette: ['black', 'blue', 'purple', 'cyan', 'green',
        'yellow', 'red'
    ],
    min: 1770,
    max: 1920
};

// Center the Map.
Map.centerObject(methane2018, 3);

// Add the methane dataset to the map.
Map.addLayer(methane2018, methaneVis, 'Methane');

// Import the ERA5 Monthly dataset
var era5Monthly = ee.ImageCollection('ECMWF/ERA5/MONTHLY');

// Filter the dataset
var era5MonthlyTemp = era5Monthly.select('mean_2m_air_temperature')
    .filterDate('2018-01-01', '2019-01-31')
    .first();

// Add the ERA dataset to the map.                  
Map.addLayer(era5MonthlyTemp,
    {
        palette: ['yellow', 'red'],
        min: 260,
        max: 320
    },
    'ERA5 Max Monthly Temp');
    
//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------