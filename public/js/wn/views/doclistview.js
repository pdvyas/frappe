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
		this.can_delete = wn.model.can_delete(this.doctype);
		this.make_page();
		this.setup_docstatus_filter();
		this.setup_listview();
		this.make_doclist();
		this.init_stats();
		this.listview.listing = this.listing;
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
				<div class="wnlist-area" style="margin-top: -15px;"></div>\
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
		var module = locals.DocType[this.doctype].module;
		
		this.appframe.set_marker(module);
		
		wn.views.breadcrumbs(this.appframe, locals.DocType[this.doctype].module, this.doctype);
		this.appframe.add_tab('<span class="small-module-icons small-module-icons-'+
			module.toLowerCase()+'"></span>'+' <span>'
			+ module + "</span>", 0.7, function() {
			wn.set_route(wn.modules[module]);
		});
	},
	setup_listview: function() {
		this.meta = locals.DocType[this.doctype];
		if(this.meta.__listjs) {
			eval(this.meta.__listjs);
			this.listview = new wn.doclistviews[this.doctype]({
				doctype: this.doctype,
				can_delete: this.can_delete
			});
		} else {
			this.listview = new wn.views.ListView({
				doctype: this.doctype,
				can_delete: this.can_delete				
			});
		}
		this.listview.parent = this;
	},
	setup_docstatus_filter: function() {
		var me = this;
		this.can_submit = $.map(locals.DocPerm, function(d) { 
			if(d.parent==me.doctype && d.submit) return 1
			else return null; 
		}).length;
		if(this.can_submit) {
			this.$page.find('.show-docstatus').removeClass('hide');
			this.$page.find('.show-docstatus input').click(function() {
				me.listing.run();
			})
		}
	},	
	make_doclist: function() {
		this.listing = new wn.views.DocListView({
			doctype: this.doctype, 
			page: this.page,
			parent: $(this.page).find(".wnlist-area"),
			no_title: true
		});
	},
	init_stats: function() {
		this.stats = new wn.views.ListViewStats({
			doctype: this.doctype,
			listing: this.listing,
			$page: this.$page,
			stats: this.listview.stats
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
	}
});

// opts: stats, doctype, $page, doclistview
wn.views.ListViewStats = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this
		wn.call({
			method: 'webnotes.widgets.doclistview.get_stats',
			args: {
				stats: me.stats,
				doctype: me.doctype
			},
			callback: function(r) {
				// This gives a predictable stats order
				$.each(me.stats, function(i, v) {
					me.render_stat(v, r.message[v]);
				});
				
				// reload button at the end
				if(me.stats.length) {
					$('<button class="btn btn-small"><i class="refresh"></i> Refresh</button>')
						.click(function() {
							me.reload_stats();
						}).appendTo($('<div class="stat-wrapper">')
							.appendTo(me.$page.find('.layout-side-section')))					
				}
				
			}
		});
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
		return $(repl("<span style='margin-right: 7px; cursor: pointer;' \
			class='label label-info' data-field='_user_tags' data-label='%(label)s'>\
			%(label)s(%(count)s)</span>", {
				label: v[0],
				count: v[1]
			})).click(function() {
				return me.set_filter(this);
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
		
		try { args.bar_style = "bar-" + me.listview.label_style[field][args.label]; } 
		catch(e) { }

		$item = $(repl('<div class="progress">\
				<div class="bar %(bar_style)s" style="width: %(width)s%"></div>\
			</div>\
			<div class="stat-label">\
				<a href="#" data-label="%(label)s" data-field="%(field)s">\
					%(label)s</a> (%(count)s)\
		</div>', args))
		
		$item.find("a").click(function() {
			return me.set_filter(this);
		});
		
		return $item;
	},
	reload_stats: function() {
		this.$page.find('.layout-side-section .stat-wrapper').remove();
		this.init();
	},
	set_filter: function(target) {
		var fieldname = $(target).attr('data-field');
		var label = $(target).attr('data-label');
		this.listing.set_filter(fieldname, label);
		return false;		
	}
});

