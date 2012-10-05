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

		if(this.comment_list) {
			this.get_comment(this.comment_list[0], ($(wrapper).width() - 100) + "px")
				.appendTo($(wrapper).find(".latest-comment").empty());
		} else {
			$(wrapper).find(".latest-comment").toggle(false);			
		}
	}
})

// function(parent, sidebar, doctype, docname) {
// 	var me = this;
// 	this.sidebar = sidebar;
// 	this.doctype = doctype; this.docname = docname;
// 	
// 	this.refresh = function() {
// 		$c('webnotes.widgets.form.comments.get_comments', {dt: me.doctype, dn: me.docname, limit: 5}, function(r, rt) {
// 			wn.widgets.form.comments.sync(me.doctype, me.docname, r);
// 			me.make_body();
// 			me.refresh_latest_comment();
// 		});
// 	}
// 	
// 	this.refresh_latest_comment = function() {
// 		var wrapper = cur_frm.page_layout.body;
// 		if(!$(wrapper).find(".latest-comment").length) {
// 			$('<div class="latest-comment alert" style="margin-top:0px;">').prependTo(wrapper);
// 		}
// 		var comment_list = wn.widgets.form.comments.comment_list[me.docname];
// 		if(comment_list) {
// 			$(wrapper).find(".latest-comment")
// 				.html(repl('<div style="width: 70%; float:left;">\
// 					Last Comment: <b>%(comment)s</b></div>\
// 					<div style="width: 25%; float:right; text-align: right; font-size: 90%">\
// 						by %(comment_by_fullname)s</div>\
// 					<div class="clear"></div>', comment_list[0]))					
// 				.toggle(true);
// 		} else {
// 			$(wrapper).find(".latest-comment").toggle(false);			
// 		}
// 	}
// 	
// 	
// 	this.make_body = function() {
// 		if(this.wrapper) this.wrapper.innerHTML = '';
// 		else this.wrapper = $a(parent, 'div', 'sidebar-comment-wrapper');
// 
// 		this.input = $a_input(this.wrapper, 'text');
// 		$(this.input).keydown(function(e) {
// 			if(e.which==13) {
// 				$(me.btn).click();
// 			}
// 		})
// 		this.btn = $btn(this.wrapper, 'Post', function() { me.add_comment() }, {marginLeft:'8px'});
// 
// 		this.render_comments()
// 
// 	}
// 	this.render_comments = function() {
// 		var f = wn.widgets.form.comments;
// 		var cl = f.comment_list[me.docname]
// 		this.msg = $a(this.wrapper, 'div', 'help small');
// 
// 		if(cl) {
// 			this.msg.innerHTML = cl.length + ' out of ' + f.n_comments[me.docname] + ' comments';
// 			if(f.n_comments[me.docname] > cl.length) {
// 				this.msg.innerHTML += ' <span class="link_type" \
// 					onclick="cur_frm.show_comments()">Show all</span>'
// 			}
// 			for(var i=0; i< cl.length; i++) {
// 				this.render_one_comment(cl[i]);
// 			}
// 		} else {
// 			this.msg.innerHTML = 'Be the first one to comment.'
// 		}
// 	}
// 
// 	//
// 	this.render_one_comment = function(det) {
// 		// comment
// 		$a(this.wrapper, 'div', 'social sidebar-comment-text', '', det.comment);
// 		// by etc
// 		$a(this.wrapper, 'div', 'sidebar-comment-info', '', comment_when(det.creation) + ' by ' + det.comment_by_fullname);
// 	}
// 	
// 	this.
// 	
// 	this.refresh();
// }
