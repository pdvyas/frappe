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
		this.doctype = doctype;
		this.name = name;
		this.doclist = wn.model.get(doctype, name);
		this.make_page();
		this.set_breadcrumbs(doctype, name);
		this.form = wn.ui.new_form({
			doclist: this.doclist,
			doc: this.doclist.doc,
			parent: this.$w,
			appframe: this.page.appframe
		});
		this.make_toolbar(doctype, name);
		wn.ui.toolbar.recent.add(doctype, name, true);
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
		this.make_save_btn();
		this.make_help_buttons();
		
		if(!this.doclist.doc.get('__islocal')) {
			this.make_action_buttons();
			this.assign_to = new wn.ui.AssignTo({form_page: this});
			this.comments = new wn.ui.Comments({form_page: this});
			this.tags = new wn.ui.TagEditor({form_page: this});	
			this.make_status_buttons();
		}
	},
	make_save_btn: function() {
		var me = this;
		this.save_btn = this.page.appframe.add_button(wn._("Save"), function() { 
			me.save(me.save_btn);
		});
				
		this.doclist.on('change', function() {
			me.save_btn.addClass('btn-warning').attr('title', wn._("Not Saved"));
		});
		
		this.doclist.on('reset', function() {
			me.save_btn.removeClass('btn-warning').attr('title', wn._("Saved"));
		});
	},
	
	save: function(btn, to_docstatus) {
		var me = this;
		wn.freeze();
		
		// set docstatus
		me.from_docstatus = null;
		if(to_docstatus!=null && to_docstatus != me.doclist.doc.get('docstatus')) {
			me.from_docstatus = me.doclist.doc.get('docstatus');
			me.doclist.doc.set('docstatus', to_docstatus);
		}
		
		me.doclist.save(function(r) {
			wn.unfreeze();
			if(!r.exc) {
				var doc = me.doclist.doc;
				if(doc.get('name') != wn.get_route()[2]) {
					wn.re_route[window.location.hash] = 
						wn.make_route_str(['Form', doc.get('doctype'), doc.get('name')])
					wn.set_route('Form', doc.get('doctype'), doc.get('name'));
				}				
			} else {
				// revert docstatus back to original if there was an error
				if(me.from_docstatus)
					me.doclist.doc.set('docstatus', me.from_docstatus);
				msgprint(wn._("Did not save."));
			}
			me.apply_status();
		}, btn);
	},

	make_action_buttons: function() {
		this.action_btn_group = $(repl('<div class="btn-group">\
		<button class="btn dropdown-toggle btn-small" data-toggle="dropdown">\
			%(actions)s\
			<span class="caret"></span>\
		</button>\
		<ul class="dropdown-menu">\
			<li><a href="#" class="action-new"><i class="icon icon-plus"></i> %(new)s</a></li>\
			<li><a href="#" class="action-print"><i class="icon icon-print"></i> %(print)s</a></li>\
			<li><a href="#" class="action-email"><i class="icon icon-envelope"></i> %(email)s...</a></li>\
			<li><a href="#" class="action-copy"><i class="icon icon-file"></i> %(copy)s</a></li>\
			<li><a href="#" class="action-refresh"><i class="icon icon-refresh"></i> %(refresh)s</a></li>\
			<li><a href="#" class="action-delete"><i class="icon icon-remove"></i> %(delete)s</a></li>\
		</ul>\
		</div>', {
			"actions": wn._("Actions"),
			"new": wn._("New"),
			"print": wn._("Print"),
			"email": wn._("Email"),
			"copy": wn._("Copy"),
			"refresh": wn._("Refresh"),
			"delete": wn._("Delete")
			
		})).appendTo(this.page.appframe.$w.find('.appframe-toolbar'));
		this.action_btn_group.find('.dropdown-toggle').dropdown();
		
		var me = this;

		this.action_btn_group.find('.action-new').click(function() {
			var new_doclist = wn.model.create(me.doctype);
			wn.set_route('Form', me.doctype, new_doclist.doc.get('name'));
			return false;
		});

		this.action_btn_group.find('.action-copy').click(function() {
			var new_doclist = me.doclist.copy();
			wn.set_route('Form', me.doctype, new_doclist.doc.get('name'));
			return false;
		});
		
	},
	make_help_buttons: function() {
		var meta = this.form.meta.doc;
		var me = this;
		if(meta.get('description')) {
			this.page.appframe.add_help_button(wn._(meta.get('description')));
		}
	},
	make_doctype_button: function() {
		this.doctype_btn = this.page.appframe.add_button(meta.get('name'), function() {
			wn.set_route('List', meta.get('name'));
		}).addClass('btn-inverse');
		this.doctype_btn.parent().css('float', 'right');		
	},
	make_status_buttons: function() {
		var me = this;
		var ds_labels = wn.model.get_docstatus_labels(this.form.meta.doc.get('name'));
		this.docstatus_btns = {};
		
		this.docstatus_btns[0] = this.page.appframe.add_button(wn._(ds_labels[0]), function() {
			me.save(this, 0);
		});
		this.docstatus_btns[1] = $('<button class="btn btn-small"></button>').html(wn._(ds_labels[1]))
			.appendTo(this.docstatus_btns[0].parent()).click(function() {
				me.save(this, 1);
			});

		this.docstatus_btns[2] = $('<button class="btn btn-small"></button>').html(wn._(ds_labels[2]))
			.appendTo(this.docstatus_btns[0].parent()).click(function() {
				me.save(this, 2);
			});

		this.docstatus_btns[0].parent().css('float', 'right');
		this.docstatus_btn_class = {
			0: 'btn-info',
			1: 'btn-success',
			2: 'btn-danger'
		};
		this.apply_status();
		
		this.doclist.on('change docstatus', function() {
			me.apply_status();
		});		
	},
	apply_status: function() {
		var ds = this.doclist.doc.get('docstatus', 0);
		var me = this;
		$.each.call(this, [0,1,2], function(i, v) {
			me.docstatus_btns[v].removeClass(me.docstatus_btn_class[v]).attr('disabled', null);
		});
		this.docstatus_btns[ds].addClass(this.docstatus_btn_class[ds]).attr('disabled', 'disabled');
	}
});

