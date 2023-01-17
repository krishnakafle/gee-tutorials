//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chapter:      F6.0 Advanced Raster Visualization 
//  Checkpoint:   F60d
//  Authors:      Gennadii Donchyts, Fedor Baart
//  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Draws a string as a raster image at a given point.
 *
 * @param {string} str - string to draw
 * @param {ee.Geometry} point - location the the string will be drawn
 * @param {{string, Object}} options - optional properties used to style text
 *
 * The options dictionary may include one or more of the following:
 *     fontSize       - 16|18|24|32 - the size of the font (default: 16)
 *     fontType       - Arial|Consolas - the type of the font (default: Arial)
 *     alignX         - left|center|right (default: left)
 *     alignY         - top|center|bottom (default: top)
 *     textColor      - text color string (default: ffffff - white)
 *     textOpacity    - 0-1, opacity of the text (default: 0.9)
 *     textWidth      - width of the text (default: 1)
 *     outlineColor   - text outline color string (default: 000000 - black)
 *     outlineOpacity - 0-1, opacity of the text outline (default: 0.4)
 *     outlineWidth   - width of the text outlines (default: 0)
 */

// Include the text package.
var text = require('users/gena/packages:text');

// Configure map (change center and map type).
Map.setCenter(0, 0, 10);
Map.setOptions('HYBRID');

// Draw text string and add to map.
var pt = Map.getCenter();
var scale = Map.getScale();
var image = text.draw('Hello World!', pt, scale);
Map.addLayer(image);

//  -----------------------------------------------------------------------
//  CHECKPOINT 
//  -----------------------------------------------------------------------
