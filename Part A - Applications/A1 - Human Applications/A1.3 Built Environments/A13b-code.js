//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      A1.3 Built Environments
//  Checkpoint:   A13b
//  Author:       Erin Trochim
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Import roads data.
var grip4_africa = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Africa'),
grip4_north_america = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/North-America'),
grip4_europe = ee.FeatureCollection(
    'projects/sat-io/open-datasets/GRIP4/Europe');

// Check the roads data sizes.
print('Grip4 Africa size', grip4_africa.size());
print('Grip4 North America size', grip4_north_america.size());
print('Grip4 Europe size', grip4_europe.size());

// Display the roads data.
Map.addLayer(ee.FeatureCollection(grip4_africa).style({
color: '413B3A',
width: 1
}), {}, 'Grip4 Africa');
Map.addLayer(ee.FeatureCollection(grip4_north_america).style({
color: '413B3A',
width: 1
}), {}, 'Grip4 North America');
Map.addLayer(ee.FeatureCollection(grip4_europe).style({
color: '413B3A',
width: 1
}), {}, 'Grip4 Europe');

// Import simplified countries.
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');

// Add a function to calculate the feature's geometry area. 
// Add the function as a property. 
var addArea = function(feature) {
return feature.set({
    areaKm: feature.geometry().area().divide(1000 *
        1000)
}); // km2 squared
};

// Map the area getting function over the FeatureCollection.
var countriesArea = countries.map(addArea);

// Filter to the largest country in Africa.
var Algeria = countriesArea.filter(ee.Filter.inList('country_na', [
'Algeria'
]));

// Display the selected countries. 
Map.addLayer(Algeria.style({
fillColor: 'b5ffb4',
color: '00909F',
width: 1.0
}), {}, 'Algeria');

// This function calculates the road length per country for the associated GRIP dataset.
var roadLength4Country = function(country, grip4) {

// Join roads to countries.
var intersectsFilter = ee.Filter.intersects({
    leftField: '.geo',
    rightField: '.geo',
    maxError: 10
});

var grip4Selected = grip4.filterBounds(country);

var countriesWithRds = ee.Join.saveAll('roads').apply({
    primary: country,
    secondary: grip4Selected,
    condition: intersectsFilter
}).filter(ee.Filter.neq('roads', null));

// Return country with calculation of roadLength and roadsPerArea. 
return countriesWithRds.map(function(country) {
    var roadsList = ee.List(country.get('roads'));
    var roadLengths = roadsList.map(function(road) {
        return ee.Feature(road).intersection(
            country, 10).length(10);
    });
    var roadLength = ee.Number(roadLengths.reduce(ee
        .Reducer.sum()));
    return country.set({
        roadLength: roadLength.divide(
            1000), // Convert to km.
        roadsPerArea: roadLength.divide(ee
            .Number(country.get('areaKm'))
        )
    });
}).select(['country_na', 'areaKm', 'roadLength',
    'roadsPerArea'
]);
};

// Apply the road length function to Algeria.
var roadLengthAlgeria = roadLength4Country(Algeria, grip4_africa);

// Print the road statistics for Algeria.
print('Roads statistics in Algeria', roadLengthAlgeria);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------

// Export feature collection to drive.
Export.table.toDrive({
collection: roadLengthAlgeria,
description: 'RoadStatisticsforAlgeria',
selectors: ['country_na', 'roadLength', 'roadsPerArea']
});

// Print the first feature of the grip4 Africa feature collection.
print(grip4_africa.limit(1));

Map.setCenter(-0.759, 9.235, 6);
Map.addLayer(grip4_africa.limit(1),
{},
'Road length comparison');

// This function adds line length in km.
var addLength = function(feature) {
return feature.set({
    lengthKm: feature.length().divide(1000)
});
};

// Calculate the line lengths for all roads in Africa.
var grip4_africaLength = grip4_africa.map(addLength);

// Compare with other values.
print('Calculated road length property', grip4_africaLength.limit(1));

// Repeat the analysis to calculate the length of all roads.
// Filter the table geographically: only keep roads in Algeria.
var grip4_Algeria = grip4_africaLength.filterBounds(Algeria);

// Visualize the output.
Map.addLayer(grip4_Algeria.style({
color: 'green',
width: 2.0
}), {}, 'Algeria roads');

// Sum the lengths for roads in Algeria.
var sumLengthKmAlgeria = ee.Number(
// Reduce to get the sum.
grip4_Algeria.reduceColumns(ee.Reducer.sum(), ['lengthKm'])
.get('sum')
);

// Print the result.
print('Length of all roads in Algeria', sumLengthKmAlgeria);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------