wn.views.ListView = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		
		var t = "`tab"+this.doctype+"`.";
		this.fields = [t + 'name', t + 'owner', t + 'modified_by', t + 'docstatus', 
			t + '_user_tags', t + 'modified'];
		this.stats = ['_user_tags'];
		this.show_hide_check_column();

	},
	columns: [
		{width: '3%', content:'check'},
		{width: '5%', content:'avatar'},
		{width: '3%', content:'docstatus', css: {"text-align": "center"}},
		{width: '35%', content:'name'},
		{width: '39%', content:'tags', css: {'color':'#aaa'}},
		{width: '15%', content:'modified', css: {'text-align': 'right', 'color':'#222'}}		
	],
	render_column: function(data, parent, opts) {
		var me = this;
		
		// style
		if(opts.css) {
			$.each(opts.css, function(k, v) { $(parent).css(k, v)});
		}
		
		// multiple content
		if(opts.content.indexOf && opts.content.indexOf('+')!=-1) {
			$.map(opts.content.split('+'), function(v) {
				me.render_column(data, parent, {content:v});
			});
			return;
		}
		
		// content
		if(typeof opts.content=='function') {
			opts.content(parent, data, me);
		}
		else if(opts.content=='name') {
			$(parent).append(repl('<a href="#!Form/%(doctype)s/%(name)s">%(name)s</a>', data));
		} 
		else if(opts.content=='avatar') {
			$(parent).append(wn.avatar(data.modified_by))
				.css("padding-left", "0px")
				.attr("title", "Last Updated By: " + wn.user_info(data.modified_by).fullname);
		}
		else if(opts.content=='check') {
			$(parent).append('<input class="list-delete" type="checkbox">');
			$(parent).find('input').data('name', data.name);			
		}
		else if(opts.content=='docstatus') {
			$(parent).append(repl('<span class="docstatus"><i class="%(docstatus_icon)s" \
				title="%(docstatus_title)s"></i></span>', data));			
		}
		else if(opts.content=='tags') {
			this.add_user_tags(parent, data);
		}
		else if(opts.content=='modified') {
			$(parent).append(data.when);
		}
		else if(opts.type=='bar-graph') {
			this.render_bar_graph(parent, data, opts.content, opts.label);
		}
		else if(opts.type=='link' && opts.doctype) {
			$(parent).append(repl('<a href="#!Form/'+opts.doctype+'/'
				+data[opts.content]+'">'+data[opts.content]+'</a>', data));
		}
		else if(opts.template) {
			$(parent).append(repl(opts.template, data));
		}
		else if(data[opts.content]) {
			if(opts.type=="date") {
				data[opts.content] = wn.datetime.str_to_user(data[opts.content])
			}
			$(parent).append(repl('<span title="%(title)s"> %(content)s</span>', {
				"title": opts.title || opts.content, "content": data[opts.content]}));
		}
		
	},
	render: function(row, data) {
		var me = this;
		this.prepare_data(data);
		rowhtml = '';
				
		// make table
		$.each(this.columns, function(i, v) {
			rowhtml += repl('<td style="width: %(width)s"></td>', v);
		});
		var tr = $(row).html('<table class="doclist-row"><tbody><tr>' + rowhtml + '</tr></tbody></table>').find('tr').get(0);
		
		// render cells
		$.each(this.columns, function(i, v) {
			me.render_column(data, tr.cells[i], v);
		});
	},
	prepare_data: function(data) {
		data.fullname = wn.user_info(data.owner).fullname;
		data.avatar = wn.user_info(data.owner).image;

		data.fullname_modified = wn.user_info(data.modified_by).fullname;
		data.avatar_modified = wn.user_info(data.modified_by).image;
		
		if(data.modified)
			this.prepare_when(data, data.modified);
		
		// docstatus
		if(data.docstatus==0 || data.docstatus==null) {
			data.docstatus_icon = 'icon-pencil';
			data.docstatus_title = 'Editable';
		} else if(data.docstatus==1) {
			data.docstatus_icon = 'icon-lock';			
			data.docstatus_title = 'Submitted';
		} else if(data.docstatus==2) {
			data.docstatus_icon = 'icon-remove';			
			data.docstatus_title = 'Cancelled';
		}
		
		// nulls as strings
		for(key in data) {
			if(data[key]==null) {
				data[key]='';
			}
		}
	},
	
	prepare_when: function(data, date_str) {
		if (!date_str) date_str = data.modified;
		// when
		data.when = (dateutil.str_to_user(date_str)).split(' ')[0];
		var diff = dateutil.get_diff(dateutil.get_today(), date_str.split(' ')[0]);
		if(diff==0) {
			data.when = dateutil.comment_when(date_str);
		}
		if(diff == 1) {
			data.when = 'Yesterday'
		}
		if(diff == 2) {
			data.when = '2 days ago'
		}
	},
	
	add_user_tags: function(parent, data) {
		var me = this;
		if(data._user_tags) {
			if($(parent).html().length > 0) {
				$(parent).append('<br />');
			}
			$.each(data._user_tags.split(','), function(i, t) {
				if(t) {
					$('<span class="label label-info" style="cursor: pointer; line-height: 200%">' 
						+ strip(t) + '</span>')
						.click(function() {
							me.listing.set_filter('_user_tags', $(this).text())
						})
						.appendTo(parent);
				}
			});
		}		
	},
	show_hide_check_column: function() {
		if(!this.can_delete) {
			this.columns = $.map(this.columns, function(v, i) { if(v.content!='check') return v });
		}
	},
	render_bar_graph: function(parent, data, field, label) {
		var args = {
			percent: data[field],
			fully_delivered: (data[field] > 99 ? 'bar-complete' : ''),
			label: label
		}
		$(parent).append(repl('<span class="bar-outer" style="width: 30px; float: right" \
			title="%(percent)s% %(label)s">\
			<span class="bar-inner %(fully_delivered)s" \
				style="width: %(percent)s%;"></span>\
		</span>', args));
	},
	render_icon: function(parent, icon_class, label) {
		var icon_html = "<i class='%(icon_class)s' title='%(label)s'></i>";
		$(parent).append(repl(icon_html, {icon_class: icon_class, label: label || ''}));
	}
});

wn.provide('wn.views.RecordListView');
wn.views.RecordListView = wn.views.DocListView.extend({
	init: function(doctype, wrapper, ListView) {
		this.doctype = doctype;
		this.wrapper = wrapper;
		this.listview = new ListView({
			doctype: this.doctype
		});
		this.listview.parent = this;
		this.setup();
	},

	setup: function() {
		var me = this;
		me.page_length = 10;
		$(me.wrapper).empty();
		me.init_list();
		me.run();
	},

	get_args: function() {
		var args = this._super();
		$.each((this.default_filters || []), function(i, f) {
		      args.filters.push(f);
		});
		args.docstatus = args.docstatus.concat((this.default_docstatus || []));
		return args;
	},
});