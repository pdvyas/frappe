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
// render formview

wn.provide('wn.views.formview');
wn.provide('wn.forms');
wn.views.formview = {
	show: function(dt, dn) {
		// show doctype
		wn.model.with_doctype(dt, function() {
			wn.model.with_doc(dt, dn, function(dn, r) {
				if(r && r['403']) return; // not permitted
				
				if(!(wn.model.get(dt, dn))) {
					wn.container.change_to('404');
					return;
				}
				
				var meta = wn.model.get('DocType', dt).doc;
				
				// load custom js and css
				if(meta.get('__js')) { wn.dom.eval(meta.get('__js')); }
				if(meta.get('__css')) { wn.dom.set_style(meta.get('__css')); }
				if(meta.get('__messages')) { $.extend(wn._messages, meta.get('__messages')); }
				
				if(meta.get('in_dialog')) {
					// dialog
					var form_dialog = new wn.ui.FormDialog({
						doc: wn.model.get(dt, dn).doc
					});
					
					form_dialog.show();
				} else {
					// page
					var page_name = wn.get_route_str();
					if(wn.contents[page_name]) {
						wn.container.change_to(page_name);
					} else {
						wn.get_or_set(wn.forms, dt, {})[dn] = new wn.views.FormPage(dt, dn);					
					}
				}
				
			});
		})
	},
	create: function(dt) {
		var newdoclist = wn.model.create(dt);
		wn.set_route('Form', dt, newdoclist.doc.get('name'));
	}
}