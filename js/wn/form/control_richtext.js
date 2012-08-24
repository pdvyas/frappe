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

wn.ui.RichTextControl = wn.ui.Control.extend({
	init: function(opts) {
		opts.docfield.vertical = true;
		this._super(opts);
	},
	make_input: function() {
		var me = this;
		this.$input_wrap = $('<div>').appendTo(this.$w.find('.controls'));
		this.$input = $('<textarea class="span8">').css('font-size','12px').css('height', '300px')
			.appendTo(this.$input_wrap);
		
		this.myid = wn.dom.set_unique_id(this.$input.get(0));
			
		wn.lib.import_wysihtml5();
		this.$input.wysihtml5({
			"events": {
				change: function() {
					var val = $('#' + me.myid).val().replace(/&nbsp;/g, ' ');
					if(me.doc) 
						me.doc.set(me.docfield.fieldname, val);
				}
			}
		});
	},
	toggle_input: function(show) {
		this.$input_wrap.toggle(show);
	}
});
