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
				
				if(wn.model.get('DocType', dt).get_value('in_dialog')) {
					// dialog
					var form_dialog = new wn.views.FormDialog({
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
		var new_name = LocalDB.create(dt);
		wn.set_route('Form', dt, new_name);
	}
}

// opts
// - doctype
// - name
// - fields (if custom)

wn.views.FormDialog = wn.ui.Dialog.extend({
	init: function(opts) {
		$.extend(this, opts);
		wn.get_or_set(this, 'width', 600);
		wn.get_or_set(this, 'title', this.name);
				
		// init dialog
		this._super();
		
		this.form = new wn.ui.Form({
			doc: this.doc,
			fields: this.fields,
			parent: this.body,
			appframe: this.appframe,
			dialog: this
		});
	}
})

// form in a page

wn.views.FormPage = Class.extend({
	init: function(doctype, name) {
		this.make_page();
		this.set_breadcrumbs(doctype, name);
		this.form = new wn.ui.Form({
			doc: wn.model.get(doctype, name).doc,
			parent: this.$w,
			appframe: this.page.appframe
		});
	},
	set_breadcrumbs: function(doctype, name) {
		wn.views.breadcrumbs(this.page.appframe, 
			wn.model.get_value('DocType', doctype, 'module'), doctype, name);
	},
	make_page: function() {
		var page_name = wn.get_route_str();
		this.page = wn.container.add_page(page_name);
		wn.ui.make_app_page({parent:this.page});
		wn.container.change_to(page_name);
		this.$w = $(this.page).find('.layout-main-section');
	}
});

// build a form from a set of fields

wn.ui.Form = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.controls = {};

		if(this.doc) {
			this.fields = $.map(wn.model.get('DocType', this.doc.get('doctype'))
				.get('DocField', {}), function(d) { return d.fields; });			
		}
		this.make_form();
		this.make_toolbar();
		this.listen();
	},
	make_toolbar: function() {
		var me = this;
		this.appframe.add_button('Save', function() { 
			if(me.doc.get('parent')) {
				// do nothing, saving
				// to be managed by parent
				// refresh parent grid
				wn.forms[me.doc.get('parenttype')][me.doc.get('parent')].form
					.controls[me.doc.get('parentfield')].set();
				if(me.dialog.hide) me.dialog.hide();
				
			} else {
				var btn = this;
				$(this).html('Saving...').attr('disabled', 'disabled');
				wn.model.get(this.doc.get('doctype'), this.doc.get('name')).save(0, function() {
					$(this).attr('disabled', false).html('Save');
				});				
			}
		});
	},
	make_form: function() {
		// form
		var me = this;
		this.$form = $('<form class="form-horizontal">').appendTo(this.parent);
		
		if(this.fields[0].fieldtype!='Section Break') {
			me.make_fieldset('_first_section');
		}
				
		// controls
		$.each(this.fields, function(i, df) {
			// change section
			if(df.fieldtype=='Section Break') {
				me.make_fieldset(df.fieldname, df.label);
			} else {
				// make control 
				me.controls[df.fieldname] = wn.ui.make_control({
					docfield: df,
					parent: me.last_fieldset,
					doc: me.doc
				});
			}
		});
	},
	make_fieldset: function(name, legend) {
		var $fset = $('<fieldset data-name="'+name+'"></fieldset>').appendTo(this.$form);
		if(legend) {
			$('<legend>').text(legend).appendTo($fset);
		}
		this.last_fieldset = $fset;
	},
	// listen for changes in model
	listen: function() {
		var me = this;
		if(this.doc) {
			$(document).bind(wn.model.event_name(this.doc.get('doctype'), this.doc.get('name')), 
				function(ev, key, val) {
					if(me.controls[key]) me.controls[key].set_input(val);
				});
		}
	},
	save: function(callback) {

	}
});



