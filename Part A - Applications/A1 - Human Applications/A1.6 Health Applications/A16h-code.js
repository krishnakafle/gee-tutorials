//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.6 Health Applications
//  Checkpoint:   A16h
//  Author:       Dawn Nekorchuk
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Section 8: Viewing external analyses results

// This is using *synthetic* malaria data.
// For demonstration only, not to be used for epidemiological purposes.
var epidemiaResults = ee.FeatureCollection(
    'projects/gee-book/assets/A1-6/amhara_pilot_synthetic_2018W32'
);
// Filter to only keep pilot woredas with forecasted values. 
var pilot = epidemiaResults
    .filter(ee.Filter.neq('inc_n_fc', null));
var nonpilot = epidemiaResults
    .filter(ee.Filter.eq('inc_n_fc', null));

Map.setCenter(38, 11.5, 7);

// Paint the pilot woredas with different colors for forecasted* incidence
// fc_n_inc here is the forecasted incidence (cut into factors) 
// made on (historical) 2018W24 (i.e. 8 weeks in advance).
// * based on synthetic data for demonstration only.
// Incidence per 1000
// 1 : [0 - 0.25)
// 2 : [0.25 - 0.5)
// 3 : [0.5 - 0.75)
// 4 : [0.75 - 1)
// 5 : > 1

var empty = ee.Image().byte();
var fill_fc = empty.paint({
    featureCollection: pilot,
    color: 'inc_n_fc',
});
var palette = ['fee5d9', 'fcae91', 'fb6a4a', 'de2d26', 'a50f15'];
Map.addLayer(
    fill_fc, {
        palette: palette,
        min: 1,
        max: 5
    },
    'Forecasted Incidence'
);

// Paint the woredas with different colors for the observed* incidence. 
// * based on synthetic data for demonstration only
var fill_obs = empty.paint({
    featureCollection: pilot,
    color: 'inc_n_obs',
});
var palette = ['fee5d9', 'fcae91', 'fb6a4a', 'de2d26', 'a50f15'];
// Layer is off by default, users change between the two in the map viewer.
Map.addLayer(
    fill_obs, {
        palette: palette,
        min: 1,
        max: 5
    },
    'Observed Incidence',
    false
);

// Add gray fill for nonpilot woredas (not included in study).
var fill_na = empty.paint({
    featureCollection: nonpilot
});
Map.addLayer(
    fill_na, {
        palette: 'a1a9a8'
    },
    'Non-study woredas'
);

// Draw borders for ALL Amhara region woredas.
var outline = empty.paint({
    featureCollection: epidemiaResults,
    color: 1,
    width: 1
});
// Add woreda boundaries to map.
Map.addLayer(
    outline, {
        palette: '000000'
    },
    'Woredas'
);

//  -----------------------------------------------------------------------
//  CHECKPOINT
//  -----------------------------------------------------------------------