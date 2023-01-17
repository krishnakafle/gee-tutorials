// ****************************************
// Modules for sequential omnibus algorithm  
// **************************************** 
var util = require('projects/gee-edu/book:Part A - Applications/A1 - Human Applications/A1.8 Monitoring Gold Mining Activity Using SAR/modules/utilities_v1.1');
//get 'VV' and 'VH' bands from sentinel-1 imageCollection and restore linear signal from db-values
exports.get_vvvh = function(image){ 
    var nbands = image.bandNames().length();
    return  image.select(['VV','VH']).multiply(ee.Image.constant(Math.log(10.0)/10.0)).exp();
};
//get 'VV' and 'VH' bands from sentinel-1 imageCollection from ASF RTC data
exports.get_vvvh_asfRTC = function(image){ 
    var nbands = image.bandNames().length();
    return  image.select(['VV','VH'])
};
// clip a list of images
exports.clipList = function(current,prev){
    var imlist = ee.List(ee.Dictionary(prev).get('imlist'));
    var geometry = ee.Dictionary(prev).get('geom');    
    var imlist1 = imlist.add(ee.Image(current).clip(geometry));
    return ee.Dictionary({imlist:imlist1,geom:geometry});
};
// the algorithm
function multbyenl(image){
    return ee.Image(image).multiply(4.9)
}
function log_det_sum(imList,j){
// return the log of the the determinant of the sum of the first j images in imList
    imList = ee.List(imList);
    var nbands = ee.Image(imList.get(0)).bandNames().length();
    var sumj = ee.ImageCollection(imList.slice(0,j)).reduce(ee.Reducer.sum());
    return ee.Algorithms.If( nbands.eq(2),                         
        sumj.expression('b(0)*b(1)').log(),
        sumj.log() );
}        
function log_det(imList,j){
// return the log of the the determinant of the jth image in imList
    var im = ee.Image(ee.List(imList).get(j.subtract(1)));
    var nbands = im.bandNames().length();
    return ee.Algorithms.If(nbands.eq(2),  
        im.expression('b(0)*b(1)').log(),
        im.log() );
}        
function pv(imList,p,median,j){
// calculate -2log(R_ell,j) and return P-value 
    imList = ee.List(imList);
    p = ee.Number(p);
    j = ee.Number(j);
    var f = p;
    var one = ee.Number(1.0);
// 1 - (1. + 1./(j*(j-1)))/(6.*p*n)    
    var rhoj = one.subtract(one.add(one.divide(j.multiply(j.subtract(one)))).divide(6*4.9));
// -(f/4.)*(1.-1./rhoj)**2'    
    var omega2j = one.subtract(one.divide(rhoj)).pow(2.0).multiply(f.divide(-4.0));
    var Z = ee.Image(ee.Image(log_det_sum(imList,j.subtract(1)))).multiply(j.subtract(1)) 
                 .add(log_det(imList,j))  
                 .add(p.multiply(j).multiply(ee.Number(j).log())) 
                 .subtract(p.multiply(j.subtract(1)).multiply(j.subtract(1).log())) 
                 .subtract(ee.Image(log_det_sum(imList,j)).multiply(j)) 
                 .multiply(rhoj) 
                 .multiply(-2*4.9);
// (1.-omega2j)*stats.chi2.cdf(Z,[f])+omega2j*stats.chi2.cdf(Z,[f+4])                 
    var P = ee.Image( util.chi2cdf(Z,f).multiply(one.subtract(omega2j)).add(util.chi2cdf(Z,f.add(4)).multiply(omega2j)) );
// 3x3 median filter    
    return ee.Algorithms.If(median, P.focal_median(), P);
}
function js_iter(current,prev){
    var j = ee.Number(current);
    prev = ee.Dictionary(prev);
    var median = prev.get('median');
    var p = prev.get('p');
    var imList = prev.get('imList');
    var pvs = ee.List(prev.get('pvs'));  
    return ee.Dictionary({'median':median,'p':p,'imList':imList,'pvs':pvs.add(pv(imList,p,median,j))});
}
function ells_iter(current,prev){
    var ell = ee.Number(current);
    prev = ee.Dictionary(prev);
    var pv_arr = ee.List(prev.get('pv_arr'));
    var k = ee.Number(prev.get('k'));
    var median = prev.get('median');
    var p = prev.get('p');
    var imList = ee.List(prev.get('imList'));
    var imList_ell = imList.slice(ell.subtract(1));
    var js = ee.List.sequence(2,k.subtract(ell).add(1));
    var first = ee.Dictionary({'median':median,'p':p,'imList':imList_ell,'pvs':ee.List([])});
// list of P-values for R_ell,j, j = 2...k-ell+1    
    var pvs = ee.List(ee.Dictionary(js.iterate(js_iter,first)).get('pvs'));
    return ee.Dictionary({'k':k,'p':p,'median':median,'imList':imList,'pv_arr':pv_arr.add(pvs)});
}
function filter_j(current,prev){
    var P = ee.Image(current);
    prev = ee.Dictionary(prev);
    var ell = ee.Number(prev.get('ell'));
    var cmap = ee.Image(prev.get('cmap'));
    var smap = ee.Image(prev.get('smap'));
    var fmap = ee.Image(prev.get('fmap'));
    var bmap = ee.Image(prev.get('bmap'));
    var threshold = ee.Image(prev.get('threshold'));
    var j = ee.Number(prev.get('j'));
    var cmapj = cmap.multiply(0).add(ell.add(j).subtract(1));
    var cmap1 = cmap.multiply(0).add(1);
    var tst = P.gt(threshold).and(cmap.eq(ell.subtract(1)));
    cmap = cmap.where(tst,cmapj);
    fmap = fmap.where(tst,fmap.add(1));
    smap = ee.Algorithms.If(ell.eq(1),smap.where(tst,cmapj),smap);
    var idx = ell.add(j).subtract(2);
    var tmp = bmap.select(idx);
    var bname = bmap.bandNames().get(idx); 
    tmp = tmp.where(tst,cmap1);
    tmp = tmp.rename([bname]);
    bmap = bmap.addBands(tmp,[bname],true);
    return ee.Dictionary({'ell':ell,'j':j.add(1),'threshold':threshold,'cmap':cmap,'smap':smap,'fmap':fmap,'bmap':bmap});
}    
function filter_ell(current,prev){
    var pvs = ee.List(current);
    prev = ee.Dictionary(prev);
    var ell = ee.Number(prev.get('ell'));
    var threshold = ee.Image(prev.get('threshold'));
    var cmap = prev.get('cmap');
    var smap = prev.get('smap');
    var fmap = prev.get('fmap');
    var bmap = prev.get('bmap');
    var first = ee.Dictionary({'ell':ell,'j':1, 'threshold':threshold,'cmap':cmap,'smap':smap,'fmap':fmap,'bmap':bmap});
    var result = ee.Dictionary(ee.List(pvs).iterate(filter_j,first));
    return ee.Dictionary({'ell':ell.add(1),'threshold':threshold,'cmap':result.get('cmap'),
                                                                 'smap':result.get('smap'),
                                                                 'fmap':result.get('fmap'),
                                                                 'bmap':result.get('bmap')});
}                                                                 
exports.omnibus = function(imList,significance,median){
// return change maps for sequential omnibus change algorithm     
    imList = ee.List(imList).map(multbyenl);
    var p = ee.Image(imList.get(0)).bandNames().length();
    var k = imList.length();
//  pre-calculate p-value array    
    var ells = ee.List.sequence(1,k.subtract(1));
    var first = ee.Dictionary({'k':k,'p':p,'median':median,'imList':imList,'pv_arr':ee.List([])});
    var pv_arr = ee.List(ee.Dictionary(ells.iterate(ells_iter,first)).get('pv_arr'));          
//  filter p-values to generate cmap, smap, fmap and bmap
    var cmap = ee.Image(imList.get(0)).select(0).multiply(0.0);
    var smap = ee.Image(imList.get(0)).select(0).multiply(0.0);
    var fmap = ee.Image(imList.get(0)).select(0).multiply(0.0);
    var bmap = ee.Image.constant(ee.List.repeat(0,k.subtract(1)));
    var threshold = ee.Image.constant(1-significance);
    var first1 = ee.Dictionary({'ell':1,'threshold':threshold,'cmap':cmap,'smap':smap,'fmap':fmap,'bmap':bmap});
    return ee.Dictionary(pv_arr.iterate(filter_ell,first1));
};