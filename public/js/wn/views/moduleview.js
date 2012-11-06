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

wn.get_module_color = function(module) {
	try {
		var color = wn.meta.get("Desktop Item", {label:module})[0].gradient.split(",")[1];
	} catch(e) {
		var color = "#000";
	}
	return color;
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
					margin-top: -6px; width: 28px; height: 24px; \
					text-align: center; padding-top: 4px;\
					border-radius: 28px; border: 2px solid #fff; \
					background-color: %(back)s">\
				<span \
					class="small-module-icons small-module-icons-%(module_lower)s"></span>\
				</span> %(_module)s ', {
					module_lower: this.module.toLowerCase(),
					_module: wn._(this.module),
					back: wn.get_module_color(this.module)
				}),
			single_column: true
		});
		wn.container.change_to(this.page_name);
		$("<div class='pull-left' style='width: 48%'><div class='alert'>"+
			wn._("Loading") + "...</div></div>\
			<div class='pull-right' style='width: 48%'></div>\
			<div class='clearfix'></div>").appendTo($(this.page)
				.find(".layout-main").css("min-height", "400px"));
				
		this.page.appframe.set_marker(this.module);
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
		var $left = $(this.page).find(".pull-left").empty();
		var $right = $(this.page).find(".pull-right");

		this.make_section('transaction', wn._("Transactions"), $left);
		this.make_section('master', wn._("Masters"), $left);
		this.make_section('setup', wn._("Setup"), $left);
		this.make_section('other', wn._("Other"), $left);
		this.make_section('tool', wn._("Tools"), $left);
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
			wn.translate(item, ["name", "description", "title"])
			if(item.item_type==section) {
				if(me.has_permission(item)) {
					(me.formatters[section] || me.formatters.def)(item)
						.appendTo($("<p>").appendTo(div));
					added = true;					
				}
			}
		});
		$("<hr>").appendTo(div);
		
		if(!added) div.toggle(false);
	},
	has_permission: function(item) {
		if(item.item_type=="tool") {
			if(wn.boot.profile.allow_pages.indexOf(item.name)!=-1)
				return true;
		} else if (item.item_type=="report") {
			return wn.model.can_read(item.ref_doctype);
		} else if (item.item_type=="search_criteria") {
			return wn.model.can_read(item.doctype);
		} else {
			return wn.model.can_read(item.name);
		}
		return false
	},
	formatters: {
		def: function(item) {
			// default formatter for doctypes			
			if(item.open_count!=null) {
				item.open_count = '<span class="badge badge-important" \
					style="float:right; margin-right: 4px;">'
					+item.open_count+'</span>';
			} else {
				item.open_count = "";				
			}
			
			if(item.count!=null) {
				item.count = "<span class='badge' style='float: right;'>"+item.count+"</span>"
			} else {
				item.count = "";				
			}
			
			if(item.issingle) {
				item.main_link = repl("<a href='#Form/%(name)s/%(name)s'>\
					<b style='font-size: 110%'>%(_name)s</b></a>", 
					item);
			} else {
				item.main_link = repl("<a href='#List/%(name)s'>\
					<b style='font-size: 110%'>%(_name)s</b></a>", item);
			}
			
			return $(repl("<span style='display:inline-block; float: right; width: 20%;'>\
					%(count)s %(open_count)s</span>\
				<span class='module-item'>\
					%(main_link)s \
					<span class='help' title='%(_description)s'>\
						%(_description)s</span>\
				</span>\
				", item));
		},
		tool: function(item) {
			if(!item.title) item.title = item.name;
			if(!item.description) item.description = "";
			return $(repl("<span class='module-item'>\
				<a href='#%(name)s'>%(_title)s</a>\
				<span class='help' title='%(_description)s'>\
					%(_description)s</span>\
				</span>", item));
		},
		report: function(item) {
			return $(repl("<a href='#Report2/%(ref_doctype)s/%(name)s'>%(_name)s</a>", item));
		},
		query_report: function(item) {
			return $(repl("<a href='#query-report/%(name)s'>%(_name)s</a>", item));
		},
		search_criteria: function(item) {
			return $(repl("<a href='#Report/%(doctype)s/%(name)s'>%(_name)s</a>", item));
		}
	}
});