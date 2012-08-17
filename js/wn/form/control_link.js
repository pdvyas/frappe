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

wn.ui.LinkControl = wn.ui.Control.extend({
	make_input: function() {
		var me = this;
		this.$input_wrap = $('<div class="input-append">').appendTo(this.$w.find('.controls'));
		this.$input = $('<input type="text" size="16"/>').appendTo(this.$input_wrap);
		this.$button = $('<button class="btn"><i class="icon-search"></i></button>')
			.appendTo(this.$input_wrap)
			.click(function() {
				
				me.search_dialog = new wn.ui.Search({
					doctype: me.docfield.options, 
					txt: me.$input.val(),
					with_filters: me.filters,
					df: me.docfield,
					callback: function(val) {
						me.set(val);
					}});				
				
				return false;
			});
	},
	toggle_input: function(show) {
		this.$input_wrap.toggle(show);
	}
});