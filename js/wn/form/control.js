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

wn.ui.make_control = function(opts) {
	control_map = {
		'Check': wn.ui.CheckControl,
		'Data': wn.ui.Control,
		'Link': wn.ui.LinkControl,
		'Select': wn.ui.SelectControl,
		'Table': wn.ui.GridControl,
		'Text': wn.ui.TextControl,
		'Text Editor': wn.ui.RichTextControl,
		'Button': wn.ui.ButtonControl
	}
	if(control_map[opts.docfield.fieldtype]) {
		return new control_map[opts.docfield.fieldtype](opts);
	} else {
		return null;		
	}
}

wn.ui.Control = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
		this.set_init_value();
	},
	make: function() {
		if(this.docfield.vertical) {
			this.make_body_vertical();			
		} else {
			this.make_body();			
		}
		this.make_input();
		
		// label and description
		this.$w.find('label').text(this.docfield.label);
		if(this.no_label) {
			this.hide_label();
		} else {
			if(this.docfield.description) {
				this.help_block(this.docfield.description);
			}
		}		
	},
	set_init_value: function() {
		if(this.doctype && this.docname) {
			this.set_input(wn.model.get_value(this.doctype, this.docname, this.docfield.fieldname));
		}
	},
	hide_label: function() {
		this.$w.find('.control-label').toggle(false);		
	},
	set_input: function(val) {
		this.$input.val(val);
	},
	set: function(val) {
		if(this.doctype && this.docname) {
			wn.model.set_value(this.doctype, this.docname, this.docfield.fieldname, val);
		} else {
			this.set_input(val);
		}		
	},
	get: function() {
		return this.$input.val();
	},
	get_value: function() {
		return this.get();
	},
	doc: function() {
		if(this.doctype & this.docname) {
			return wn.model.get(this.doctype, this.docname).doc;
		} else {
			return null;
		}
	},
	make_input: function() {
		this.$input = $('<input type="text">').appendTo(this.$w.find('.controls'));
	},
	make_body: function() {
		this.$w = $('<div class="control-group">\
			<label class="control-label"></label>\
			<div class="controls">\
			</div>\
			</div>').appendTo(this.parent);
	},
	make_body_vertical: function() {
		this.$w = $('<div class="control-group">\
			<label></label><br>\
			<div class="controls" style="margin-left: 0px;">\
			</div>\
			</div>').appendTo(this.parent);		
	},
	help_block: function(text) {
		if(!this.$w.find('.help-block').length) {
			this.$w.find('.controls').append('<div class="help-block">');
		}
		this.$w.find('.help-block').text(text);
	}
});
