//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.2 Aggregating Images for Time Series
//  Checkpoint:   F42a
//  Author:       Ujaval Gandhi
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');
var startDate = '2019-01-01';
var endDate = '2020-01-01';
var yearFiltered = chirps.filter(ee.Filter.date(startDate, endDate));

print(yearFiltered, 'Date-filtered CHIRPS images');


//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


