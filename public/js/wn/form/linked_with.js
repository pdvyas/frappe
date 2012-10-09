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

wn.provide("wn.ui.form")

wn.ui.form.LinkedWith = Class.extend({
	init: function(opts) {
		var me = this;
		$.extend(this, opts);
		this.parent.click(function() {
			me.show();
		})
	},
	refresh: function() {
		this.parent.css("display", this.frm.doc.__islocal ? "none" : "inline-block");
	},
	show: function() {
		if(!this.dialog)
			this.make_dialog();
		
		this.dialog.fields_dict.list_by.$input.change();
		this.dialog.show();
	},
	make_dialog: function() {
		var me = this;
		this.linked_with = this.frm.meta.__linked_with;
		var links = keys(this.linked_with).sort().join("\n");
		
		this.dialog = new wn.ui.Dialog({
			width: 640,
			title: "Linked With",
			fields: [
				{ fieldtype: "HTML", label: "help", 
					options:"<div class='help'>List of records in which this "+
						this.frm.doctype+" is linked.</div>" },
				{ fieldtype: "Select", options: links, label: "List By" },
				{ fieldtype: "HTML", label: "list" }
			]
		});
		
		this.lst = new wn.ui.Listing({
			hide_refresh: true,
			no_loading: true,
			no_toolbar: true,
			parent: $(this.dialog.fields_dict.list.wrapper).css("min-height", "300px").get(0),
			get_query: function() {
				return repl("select name, modified, modified_by, docstatus \
					from `tab%(doctype)s` where `%(field)s`='%(value)s' order by modified desc", {
						doctype: me.doctype,
						field: me.linked_with[me.doctype],
						value: me.frm.doc.name.replace(/'/g, "\'")
					})
			},
			render_row: function(parent, data) {
				$(parent).html(repl('%(avatar)s \
					<a href="#Form/%(doctype)s/%(name)s" onclick="cur_dialog.hide()">\
						%(name)s</a>\
					<span class="help">Last Updated: %(modified)s</span>', {
						avatar: wn.avatar(data.modified_by, null, 
							"Last Modified By: " + wn.user_info(data.modified_by).fullname),
						doctype: me.doctype,
						modified: dateutil.comment_when(data.modified),
						name: data.name
					}));
			},
			get_no_result_message: function() {
				return repl("%(name)s is not linked in any %(doctype)s", {
					name: me.frm.doc.name,
					doctype: me.doctype
				})
			}
		});
		
		this.dialog.fields_dict.list_by.$input.change(function() {
			me.doctype = me.dialog.fields_dict.list_by.$input.val();
			me.lst.run();
		})
	}
});