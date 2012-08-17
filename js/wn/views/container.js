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

// page container
wn.provide('wn.views');
wn.provide('wn.contents');

wn.views.Container = Class.extend({
	init: function() {
		this.container = $('#body_div').get(0);
		this.page = null; // current page
		this.pagewidth = $('#body_div').width();
		this.pagemargin = 50;		
	},
	add_page: function(label, onshow, onhide) {
		var page = $('<div class="content"></div>')
			.attr('id', "page-" + label)
			.appendTo(this.container).get(0);
		if(onshow)
			$(page).bind('show', onshow);
		if(onshow)
			$(page).bind('hide', onhide);
		page.label = label;
		wn.contents[label] = page;
		return page;
	},
	change_to: function(label) {
		if(this.page && this.page.label == label) {
			// don't trigger double events
			return;
		}
		
		var me = this;
		if(label.tagName) {
			// if sent the div, get the table
			var page = label;
		} else {
			var page = wn.contents[label];			
		}
		if(!page) {
			console.log('Page not found ' + label);
			return;
		}
		
		// hide current
		if(this.page) {
			$(this.page).toggle(false);
			$(this.page).trigger('hide');
		}
		
		// show new
		this.page = page;
		$(this.page).fadeIn();
		$(this.page).trigger('show');
		this.page._route = window.location.hash;
		document.title = this.page.label;
		scroll(0,0);
				
		return this.page;
	}
});

wn.views.add_module_btn = function(parent, module) {
	$(parent).append(
		repl('<span class="label" style="margin-right: 8px; cursor: pointer;"\
					onclick="wn.set_route(\'%(module_small)s-home\')">\
					<i class="icon-home icon-white"></i> %(module)s Home\
				</span>', {module: module, module_small: module.toLowerCase()}));	
}

wn.views.add_list_btn = function(parent, doctype) {
	$(parent).append(
		repl('<span class="label" style="margin-right: 8px; cursor: pointer;"\
					onclick="wn.set_route(\'List\', \'%(doctype)s\')">\
					<i class="icon-list icon-white"></i> %(doctype)s List\
				</span>', {doctype: doctype}));	
}
