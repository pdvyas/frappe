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

wn.provide('wn.views.doclistview');
wn.provide('wn.doclistviews');

wn.views.doclistview.show = function(doctype) {
	var page_name = wn.get_route_str();
	if(wn.pages[page_name]) {
		wn.container.change_to(wn.pages[page_name]);
	} else {
		var route = wn.get_route();
		if(route[1]) {
			wn.model.with_doctype(route[1], function(r) {
				if(r && r['403']) {
					return;
				}
				new wn.views.DocListPage({
					doctype:route[1]
				});
			});
		}
	}
}

wn.views.DocListPage = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this;

		this.can_delete = wn.model.can_delete(this.doctype);
		this.can_submit = wn.meta.is_submittable(this.doctype);
		
		this.make_page();
		this.setup_docstatus_filter();
		this.make_listing();
		this.init_stats();
		this.listing.run();
	},
	make_page: function() {
		var me = this;
		var page_name = wn.get_route_str();
		this.page = wn.container.add_page(page_name);
		wn.container.change_to(page_name);
		this.$page = $(this.page);

		wn.dom.set_style(".show-docstatus div { font-size: 90%; }");
		
		this.$page.html('<div class="layout-wrapper layout-wrapper-background">\
			<div class="appframe-area"></div>\
			<div class="layout-main-section">\
				<div class="listview-area" style="margin-top: -15px;"></div>\
			</div>\
			<div class="layout-side-section">\
				<div class="show-docstatus hide section">\
					<div class="section-head">Show</div>\
					<div><input data-docstatus="0" type="checkbox" checked="checked" /> Drafts</div>\
					<div><input data-docstatus="1" type="checkbox" checked="checked" /> Submitted</div>\
					<div><input data-docstatus="2" type="checkbox" /> Cancelled</div>\
				</div>\
			</div>\
			<div style="clear: both"></div>\
		</div>');
		
		this.page.appframe = this.appframe = new wn.ui.AppFrame(this.$page.find('.appframe-area'));
		var module = wn.metadata.DocType[this.doctype].module;
		
		this.appframe.set_marker(module);
		this.appframe.set_title(this.doctype);
		this.appframe.set_help(wn.metadata.DocType[this.doctype].description || "")
		this.appframe.add_module_tab(module);
	},
	setup_docstatus_filter: function() {
		var me = this;
		if(this.can_submit) {
			this.$page.find('.show-docstatus').removeClass('hide');
			this.$page.find('.show-docstatus input').click(function() {
				me.listing.run();
			})
		}
	},	
	make_listing: function() {
		this.listing = new wn.views.DocListView({
			doctype: this.doctype, 
			page: this.page,
			wrapper: $(this.page).find(".listview-area"),
			no_title: true,
			can_submit: this.can_submit,
			slickgrid_options: {
				autoHeight: true
			}
			
		});
		$(this.page).find(".report-head").remove();
	},
	init_stats: function() {
		var me = this;
		this.stats = new wn.views.ListViewStats({
			doctype: this.doctype,
			$page: this.$page,
			set_filter: function(fieldname, label) {
				me.listing.set_filter(fieldname, label);
			}
		})
	},
	make_report_button: function() {
		var me = this;
		if(wn.boot.profile.can_get_report.indexOf(this.doctype)!=-1) {
			this.appframe.add_button('Build Report', function() {
				wn.set_route('Report2', me.doctype);
			}, 'icon-th')
		}
	},
	make_help: function() {
		// Help
		if(this.meta.description) {
			this.appframe.add_help_button(wn.markdown('## ' + this.meta.name + '\n\n'
				+ this.meta.description));
		}
	}
})

