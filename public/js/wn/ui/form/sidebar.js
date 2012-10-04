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

wn.ui.FormSidebar = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
	},
	make: function() {
		var me = this;
		$('<div class="section">\
			<div class="btn-group">\
				<button class="btn btn-small dropdown-toggle" data-toggle="dropdown">\
				Actions <span class="caret"></span></button>\
				<ul class="dropdown-menu">\
					<li><a href="#" onclick="newdoc(cur_frm.doctype); return false;">\
						<i class="icon icon-plus"></i> New</a>\
					</li>\
					<li><a href="#" onclick="cur_frm.print_doc(); return false;">\
						<i class="icon icon-print"></i> Print</a>\
					</li>\
					<li><a href="#" onclick="cur_frm.email_doc(); return false;">\
						<i class="icon icon-envelope"></i> Email</a>\
					</li>\
					<li><a href="#" onclick="cur_frm.copy_doc(); return false;">\
						<i class="icon icon-file"></i> Copy</a>\
					</li>\
					<li><a href="#" onclick="cur_frm.reload_doc(); return false;">\
						<i class="icon icon-refresh"></i> Refresh</a>\
					</li>\
					<li><a href="#" onclick="cur_frm.savetrash(); return false;">\
						<i class="icon icon-remove-sign"></i> Delete</a>\
					</li>\
				</ul>\
			</div>\
			<div class="assign_area">\
				<hr>\
				<div><h5 style="display: inline-block;">Assigned To</h5>\
				<button class="btn btn-small" style="margin-top: -2px">\
					<i class="icon-small icon-ok"></i>\
					Add</button></div>\
			</div>\
			<div class="attach_area">\
				<hr>\
				<div><h5 style="display: inline-block;">Attachments</h5>\
				<button class="btn btn-small" style="margin-top: -2px">\
					<i class="icon-small icon-upload"></i>\
					Upload</button></div>\
			</div>\
			<div class="comments_area">\
				<hr>\
				<h5>Comments</h5>\
			</div>\
		</div>').appendTo(this.parent);

		$(this.parent).find(".dropdown-toggle").dropdown();
		
		// assign to
		this.frm.assign_to = new wn.ui.form.AssignTo({
			parent:$(this.parent).find(".assign_area"),
			frm: this.frm, 
		});
		
		if(this.frm.meta.allow_attach) {
			this.frm.attachments = new wn.ui.form.Attachments({
				frm: this.frm,
				parent: $(this.parent).find(".attach_area")
			});			
		}

		this.frm.comments = new wn.ui.form.Comments({
			frm: this.frm,
			parent: $(this.parent).find(".comments_area")
		});			
		
	},
	refresh: function() {
		this.frm.assign_to.refresh();
		this.frm.attachments.refresh();
		this.frm.comments.refresh();
	}
})