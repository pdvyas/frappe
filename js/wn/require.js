// Copyright (c) 2012 Web Notes Technologies Pvt Ltd (http://erpnext.com)
// 
// MIT License (MIT)
// 
// Permission is hereby granted, free of charge, to any person obtaining a 
// copy of this software and associated documentation files (the "Software"), 
// to deal in the Software without restriction, including without limitation 
// the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the 
// Software is furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in 
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// 

// require js file
// items to be called by their direct names
// for handler functions
// wn.require('index.cgi?cmd=startup')

wn.require = function(items) {
	if(typeof items === "string") {
		items = [items];
	}
	var l = items.length;

	for(var i=0; i< l; i++) {
		var src = items[i];
		wn.assets.execute(src);
	}
}

wn.provide('wn.lib');
wn.lib.import_slickgrid = function() {
	wn.require('js/lib/slickgrid/slick.grid.css');
	wn.require('js/lib/slickgrid/slick-default-theme.css');
	wn.require('js/slickgrid.bundle.js');
	wn.dom.set_style('.slick-cell { font-size: 12px; }');
}

wn.lib.import_wysihtml5 = function() {
	wn.require('js/lib/bootstrap-wysihtml5/bootstrap-wysihtml5.css');
	wn.require('js/lib/wysihtml5/wysihtml5.min.js');
	wn.require('js/lib/bootstrap-wysihtml5/bootstrap-wysihtml5.min.js');
}