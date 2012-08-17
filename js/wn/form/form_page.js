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

// form in a page

wn.views.FormPage = Class.extend({
	init: function(doctype, name) {
		this.doclist = wn.model.get(doctype, name);
		this.make_page();
		this.set_breadcrumbs(doctype, name);
		this.form = new wn.ui.Form({
			doclist: this.doclist,
			doc: this.doclist.doc,
			parent: this.$w,
			appframe: this.page.appframe
		});
		this.make_toolbar(doctype, name);
	},
	set_breadcrumbs: function(doctype, name) {
		wn.views.breadcrumbs(this.page.appframe, 
			wn.model.get_value('DocType', doctype, 'module'), doctype, name);
	},
	make_page: function() {
		var page_name = wn.get_route_str();
		this.page = wn.container.add_page(page_name);
		wn.ui.make_app_page({parent:this.page});
		wn.container.change_to(page_name);
		this.$w = $(this.page).find('.layout-main-section');
		this.$sidebar = $(this.page).find('.layout-side-section');
	},
	make_toolbar: function() {
		var me = this;
		this.page.appframe.add_button('Save', function() { 
			var btn = this;
			$(this).html('Saving...').attr('disabled', 'disabled');
			me.form.doclist.save(0, function() {
				$(this).attr('disabled', false).html('Save');
			});
		});
		
		if(!this.doclist.doc.get('__islocal')) {
			this.make_action_buttons();
			this.assign_to = new wn.ui.AssignTo({form_page: this});
			this.comments = new wn.ui.Comments({form_page: this});			
		}

		this.make_help_buttons();
	},

	make_action_buttons: function() {
		this.action_btn_group = $('<div class="btn-group">\
		<button class="btn dropdown-toggle btn-small" data-toggle="dropdown">\
			Actions\
			<span class="caret"></span>\
		</button>\
		<ul class="dropdown-menu">\
			<li><a href="#" class="action-new"><i class="icon icon-plus"></i> New</a></li>\
			<li><a href="#" class="action-print"><i class="icon icon-print"></i> Print...</a></li>\
			<li><a href="#" class="action-print"><i class="icon icon-envelope"></i> Email...</a></li>\
			<li><a href="#" class="action-copy"><i class="icon icon-file"></i> Copy</a></li>\
			<li><a href="#" class="action-refresh"><i class="icon icon-refresh"></i> Refresh</a></li>\
		</ul>\
		</div>').appendTo(this.page.appframe.$w.find('.appframe-toolbar'));
		this.action_btn_group.find('.dropdown-toggle').dropdown();
		
	},
	make_help_buttons: function() {
		var meta = this.form.meta.doc;
		if(meta.get('description'))
			this.page.appframe.add_help_button(meta.get('description'));
		this.page.appframe.add_inverse_button(meta.get('name'), function() {
			
		})
	},	
});

// comments
wn.ui.Comments = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_body();
		// render existing
		var me = this;
		$.each(this.form_page.doclist.doc.get('__comments'), function(i, v) {
			me.render_comment(v);
		})
	},
	make_body: function() {
		var me = this;
		this.$w = $('<div class="comments-area"><br>\
			<b>Comments:</b><br>\
			<textarea style="width: 190px; height: 36px;" \
				class="comment comment-text"></textarea>\
			<button class="btn btn-small">Add Comment</button>\
			<div class="comment-list" style="margin-top: 17px;"></div>\
			</div>').appendTo(this.form_page.$sidebar);
		this.$w.find('.btn').click(function() {
			me.add_comment(me.$w.find('textarea').val());
		})
	},
	add_comment: function(comment) {
		var me = this;
		
		wn.model.insert({
			doctype: 'Comment',
			comment: comment,
			comment_doctype: this.form_page.doclist.doc.get('name'),
			comment_docname: this.form_page.doclist.doc.get('doctype'),
			comment_by: user,
			comment_by_fullname: wn.boot.user_info[user].fullname
		}, function(r) {
			me.$w.find('textarea').val('');
			me.render_comment(r.message);
		}, this.$w.find('.btn'))

	},
	render_comment: function(comment) {
		comment.date = prettyDate(comment.creation)
		$(repl('<div style="margin-bottom: 7px; border-bottom: 1px dashed #888; \
			padding-bottom: 7px;">\
			<p class="comment">%(comment)s<br>\
			<div style="font-size: 80%">\
				<span style="color: #888;">%(date)s</span>\
				<span style="float: right; color: #888;">- %(comment_by_fullname)s</span>\
			</div>\
			</p></div>', comment))
				.prependTo(this.$w.find('.comment-list'));
	}
})

// assign to
wn.ui.AssignTo = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_button();
		this.make_dropdown();
		if(this.form_page.doclist.doc.get('__assigned_to')) {
			this.set_assign_button_text(wn.boot.user_info[
				this.form_page.doclist.doc.get('__assigned_to')]);
		}
	},
	make_button: function() {
		this.$w = $('<div class="btn-group">\
			<span class="label dropdown-toggle" \
				style="width: 180px; overflow: hidden; text-align: left; display: inline-block;" \
				data-toggle="dropdown">Not Assigned</span>\
			<ul class="dropdown-menu">\
			</ul>\
		</div>').appendTo(this.form_page.$sidebar);		
	},
	make_dropdown: function() {
		this.assign_btn = this.$w.find('.dropdown-toggle');
		var ul = this.$w.find('ul');
		var me = this;
		
		$.each(keys(wn.boot.user_info).sort().concat(''), function(i, v) {
			if(v!='Guest') {
				if(v) {
					var ui = $.extend(wn.boot.user_info[v], {id: v});
				} else {
					var ui = {fullname:'Not Assigned', id: null};
					$('<li class="divider"></li>').appendTo(ul);
				}
	
				$('<a></a>').html(ui.fullname).data('user-info', ui)
					.appendTo($('<li>').appendTo(ul)).click(function() {
						me.assign($(this).data('user-info'));
					});
			}
		});
		
		this.assign_btn.dropdown();		
	},
	assign: function(user_info) {
		this.assign_btn.attr('disabled', 'disabled').text('Updating...');
		var me = this;
		if(user_info.id) {
			wn.model.insert({
				doctype: 'ToDo',
				reference_name: this.form_page.doclist.doc.get('name'),
				reference_type: this.form_page.doclist.doc.get('doctype'),
				owner: user_info.id,
				description: 'You have been assigned this.',
				assigned_by: user
			}, function(r) {
				me.set_assign_button_text(user_info);
			})
		} else {
			wn.call({
				method: 'core.doctype.todo.todo.remove_todo',
				args: {
					reference_name: this.form_page.doclist.doc.get('name'),
					reference_type: this.form_page.doclist.doc.get('doctype')					
				},
				callback: function(r) {
					me.set_assign_button_text(user_info);
				}
			});
		}
	},
	set_assign_button_text: function(user_info) {
		if(user_info.id) {
			this.assign_btn.text(user_info.fullname).addClass('label-success', user_info.id);			
		} else {
			this.assign_btn.text(user_info.fullname).removeClass('label-success', user_info.id);			
		}
		this.assign_btn.attr('disabled', null);
		this.assign_to = user_info.id;
	},
	
})