wn.views.DocListView = wn.views.ReportView.extend({
	make_export: function() {
		// pass
	},
	make_save: function() {
		var me = this;
		if(wn.boot.profile.can_get_report.indexOf(this.doctype)!=-1) {
			this.appframe.add_button(wn._("Build Report"), function() {
				wn.set_route('Report2', me.doctype);
			}, 'icon-th');
		}
	},
	get_docstatus: function() {
		return this.can_submit ? $.map($(this.page).find('.show-docstatus :checked'), 
			function(inp) { return $(inp).attr('data-docstatus') }) : [];
	},
	get_no_result_message: function() {
		var no_result_message = repl('<div class="well" style="margin-top: 15px;">\
		<p>%(not_found)s: %(doctype_label)s</p>\
		<hr>\
		<p><button class="btn btn-info btn-small" onclick="newdoc(\'%(doctype)s\')">\
			%(new)s %(doctype_label)s</button>\
		</p></div>', {
			"new": wn._("New"),
			not_found: wn._("Not Found"),
			doctype_label: wn._(this.doctype),
			doctype: this.doctype
		});
		
		return no_result_message;
	},
	not_editable: function(e, item, docfield) {
		if(docfield.fieldname != this.state_fieldname)
			wn.set_route("Form", this.doctype, item[this.doctype + ":name"]);
		return this._super(e, item);
	}
});

// opts: stats, doctype, $page, doclistview
wn.views.ListViewStats = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this
		wn.call({
			method: 'webnotes.widgets.reportview.get_stats',
			args: {
				doctype: me.doctype
			},
			callback: function(r) {
				// This gives a predictable stats order
				me.stats = r.message.tags;
				me.stat_data = r.message.stat_data;
				me.render();
			}
		});
	},
	
	render: function() {
		var me = this;
		$.each(me.stats, function(i, v) {
			me.render_stat(v, me.stat_data[v]);
		});
		
		// reload button at the end
		if(me.stats.length) {
			$('<button class="btn btn-small"><i class="refresh"></i> Refresh</button>')
				.click(function() {
					me.reload_stats();
				}).appendTo($('<div class="stat-wrapper">')
					.appendTo(me.$page.find('.layout-side-section')))					
		}		
	},
	
	render_stat: function(field, stat) {
		var me = this;
		
		if(!stat || !stat.length) {
			if(field=='_user_tags') {
				this.$page.find('.layout-side-section')
					.append('<div class="stat-wrapper section"><div class="section-head">Tags</div>\
						<div class="help small">No records tagged.</div></div>');
			}
			return;
		}
		
		var label = wn.meta.docfield_map[this.doctype][field] ? 
			wn.meta.docfield_map[this.doctype][field].label : field;
		if(label=='_user_tags') label = 'Tags';
		
		// grid
		var $w = $('<div class="stat-wrapper section">\
			<div class="section-head">'+ label +'</div>\
			<div class="stat-grid">\
			</div>\
		</div>');
		
		// sort items
		stat = stat.sort(function(a, b) { return b[1] - a[1] });
		var sum = 0;
		$.each(stat, function(i,v) { sum = sum + v[1]; })
		
		// render items
		$.each(stat, function(i, v) { 
			if(field=="_user_tags") {
				me.get_tag_cloud(v).appendTo($w.find('.stat-grid'))
			} else {				
				me.get_progress_bar(i, v, sum, field).appendTo($w.find('.stat-grid'));
			}
		});
		
		$w.appendTo(this.$page.find('.layout-side-section'));
	},
	
	get_tag_cloud: function(v) {
		var me = this;
		return $(repl("<span class='label label-info tag-style' \
			data-field='_user_tags' data-label='%(label)s'>\
			%(label)s(%(count)s)</span>", {
				label: v[0],
				count: v[1]
			})).click(function() {
				var fieldname = $(this).attr('data-field');
				var label = $(this).attr('data-label');
				return me.set_filter(fieldname, label);
			});
	},
	
	get_progress_bar: function(i, v, max, field) {
		var me = this;
		var args = {}
		args.label = v[0];
		args.width = flt(v[1]) / max * 100;
		args.count = v[1];
		args.field = field;
		args.bar_style = "";
		
		$item = $(repl('<div class="progress">\
				<div class="bar %(bar_style)s" style="width: %(width)s%"></div>\
			</div>\
			<div class="stat-label">\
				<a href="#" data-label="%(label)s" data-field="%(field)s">\
					%(label)s</a> (%(count)s)\
		</div>', args))
		
		$item.find("a").click(function() {
			var fieldname = $(this).attr('data-field');
			var label = $(this).attr('data-label');
			me.set_filter(fieldname, label);
			return false;
		});
		
		return $item;
	},
	
	reload_stats: function() {
		this.$page.find('.layout-side-section .stat-wrapper').remove();
		this.init();
	}
});