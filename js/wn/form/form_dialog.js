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

wn.ui.FormDialog = wn.ui.Dialog.extend({
	init: function(opts) {
		$.extend(this, opts);
		wn.get_or_set(this, 'width', 700);
		wn.get_or_set(this, 'title', this.name);
		wn.get_or_set(this, 'form_class', wn.ui.Form);

		// init dialog
		this._super();
		
		// options for form
		opts.parent = this.body;
		opts.dialog = this;
		opts.appframe = this.appframe;
		
		this.form = new this.form_class(opts);		
	}
})

wn.views.RowEditFormDialog = wn.ui.FormDialog.extend({
	init: function(opts) {
		opts.form_class = wn.ui.RowEditForm;
		this._super(opts);
		this.make_toolbar();
	},
	make_toolbar: function() {
		var me = this;
		var save_btn = this.appframe.add_button('Close', function() { 
			me.control_grid.set(); // reset grid
			me.hide();
		});
		save_btn.addClass('btn-info');
		
		var delete_btn = this.appframe.add_button('Delete', function() { 
			// remove row from doclist
			me.control_grid.doc.doclist.remove_child(me.doc);
			me.control_grid.set(); // reset grid
			
			me.hide();
		}, 'icon-remove');
		delete_btn.parent().css('float', 'right');
	}
});
