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

wn.ui.new_form = function(opts) {
	if(opts.doc && wn.form_classes[opts.doc.get('doctype')]) {
		return new wn.form_classes[opts.doc.get('doctype')](opts);
	} else {
		return new wn.ui.Form(opts);
	}
}

wn.form_classes = {};

wn.ui.Form = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.controls = {};

		if(this.doc) {
			this.meta = wn.model.get('DocType', this.doc.get('doctype'));
			this.fields = $.map(this.meta.get('DocField', {}), function(d) { return d.fields; });
			if(this.doc.get('__islocal') && this.meta.doc.get('autoname')=='Prompt') {
				this.doc.set('name', '');
				this.fields = [{"fieldtype":"Data", "fieldname":"name", permlevel: 0, 
					"label":"New " + this.doc.get('doctype') + " Name", reqd:1}].concat(this.fields);
			}
			// back-ref
			this.doc.form = this;
		}
		this.setup && this.setup();
		this.make_form();
		this.listen();
	},

	make_form: function() {
		// form
		var me = this;
		this.$form = $('<form class="form-horizontal" style="clear: both;">')
			.appendTo(this.parent)
			.submit(function() { return false; });
		
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
					doc: me.doc,
					doclist: me.doclist,
					form: me
				});
				if(me.controls[df.fieldname])
					me.controls[df.fieldname].trigger_make_event();
			}
		});
		
		// set values on controllers
		$.each(me.controls, function(i, control) {
			control && control.set_init_value && control.set_init_value();
		})
		
		this.$form.find(':input:first').focus();
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
		if(this.doclist) {
			this.doclist.on('change', function(key, val, doc) {
				// update control on change of doclist
				me.reset_value(key, val, doc);
			});
			this.doclist.on('change docstatus', function(key, val, doc) {
				// update disabled if docstatus changes
				// set values on controllers
				$.each(me.controls, function(i, control) {
					control && control.apply_disabled && control.apply_disabled();
				});				
			})
		}
	},
	reset_value: function(key, val, doc) {
		if(doc.get('parentfield')) { 
			if(this.controls[doc.get('parentfield')]) {
				// refresh grid in main form
				this.controls[doc.get('parentfield')].set();
			}
		} else {
			// reset control
			if(this.controls[key] && this.controls[key].get()!==val) 
				this.controls[key].set_input(val);				
		}
	}
});
