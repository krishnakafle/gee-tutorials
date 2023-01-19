# GOOGLE EARTH ENGINE TUTORIALS

We have included the detail explaination of the cocepts in the blog link below.. Please do visit the blog for details and give feedback if you have any.
https://google-earth-engine.com/

<p align="center">
    <img src = '../../../logo.png' class="center">
</p>


## Background
<br>

This is the collection of tutorials prepared by multiple individuals that were shared publicly as documents for learning purposes. These documents has been converted to web pages and are made easy aceess to the normal users via web page. The entire content of the oage are the hardwork from the authors mentioned in the page itself. We don't own it. We simply made the materials available in very easy and effective way for the users. In a manner of saying we are looking for the value addition of the existing tutorials available for the users.

<br>

The entire lab work and explanation includes work from undergraduates, master’s students, PhD students, postdocs, assistant professors, associate professors, and independent consultants.

<br>

### HTML page output for blog is as follows:
<br>
<p align="center">
    <img src = '../../../gee-tutorials.jpg' class="center">
</p>
<br>

# Part F4: Interpreting Image Series

One of the paradigm-changing features of Earth Engine is the ability to access decades of imagery without the previous limitation of needing to download all the data to a local disk for processing. Because remote-sensing data files can be enormous, this used to limit many projects to viewing two or three images from different periods. With Earth Engine, users can access tens or hundreds of thousands of images to understand the status of places across decades.

# Chapter F4.2: Aggregating Images for Time Series
## Author
Ujaval Gandhi



## Overview 
Many remote sensing datasets consist of repeated observations over time. The interval between observations can vary widely. The Global Precipitation Measurement dataset, for example, produces observations of rain and snow worldwide every three hours. The Climate Hazards Group InfraRed Precipitation with Station (CHIRPS) project produces a gridded global dataset at the daily level and also for each five-day period. The Landsat 8 mission produces a new scene of each location on Earth every 16 days. With its constellation of two satellites, the Sentinel-2 mission images every location every five days.


Many applications, however, require computing aggregations of data at time intervals different from those at which the datasets were produced. For example, for determining rainfall anomalies, it is useful to compare monthly rainfall against a long-period monthly average.

While individual scenes are informative, many days are cloudy, and it is useful to build a robust cloud-free time series for many applications. Producing less cloudy or even cloud-free composites can be done by aggregating data to form monthly, seasonal, or yearly composites built from individual scenes. For example, if you are interested in detecting long-term changes in an urban landscape, creating yearly median composites can enable you to detect change patterns across long time intervals with less worry about day-to-day noise.


This chapter will cover the techniques for aggregating individual images from a time  series at a chosen interval. We will take the CHIRPS time series of rainfall for one year and aggregate it to create a monthly rainfall time series.


## Learning Outcomes
 - Using the Earth Engine API to work with dates.
 - Aggregating values from an ImageCollection to calculate monthly, seasonal, or yearly images.
 - Plotting the aggregated time series at a given location.

## Link for details:
https://google-earth-engine.com/Interpreting-Image-Series/Aggregating-Images-for-Time-Series/


# Invitation for collaborators:
Please feel free to contribute to the document. Let's try bring the spatial data science contents together so that it would be easier for every one to learn and share the knowledge. You can also provide your valuable suggestion from our contact page.

https://google-earth-engine.com/contact/
