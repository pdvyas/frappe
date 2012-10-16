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

// library to mange assets (js, css, models, html) etc in the app.
// will try and get from localStorge if latest are available
// depends on wn.versions to manage versioning

wn.require = function(items) {
	if(typeof items === "string") {
		items = [items];
	}
	var l = items.length;

	for(var i=0; i< l; i++) {
		var src = items[i];
		//if(!(src in wn.assets.executed_)) {
			// check if available in localstorage
		wn.assets.execute(src);
		//}
	}
}

wn.assets = {
	// keep track of executed assets
	loaded_ : [],
	
	check: function() {
		// if version is different then clear localstorage
		if(window._version_number != localStorage.getItem("_version_number")) {
			localStorage.clear();
			localStorage.setItem("_version_number", window._version_number)
		}
	},
	
	// check if the asset exists in
	// localstorage 
	exists: function(src) {
		if('localStorage' in window
			&& localStorage.getItem(src) && (wn.boot ? !wn.boot.developer_mode : true))
			return true
	},
	
	// add the asset to
	// localstorage
	add: function(src, txt) {
		if('localStorage' in window) {
			localStorage.setItem(src, txt);
		}
	},
	
	get: function(src) {
		return localStorage.getItem(src);
	},
	
	extn: function(src) {
		if(src.indexOf('?')!=-1) {
			src = src.split('?').slice(-1)[0];
		}
		return src.split('.').slice(-1)[0];
	},
	
	// load an asset via
	load: function(src) {
		// this is virtual page load, only get the the source
		// *without* the template
		var t = src;
		
		set_loading();

		$.ajax({
			url: t,
			data: {
				q: Math.floor(Math.random()*1000)
			},
			dataType: 'text',
			success: function(txt) {
				// add it to localstorage
				wn.assets.add(src, txt);				
			},
			async: false
		});
		
		hide_loading();
	},
	
	// pass on to the handler to set
	execute: function(src) {
		if(!wn.assets.exists(src)) {
			wn.assets.load(src);
		}
		var type = wn.assets.extn(src);
		if(wn.assets.handler[type]) {
			wn.assets.handler[type](wn.assets.get(src), src);
			wn.assets.loaded_.push(src);
		}
	},
	
	// handle types of assets
	// and launch them in the
	// app
	handler: {
		js: function(txt, src) {
			wn.dom.eval(txt);
		},
		css: function(txt, src) {
			wn.dom.set_style(txt);
		}
	}
}

wn.libs = {
	slickgrid: [
		'lib/js/lib/slickgrid/slick.grid.css',
		'lib/js/lib/slickgrid/slick-default-theme.css',
		'lib/js/lib/jquery/jquery.ui.interactions.min.js',
		'lib/js/lib/slickgrid/jquery.event.drag.min.js',
		'lib/js/lib/slickgrid/plugins/slick.cellrangeselector.js',
		'lib/js/lib/slickgrid/plugins/slick.cellselectionmodel.js',
		'lib/js/lib/slickgrid/plugins/slick.rowselectionmodel.js',
		'lib/js/lib/slickgrid/plugins/slick.rowmovemanager.js',
		'lib/js/lib/slickgrid/plugins/slick.cellrangedecorator.js',
		'lib/js/lib/slickgrid/plugins/slick.cellrangeselector.js',
		'lib/js/lib/slickgrid/slick.formatters.js',
		'lib/js/lib/slickgrid/slick.core.js',
		'lib/js/lib/slickgrid/slick.grid.js',
		'lib/js/lib/slickgrid/slick.dataview.js'
	]
}

wn.require_lib = function(lib) {
	
	if(typeof lib=="string") {
		lib = [lib];
	}

	var files = $.map(lib, function(l) { 
		return $.map(wn.libs[l], function(f) { if(!in_list(wn.assets.loaded_, f)) return f; });
	});

	if(files) {
		var dialog = new wn.ui.Dialog({
			title: "Loading...",
			width: 500
		});
		
		dialog.show();
		
		$('<div style="margin: 30px 10px">\
			<div class="progress"><div class="bar"></div></div>\
		</div>').appendTo(dialog.body);
		
		
		$.each(files, function(i, v) {
			wn.require(v);
			var width = cint(flt(i+1) / files.length * 100) + "%";
			$(dialog.body).find(".bar").css("width", width);
		})
		
		dialog.hide();
	}
}
