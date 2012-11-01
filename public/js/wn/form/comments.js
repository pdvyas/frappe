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

wn.ui.form.Comments = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
	},
	make: function() {
		this.wrapper = $('<div>\
			<input type="text" style="width: 100%;">\
			<div class="alert-list"></div>\
		</div>').appendTo(this.parent);

		this.$list = this.wrapper.find(".alert-list");
		
		var me = this;
		this.wrapper.find("input").keydown(function(e) {
			if(e.which==13) {
				me.new_comment($(this).val());
			}			
		});
		
	},
	refresh: function() {
		if(this.frm.doc.__islocal) {
			this.parent.toggle(false);
			return;
		}
		this.parent.toggle(true);
		
		var me = this;
		wn.call({
			method:'webnotes.widgets.form.comments.get_comments',
			args: {
				dt: this.frm.doctype, dn: this.frm.docname, limit: 10
			},
			callback: function(r) {
				me.render(r.message || []);
			}
		});
	},
	render: function(comment_list) {
		this.$list.empty();
		var me = this;
		this.comment_list = comment_list;
		$.each(comment_list, function(i, c) {
			me.get_comment(c).appendTo(me.$list);
		});
		this.refresh_latest_comment();
		this.$list.find('.avatar img').centerImage();
	},
	get_comment: function(c, width) {
		$.extend(c, wn.user_info(c.comment_by));
		c.avatar = wn.avatar(c.comment_by);
		c.comment_when = comment_when(c.creation);
		c.width = width || "145px"
		return $(repl('<div style="width: 40px; float: left;">\
				%(avatar)s\
			</div><div style="float: left; width: %(width)s; margin-bottom: 9px;">\
				%(comment)s<br>\
				<span class="help small">by %(fullname)s, %(comment_when)s</span>\
			</div><div class="clear"></div>', c))
	},
	new_comment: function(txt) {
		var me = this;
		var args = {
			comment: txt,
			comment_by: user,
			comment_doctype: this.frm.doctype,
			comment_docname: this.frm.docname
		}
		wn.call({
			method:'webnotes.widgets.form.comments.add_comment',
			args: args,
			callback: function(r) {
				me.wrapper.find("input").val("");
				me.comment_list = [args].concat(me.comment_list || []);
				me.get_comment(args).prependTo(me.$list);
				me.$list.find('.avatar img').centerImage();
				me.refresh_latest_comment();
			}
		});
	},
	refresh_latest_comment: function() {
		var wrapper = this.frm.page_layout.body;
		if(!$(wrapper).find(".latest-comment").length) {
			$('<div class="latest-comment alert" style="margin-top:0px;">')
				.prependTo(wrapper);
		}

		var comment_wrapper = $(wrapper).find(".latest-comment");
		if(this.comment_list && this.comment_list.length) {
			
			this.get_comment(this.comment_list[0], ($(wrapper).width() - 100) + "px")
				.appendTo(comment_wrapper.empty().toggle(true));
			comment_wrapper.find('.avatar img').centerImage();
		} else {
			comment_wrapper.toggle(false);
		}
	}
})