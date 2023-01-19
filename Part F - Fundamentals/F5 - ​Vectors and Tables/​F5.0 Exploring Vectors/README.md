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

# Part F5: Vectors and Tables


In addition to raster data processing, Earth Engine supports a rich set of vector processing tools. This Part introduces you to the vector framework in Earth Engine, shows you how to create and to import your vector data, and how to combine vector and raster data for analyses.

# Chapter F5.0: Exploring Vectors
Authors
AJ Purdy, Ellen Brock, David Saah



## Overview

In this chapter, you will learn about features and feature collections and how to use them in conjunction with images and image collections in Earth Engine. Maps are useful for understanding spatial patterns, but scientists often need to extract statistics to answer a question. For example, you may make a false-color composite showing which areas of San Francisco are more “green”—i.e., have more healthy vegetation—than others, but you will likely not be able to directly determine which block in a neighborhood is the most green. This tutorial will demonstrate how to do just that by utilizing vectors.


As described in Chap. F4.0, an important way to summarize and simplify data in Earth Engine is through the use of reducers. Reducers operating across space were used in Chap. F3.0, for example, to enable image regression between bands. More generally, chapters in Part F3 and Part F4 used reducers mostly to summarize the values across bands or images on a pixel-by-pixel basis. What if you wanted to summarize information within the confines of given spatial elements- for example, within a set of polygons? In this chapter, we will illustrate and explore Earth Engine’s method for doing that, which is through a reduceRegions call.


## Learning Outcomes

 - Uploading and working with a shapefile as an asset to use in Earth Engine.
 - Creating a new feature using the geometry tools.
 - Importing and filtering a feature collection in Earth Engine.
 - Using a feature to clip and reduce image values within a geometry.
 - Use reduceRegions to summarize an image in irregular neighborhoods.
 - Exporting calculated data to tables with Tasks.

## Link for details:
https://google-earth-engine.com/Vectors-and-Tables/Exploring-Vectors/

# Invitation for collaborators:
Please feel free to contribute to the document. Let's try bring the spatial data science contents together so that it would be easier for every one to learn and share the knowledge. You can also provide your valuable suggestion from our contact page.

https://google-earth-engine.com/contact/
