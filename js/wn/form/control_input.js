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

wn.ui.IntControl = wn.ui.Control.extend({
	validate: function(val) {
		return cint(val);
	}
});

wn.ui.FloatControl = wn.ui.Control.extend({
	validate: function(val) {
		if(val===null) val=0;
		return parseFloat(val).toFixed(6);
	}
});

wn.ui.CurrencyControl = wn.ui.Control.extend({
	validate: function(val) {
		if(val===null) val=0;
		return parseFloat(val).toFixed(6);
	}
});

wn.ui.CheckControl = wn.ui.Control.extend({
	make_input: function() {
		this.$input = $('<input type="checkbox">').appendTo(this.$w.find('.controls'));
	},
	toggle_editable: function() { },
	set_static: function() { }
});

wn.ui.TextControl = wn.ui.Control.extend({
	make_input: function() {
		this.$input = $('<textarea type="text" rows="5">').appendTo(this.$w.find('.controls'));		
	},
	set_static: function(val) {
		if(val)
			this._super(wn.markdown(val));
	}
});

wn.ui.SelectControl = wn.ui.Control.extend({
	make_input: function() {
		this.$input = $('<select>').appendTo(this.$w.find('.controls'));
		this.$input.add_options(this.docfield.options.split('\n'));
	}
});

wn.ui.ButtonControl = wn.ui.Control.extend({
	make_input: function() {
		this.hide_label();
		this.$input = $('<button class="btn btn-small">')
			.html(this.docfield.label)
			.appendTo(this.$w.find('.controls'));
	},
	get_value: function() {
		return null;
	},
	toggle_editable: function() { },
	set_static: function() { },
});
