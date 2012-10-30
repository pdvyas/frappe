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

wn.provide("wn.ui.form");

wn.ui.form.TagEditor = wn.ui.TagEditor.extend({
	init: function(opts) {
		var me = this;
		opts.callback = function(r) {
			me.frm.doc._user_tags += ',' + tagtxt;			
		}
		opts.doctype = opts.frm.doctype;
		this._super(opts);
	},
	refresh: function() {
		// show if saved
		if(!this.show_if_saved()) return;
		this.docname = this.frm.docname;
		this.user_tags = this.frm.doc._user_tags;
		this._super();
	},
	show_if_saved: function() {
		if(this.frm.doc.__islocal) {
			this.parent.toggle(false);
			return false;
		}
		this.parent.toggle(true);
		return true;
	}
});