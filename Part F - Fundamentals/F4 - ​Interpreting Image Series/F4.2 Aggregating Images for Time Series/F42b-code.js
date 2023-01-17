//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F4.2 Aggregating Images for Time Series
//  Checkpoint:   F42b
//  Author:       Ujaval Gandhi
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');
var year = 2019;
var startDate = ee.Date.fromYMD(year, 1, 1);

var endDate = startDate.advance(1, 'year');

var yearFiltered = chirps
    .filter(ee.Filter.date(startDate, endDate));
print(yearFiltered, 'Date-filtered CHIRPS images');

print(startDate, 'Start date');
print(endDate, 'End date');

print('Start date as timestamp', startDate.millis());
print('End date as timestamp', endDate.millis());

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------


