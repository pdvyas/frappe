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

wn.views.moduleview = {
	show: function(module) {
		var page_name = wn.get_route_str();
		if(wn.pages[page_name]) {
			wn.container.change_to(wn.pages[page_name]);
		} else {
			var route = wn.get_route();
			if(route[1]) {
				new wn.views.ModuleViewPage(route[1]);				
			} else {
				wn.set_route('404');
			}
		}
	}
}

wn.views.ModuleViewPage = Class.extend({
	init: function(module) {
		this.module = module;
		this.page_name = "Module/" + module;
		this.make_page();
		this.load_items();
	},
	make_page: function() {
		this.page = wn.container.add_page(this.page_name);
		wn.ui.make_app_page({
			parent: this.page,
			title: repl('<span \
				style="margin-right: 3px; display: inline-block; \
					margin-top: -9px; width: 34px; height: 27px; \
					text-align: center; padding-top: 7px;\
					border-radius: 34px; border: 2px solid #fff; \
					background-color: %(back)s">\
				<span \
					class="small-module-icons small-module-icons-%(module_lower)s"></span>\
				</span> %(module)s ', {
					module_lower: this.module.toLowerCase(),
					module: this.module,
					back: wn.get_module_color(this.module)
				}),
			single_column: true
		});
		wn.container.change_to(this.page_name);
		$("<div class='pull-left' style='width: 58%'></div>\
			<div class='pull-right' style='width: 38%'></div>\
			<div class='clearfix'></div>").appendTo($(this.page).find(".layout-main"));
	},
	load_items: function() {
		var me = this;
		wn.call({
			method: "webnotes.widgets.moduleview.get_items",
			args: {
				module: this.module
			},
			callback: function(r) {
				me.items = r.message;
				me.make_items();
			}
		})
	},
	make_items: function() {
		var $left = $(this.page).find(".pull-left");
		var $right = $(this.page).find(".pull-right");

		this.make_section('transaction', wn._("Transactions"), $left);
		this.make_section('master', wn._("Masters"), $left);
		this.make_section('tool', wn._("Tools"), $left);
		this.make_section('setup', wn._("Setup"), $left);
		this.make_section('query_report', wn._("Query Report"), $right);		
		this.make_section('report', wn._("Report"), $right);		
		this.make_section('search_criteria', wn._("Report (Old)"), $right);		
	},
	make_section: function(section, title, parent) {
		var me = this;
		var div = $("<div>").appendTo(parent);
		var added = false;
		
		$("<h4>" + title + "</h4>").appendTo(div);
		$.each(this.items, function(i, item) {
			if(item.item_type==section) {
				(me.formatters[section] || me.formatters.def)(item)
					.appendTo($("<p>").appendTo(div));
				added = true;
			}
		});
		$("<hr>").appendTo(div);
		
		if(!added) div.toggle(false);
	},
	formatters: {
		def: function(item) {
			if(item.open_count) {
				item.open_count = '<span class="badge badge-important">'
					+item.open_count+'</span>';
			} else 
				item.open_count = "";
			
			return $(repl("<a href='#List/%(name)s'><b>%(name)s</b></a> \
				<span class='badge'>%(count)s</span> %(open_count)s", item));			
		},
		tool: function(item) {
			if(!item.title) item.title = item.name;
			return $(repl("<a href='#%(name)s'>%(title)s</a>", item));
		},
		report: function(item) {
			return $(repl("<a href='#Report2/%(name)s'>%(name)s</a>", item));
		},
		query_report: function(item) {
			return $(repl("<a href='#query-report/%(name)s'>%(name)s</a>", item));
		},
		search_criteria: function(item) {
			return $(repl("<a href='#Report/%(doctype)s/%(name)s'>%(name)s</a>", item));
		}
	}
});




wn.views.ModuleView = function(module, wrapper) {
	var items = {};
	wn.ui.make_app_page({
		parent: wrapper,
		title: wn._(module),
		single_column: true
	});

	wn.call({
		method: 'core.doctype.module_def.module_def.get_items',
		args: {
			module: module
		},
		callback: function(r) {
			items = r.message;
			make_section('transaction', wn._("Transactions"));
			make_section('master', wn._("Masters"));
			make_section('tool', wn._("Tools"));
			make_section('setup', wn._("Setup"));
			make_section('report', wn._("Report"));
		}
	})
	
	var make_section = function(name, title) {
		if(!items[name].length) return;
		
		$(repl('<h4>%(title)s</h4><br><div class="%(name)s"></div><hr>', {title: title, name: name}))
			.appendTo($(wrapper).find('.layout-main'));
		
		var $body = $(wrapper).find('.' + name);
		
		// get maxx
		var maxx = Math.max.apply(this, $.map(items[name], function(v) {
			if(v[0]=='DocType') {
				var m = 0;
				$.each(v[2], function(i,count) { m=m+count });
				return m;
			};
		}));
				
		// items
		$.each(items[name], function(i, v) {
			make_item($body, v, name, parseInt(maxx));
		});
	}
	
	var make_item = function(parent, v, section_name, maxx) {
		var icons = {
			"DocType": "icon-pencil",
			"Single": "icon-cog",
			"Page": "icon-cog",
			"Report": "icon-th"
		};
		if(section_name=='master') {
			icons.DocType = "icon-flag";
		}
				
		var routes = {
			"DocType": "#List/%(name)s",
			"Single": "#Form/%(name)s",
			"Page": "#%(name)s",
			"Report": "#Reports/%(doctype)s/%(name)s"
		}
				
		var progress = '';
		if(v[0]=='DocType' && maxx!=NaN) {
			var progress = repl('<div style="width: 60%; float: left;">\
				<div class="progress" style="width: 80%; float: left;">\
					<div class="bar bar-info" style="width: %(ds_0)s%"></div>\
					<div class="bar bar-success" style="width: %(ds_1)s%"></div>\
					<div class="bar bar-danger" style="width: %(ds_2)s%"></div>\
				</div> <div style="float: left; margin-left: 7px;">(%(maxx)s)</div>\
			</div>', {
				ds_0: v[2][0] / maxx * 100,
				ds_1: v[2][1] / maxx * 100,
				ds_2: v[2][2] / maxx * 100,
				maxx: v[2][0] + v[2][1] + v[2][2]
			});
		} 
		
		$(repl('<div style="margin: 6px 0px; min-height: 40px;"> <div style="width: 30%; float: left;">\
			<i class="icon %(icon)s"></i>\
			<b><a href="%(route)s">%(title)s</a></b></div>\
			%(progress)s\
			<div style="clear: both;"></div>\
			</div>', {
				icon: icons[v[0]],
				title: wn._(v[1]),
				progress: progress,
				route: repl(routes[v[0]], {name: v[1], doctype: v[2]})
			})).appendTo(parent);
	}
}