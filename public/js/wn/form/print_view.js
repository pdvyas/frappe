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

wn.provide('wn.ui.form');

wn.ui.form.PrintView = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
		this.make_toolbar();
	},
	make: function() {
		// make page and toolbar

		this.wrapper = $a(this.parent, 'div');

		wn.ui.make_app_page({
			parent: this.wrapper,
			single_column: true,
			title: wn._(this.frm.doctype) + ": " + wn._("Print View"),
			module: this.frm.meta.module
		});
	},
	make_toolbar: function() {
		var me = this;
		var appframe = this.wrapper.appframe;

		appframe.add_button(wn._("View Details"), function() {
			me.frm.edit_doc();
		}).addClass("btn-success");

		appframe.add_button(wn._("Print"), function() {
			me.frm.print_doc();
		}, 'icon-print');

		appframe.add_ripped_paper_effect(this.wrapper);

		var layout_main = $(this.wrapper).find(".layout-main");
		
		this.print_body = $("<div style='margin: 25px'>").appendTo(layout_main)
			.css("min-height", "400px").get(0);		
	},
	refresh: function(show) {
		// switch layouts
		$(this.wrapper).toggle(show);
		$(this.frm.page_layout).toggle(!show);

		// print head
		if(this.frm.doc.select_print_heading)
			this.frm.set_print_heading(this.frm.doc.select_print_heading)

		// create print format here
		var me = this;
		_p.build(this.frm.default_format, function(print_html) {
			me.print_body.innerHTML = print_html;
		}, null, 1);
		
	}
})