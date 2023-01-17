//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F5.1 Raster/Vector Conversions
//  Checkpoint:   F51c
//  Authors:      Keiko Nomura, Samuel Bowers
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//-------------//
// Section 1.4 //
//-------------//

// Load required datasets. 
var gfc = ee.Image('UMD/hansen/global_forest_change_2020_v1_8');
var wdpa = ee.FeatureCollection('WCMC/WDPA/current/polygons');

// Display deforestation.
var deforestation = gfc.select('lossyear');

Map.addLayer(deforestation, {
    min: 1,
    max: 20,
    palette: ['yellow', 'orange', 'red']
}, 'Deforestation raster');

// Select protected areas in the Colombian Amazon.
var amazonianProtectedAreas = [
    'Cordillera de los Picachos', 'La Paya', 'Nukak',
    'Serrania de Chiribiquete',
    'Sierra de la Macarena', 'Tinigua'
];

var wdpaSubset = wdpa.filter(ee.Filter.inList('NAME',
    amazonianProtectedAreas));

// Display protected areas as an outline.
var protectedAreasOutline = ee.Image().byte().paint({
    featureCollection: wdpaSubset,
    color: 1,
    width: 1
});

Map.addLayer(protectedAreasOutline, {
    palette: 'white'
}, 'Amazonian protected areas');

// Set up map display.
Map.centerObject(wdpaSubset);
Map.setOptions('SATELLITE');

var scale = deforestation.projection().nominalScale();

// Use 'reduceRegions' to sum together pixel areas in each protected area.
wdpaSubset = deforestation.gte(1)
    .multiply(ee.Image.pixelArea().divide(10000)).reduceRegions({
        collection: wdpaSubset,
        reducer: ee.Reducer.sum().setOutputs([
            'deforestation_area']),
        scale: scale
    });

print(wdpaSubset); // Note the new 'deforestation_area' property.

// Normalize by area.
wdpaSubset = wdpaSubset.map(
    function(feat) {
        return feat.set('deforestation_rate',
            ee.Number(feat.get('deforestation_area'))
            .divide(feat.area().divide(10000)) // m2 to ha
            .divide(20) // number of years
            .multiply(100)); // to percentage points
    });

// Print to identify rates of change per protected area. 
// Which has the fastest rate of loss?
print(wdpaSubset.reduceColumns({
    reducer: ee.Reducer.toList().repeat(2),
    selectors: ['NAME', 'deforestation_rate']
}));

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
