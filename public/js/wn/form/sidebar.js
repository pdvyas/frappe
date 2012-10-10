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
		this.wrapper = $('<div class="section">\
			<div class="btn-group" style="display: inline-block;">\
				<button class="btn btn-small dropdown-toggle" data-toggle="dropdown">\
				<i class="icon-small icon-asterisk"></i> Actions <span class="caret"></span></button>\
				<ul class="dropdown-menu">\
					<li><a href="#" data-action="new" onclick="newdoc(cur_frm.doctype); return false;">\
						<i class="icon icon-plus"></i> New</a>\
					</li>\
					<li><a href="#" data-action="print" onclick="cur_frm.print_doc(); return false;">\
						<i class="icon icon-print"></i> Print</a>\
					</li>\
					<li><a href="#" data-action="email" onclick="cur_frm.email_doc(); return false;">\
						<i class="icon icon-envelope"></i> Email</a>\
					</li>\
					<li><a href="#" data-action="copy" onclick="cur_frm.copy_doc(); return false;">\
						<i class="icon icon-file"></i> Copy</a>\
					</li>\
					<li><a href="#" data-action="refresh" onclick="cur_frm.reload_doc(); return false;">\
						<i class="icon icon-refresh"></i> Refresh</a>\
					</li>\
					<li><a href="#" data-action="delete" onclick="cur_frm.savetrash(); return false;">\
						<i class="icon icon-remove-sign"></i> Delete</a>\
					</li>\
				</ul>\
			</div>\
			<button class="btn btn-small linked-with" style="margin-left: 7px;">\
				<i class="icon-small icon-random"></i> Links</button>\
			<div class="tags_area">\
				<hr>\
			</div>\
			<div class="assign_area">\
				<hr>\
				<div><button class="btn btn-small" style="margin-top: -2px">\
					<i class="icon-small icon-ok"></i>\
					Assign To</button></div>\
			</div>\
			<div class="attach_area">\
				<hr>\
				<div><button class="btn btn-small" style="margin-top: -2px">\
					<i class="icon-small icon-upload"></i>\
					Upload Attachment</button></div>\
			</div>\
			<div class="comments_area">\
				<hr>\
				<h5>Comments</h5>\
			</div>\
		</div>').appendTo(this.parent);

		this.wrapper.find(".dropdown-toggle").dropdown();
		
		this.frm.tags = new wn.ui.form.TagEditor({
			parent: this.wrapper.find(".tags_area"),
			frm: this.frm			
		});
		
		// assign to
		this.frm.assign_to = new wn.ui.form.AssignTo({
			parent: this.wrapper.find(".assign_area"),
			frm: this.frm, 
		});

		this.frm.attachments = new wn.ui.form.Attachments({
			frm: this.frm,
			parent: this.wrapper.find(".attach_area")
		});			

		this.frm.comments = new wn.ui.form.Comments({
			frm: this.frm,
			parent: this.wrapper.find(".comments_area")
		});
		
		this.frm.linked_with = new wn.ui.form.LinkedWith({
			frm: this.frm,
			parent: this.wrapper.find(".linked-with")
		})
		
	},
	refresh: function() {
		var can_create = in_list(wn.boot.profile.can_create, this.frm.doctype);
		var can_delete = (cint(this.frm.doc.docstatus) != 1) && !this.frm.doc.__islocal
			&& wn.model.can_delete(this.frm.doctype)
			
		this.wrapper.find("[data-action='new']")
			.toggle(can_create ? true : false);
		this.wrapper.find("[data-action='refresh']")
			.toggle(!this.frm.doc.__islocal);
		this.wrapper.find("[data-action='print']")
			.toggle(!(this.frm.doc.__islocal || this.frm.meta.allow_print));
		this.wrapper.find("[data-action='email']")
			.toggle(!(this.frm.doc.__islocal || this.frm.meta.allow_email));
		this.wrapper.find("[data-action='copy']")
			.toggle(!(!can_create || this.frm.meta.allow_copy));
		this.wrapper.find("[data-action='delete']")
			.toggle(can_delete ? true : false);
		
		this.frm.linked_with.refresh();
		this.frm.tags.refresh();
		this.frm.assign_to.refresh();
		this.frm.attachments && this.frm.attachments.refresh();
		this.frm.comments.refresh();
	}
})