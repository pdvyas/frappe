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

wn.provide('wn.views.pageview');
wn.provide('wn.pages');

wn.views.pageview = {
	with_page: function(name, callback) {
		if(!wn.model.has('Page', name)) {
			wn.call({
				method: 'webnotes.widgets.page.getpage', 
				args: {'name':name },
				callback: function(r) {
					wn.model.sync(r.docs);
					callback();
				}
			});
		} else {
			callback();
		}
	},
	show: function(name) {
		if(!name) 
			name = (wn.boot ? wn.boot.home_page : window.page_name);
		wn.views.pageview.with_page(name, function(r) {
			if(r && r.exc) {
				if(!r['403'])wn.container.change_to('404');
			} else if(!wn.pages[name]) {
				new wn.views.Page(name);
			}
			wn.container.change_to(name);			
		});
	}
}

wn.views.Page = Class.extend({
	init: function(name, wrapper) {
		this.name = name;
		var me = this;

		wn.pages[name] = this;

		// web home page
		if(name==window.page_name) {
			this.wrapper = $('#page-' + name).get(0);
			this.wrapper.label = document.title || window.page_name;
			this.wrapper.page_name = window.page_name;
			wn.contents[window.page_name] = this.wrapper;
			
			// onload called in script
		} else {
			this.pagedoc = wn.model.get('Page', this.name).doc;
			this.wrapper = wn.container.add_page(this.name);
			this.wrapper.label = this.pagedoc.get('title') || this.pagedoc.get('name');
			this.wrapper.page_name = this.pagedoc.get('name');
		
			// set content, script and style
			this.wrapper.innerHTML = this.pagedoc.get('content');
			wn.dom.eval(this.pagedoc.get('script', ''));
			wn.dom.set_style(this.pagedoc.get('style', ''));

			this.trigger('load', this.wrapper);
		}
		
		// set events
		$(this.wrapper).bind('show', function() {
			cur_frm = null;
			me.trigger('show', this.wrapper);
			me.trigger('refresh', this.wrapper);
		});
	}
})



wn.views.make_404 = function() {
	var page = wn.container.add_page('404');
	$(page).html('<div class="layout-wrapper">\
		<h1>Not Found</h1><br>\
		<p>Sorry we were unable to find what you were looking for.</p>\
		<p><a href="#">Go back to home</a></p>\
		</div>').toggle(false);
};

wn.views.make_403 = function() {
	var page = wn.container.add_page('403');
	$(page).html('<div class="layout-wrapper">\
		<h1>Not Permitted</h1><br>\
		<p>Sorry you are not permitted to view this page.</p>\
		<p><a href="#">Go back to home</a></p>\
		</div>').toggle(false);
};