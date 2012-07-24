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

wn.provide('wn.form.fields');

wn.form.fields.Field = Class.extend({
	init: function(df) {
		this.df = df;
		this.make();
		$(this.input).bind('change', {
			if(cur_frm) cur_frm.set_value_in_locals(null, null, me.df.fieldname, $(this).val());
		});
	},
	make: function() {
		this.wrapper = $('<div>');
		this.label = $('<label><span class="field-label"></span></label>').appendTo(this.wrapper);
		this.make_input();
		// types of fields:
		// label (mandatory icon) + input + display + help
		// check + label + help
		// input only (in grid)
	},
	make_input: function() {
		this.input = $('<input type="text">').appendTo(this.wrapper);
	},
	refresh: function() {
		
	}
});

