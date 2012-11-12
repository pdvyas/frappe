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

wn.views.ReportViewPage = Class.extend({
	init: function() {
		this.set_from_route();
		this.make_page();

		var me = this;
		wn.model.with_doctype(this.doctype, function() {
			me.make_report_view();
			if(me.docname) {
				wn.model.with_doc('Report', me.docname, function(r) {
					me.page.reportview.set_columns_and_filters(
						JSON.parse(wn.model.get("Report", me.docname)[0].json));
					me.page.reportview.run();
				});
			} else {
				me.page.reportview.run();
			}
		});

	},
	set_from_route: function() {
		var route = wn.get_route();
		this.doctype = route[1];
		var filters_arg = route[2];

		if(route[2] && route[2].indexOf("filters=")==-1) {
			this.docname = route[2];
			filters_arg = route[3];
		}
	},

	make_page: function() {
		this.page = wn.container.add_page(this.page_name());
		wn.ui.make_app_page({parent:this.page, 
			single_column:true});
		wn.container.change_to(this.page_name());
	},

	page_name: function() {
		var route = wn.get_route();
		return route[0] + '/' + 
			(this.docname 
				? (this.doctype + '/' + this.docname) 
				: this.doctype);
	},
	
	make_report_view: function() {
		var module = wn.metadata.DocType[this.doctype].module;
		this.page.appframe.set_title(this.doctype);
		this.page.appframe.set_marker(module);
		this.page.appframe.add_module_tab(module);
			
		this.page.reportview = new wn.views.ReportView({
			doctype: this.doctype, 
			docname: this.docname, 
			page: this.page,
			wrapper: $(this.page).find(".layout-main")
		});
	}
})

wn.views.ReportView = wn.ui.Listing.extend({
	init: function(opts) {
		var me = this;
		$.extend(this, opts);
		this.tab_name = '`tab'+this.doctype+'`';
		this.meta = wn.metadata.DocType[this.doctype];
		this.can_delete = wn.model.can_delete(this.doctype);
		this.setup();
		this.set_filter_values_from_route();
		if(this.filter_values)
			this.setup_filters(this.filter_values);
	},

	setup: function() {
		var me = this;
		$("<div class='report-head'></div><div class='report-grid'></div>")
			.appendTo(this.wrapper)
			
		this.state_fieldname = wn.meta.get_state_fieldname(this.doctype);
		this.make({
			title: this.no_title ? "" : ('Report: ' + (this.docname ? (this.doctype + ' - ' + this.docname) : this.doctype)),
			appframe: this.page.appframe,
			method: 'webnotes.widgets.reportview.get',
			get_args: this.get_args,
			parent: $(this.wrapper).find('.report-grid'),
			start: 0,
			page_length: 20,
			show_filters: true,
			new_doctype: this.doctype,
			allow_delete: true
		});
		this.make_delete();
		this.make_column_picker();
		this.make_sorter();
		this.make_export();
		this.set_init_columns();
		this.make_save();
		this.set_tag_and_status_filter();
	},

	set_init_columns: function() {
		// pre-select mandatory columns
		var columns = wn.user.get_default("_list_settings:" + this.doctype);
		if(!columns) {
			var columns = [['name', this.doctype],];
			$.each(wn.meta.docfield_list[this.doctype], function(i, df) {
				if(df.in_filter && df.fieldname!='naming_series'
					&& !in_list(no_value_fields, df.fieldname)) {
					columns.push([df.fieldname, df.parent]);
				}
			});
		}
		
		this.set_columns(columns);
	},
	
	set_columns: function(columns) {
		this.columns = columns;
	},
	
	// preset columns and filters from saved info
	set_columns_and_filters: function(opts) {
		var me = this;
		if(opts.columns) this.columns = opts.columns;
		if(opts.filters) this.setup_filters(opts.filters);
		
		// first sort
		if(opts.sort_by) 
			this.sort_by_select.val(opts.sort_by);
		if(opts.sort_order) 
			this.sort_order_select.val(opts.sort_order);
		
		// second sort
		if(opts.sort_by_next) 
			this.sort_by_next_select.val(opts.sort_by_next);
		if(opts.sort_order_next) 
			this.sort_order_next_select.val(opts.sort_order_next);
	},
	
	set_filter_values_from_route: function() {
		var route = wn.get_route();
		if(route.length < 3) return;
		var filters = route[2];
		if(filters.indexOf("filters=")==-1)
			filters = route[3];
		if(!filters || filters.indexOf("filters=")==-1)
			return
		this.filter_values = JSON.parse(filters.split("filters=")[1]);
	},
	
	setup_filters: function(filters) {
		var me = this;
		this.filter_list.clear_filters();
		if(filters) {
			$.each(filters, function(i, f) {
				// fieldname, condition, value
				me.filter_list.add_filter(f[0], f[1], f[2], f[3]);
			});
			this.filter_values = filters;
		}
	},
	
	// build args for query
	get_args: function() {
		var me = this;
		return {
			from_reportview: 1,
			doctype: this.doctype,
			fields: $.map(this.columns, function(v) { 
				return me.get_full_column_name(v) }),
			order_by: this.get_order_by(),
			filters: this.filter_values || [],
			docstatus: this.get_docstatus()
		}
	},
		
	filter_change: function() {
		this.refresh();
		//this.set_route_from_filters(this.filter_list.get_filters());
	},

	set_route_from_filters: function(filters) {
		var route = wn.get_route();
		if(filters && filters.length) {
			filters = 'filters=' + JSON.stringify(filters);			
			wn.set_route(route[0], route[1], 
				this.docname || filters, this.docname && filters);			
		} else {
			wn.set_route(route[0], route[1], 
				this.docname);
		}
			
	},
	
	get_docstatus: function() {
		return ['0', '1', '2']
	},
	
	get_order_by: function() {
		// first 
		var order_by = this.get_selected_table_and_column(this.sort_by_select) 
			+ ' ' + this.sort_order_select.val();
			
		// second
		if(this.sort_by_next_select.val()) {
			order_by += ', ' 
				+ this.get_selected_table_and_column(this.sort_by_next_select) 
				+ ' ' + this.sort_order_next_select.val();
		}
		
		return order_by;
	},
	get_selected_table_and_column: function($select) {
		return this.get_full_column_name([$select.find('option:selected')
			.attr('fieldname'), 
			$select.find('option:selected').attr('table')]) 
	},
	
	// get table_name.column_name
	get_full_column_name: function(v) {
		return (v[1] ? ('`tab' + v[1] + '`') : this.tab_name) + '.' + v[0];
	},

	// build columns for slickgrid
	build_columns: function() {
		var me = this;
		return $.map(this.columns, function(c) {
			var docfield = wn.meta.docfield_map[c[1] || me.doctype][c[0]];
			var id = c[1] + ":" + c[0];
			coldef = {
				id: id,
				field: id,
				docfield: docfield,
				name: wn._(docfield ? docfield.label : toTitle(c[0])),
				width: (docfield ? cint(docfield.width) : 120) || 120,
				formatter: function(row, cell, value, columnDef, dataContext) {
					var docfield = columnDef.docfield;
					
					// workflow state formatter
					if(docfield.fieldname==me.state_fieldname) {
						return wn.form.formatters.WorkflowState(value);
					} else {
						return wn.form.get_formatter(docfield ? docfield.fieldtype : "Data")(value, docfield);
					}
				},
				editor: (docfield ? wn.form.get_editor(docfield) : null)
			}

			return coldef;
		});
	},

	refresh: function() {
		this.set_filter_values_from_route();
		if(JSON.stringify(this.filter_values)!=
			JSON.stringify(this.filter_list.get_filters())) {
			// filters changed, re-route
			this.filter_values = this.filter_list.get_filters();
			this.set_route_from_filters(this.filter_values);
			return;
		}
		this._super();
	},

	// render data
	render_list: function() {
		var me = this;
		//this.gridid = wn.dom.set_unique_id()
		var std_columns = [{id:'_idx', field:'_idx', name: 'Sr.', width: 40, maxWidth: 40}];
		if(this.can_delete) {
			std_columns = std_columns.concat([{
				id:'_check', field:'_check', name: "", width: 30, maxWidth: 30, 
					formatter: function(row, cell, value, columnDef, dataContext) {
						return repl("<input type='checkbox' \
							data-row='%(row)s' %(checked)s>", {
								row: row,
								checked: (dataContext._checked ? "checked" : "")
							});
					}
			}])
		}
		var columns = std_columns.concat(this.build_columns());

		// add sr in data
		$.each(this.data, function(i, v) {
			// add index
			v._idx = i+1;
			v.id = v._idx;
		});

		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			editable: in_list(wn.boot.profile.can_write, this.doctype) ? true : false,
			rowHeight: 30
		};
		
		if(this.slickgrid_options) {
			$.extend(options, this.slickgrid_options);
		}

		this.col_defs = columns;

		this.dataView = new Slick.Data.DataView();
		this.set_data(this.data);
	
		grid_wrapper = this.$w.find('.result-list');
	
		// set height if not auto
		if(!options.autoHeight) 
			grid_wrapper.css('height', '500px');
		
		this.grid = new Slick.Grid(grid_wrapper
			.css('border', '1px solid #ccc')
			.css('border-top', '0px')
			.get(0), this.dataView, 
			columns, options);
				
		if(options.editable) this.setup_edit();
		
		wn.slickgrid_tools.add_property_setter_on_resize(this.grid);
		if(this.start!=0 && !options.autoHeight) {
			this.grid.scrollRowIntoView(this.data.length-1);
		}
	},
	
	set_data: function() {
		this.dataView.beginUpdate();
		this.dataView.setItems(this.data);
		this.dataView.endUpdate();
	},
	
	set_tag_and_status_filter: function() {
		var me = this;
		this.$w.find('.result-list').on("click", ".label-info", function() {
			if($(this).attr("data-label")) {
				me.set_filter("_user_tags", $(this).attr("data-label"));
			}
		});
		this.$w.find('.result-list').on("click", "[data-workflow-state]", function() {
			if($(this).attr("data-workflow-state")) {
				me.set_filter(me.state_fieldname, 
					$(this).attr("data-workflow-state"));
			}
		});
	},
		
	// setup column picker
	make_column_picker: function() {
		var me = this;
		this.column_picker = new wn.ui.ColumnPicker(this);
		this.add_button(wn._("Pick Columns"), function() {
			me.column_picker.show(me.columns);
		}, 'icon-th-list');
	},
	
	// setup sorter
	make_sorter: function() {
		var me = this;
		this.sort_dialog = new wn.ui.Dialog({title:wn._("Sorting Preferences")});
		$(this.sort_dialog.body).html('<p class="help">'+wn._("Sort By")+'</p>\
			<div class="sort-column"></div>\
			<div><select class="sort-order" style="margin-top: 10px; width: 60%;">\
				<option value="asc">'+wn._("Ascending")+'</option>\
				<option value="desc">'+wn._("Descending")+'</option>\
			</select></div>\
			<hr><p class="help">'+wn._("Then By (optional)")+'</p>\
			<div class="sort-column-1"></div>\
			<div><select class="sort-order-1" style="margin-top: 10px; width: 60%;">\
				<option value="asc">'+wn._("Ascending")+'</option>\
				<option value="desc">'+wn._("Descending")+'</option>\
			</select></div><hr>\
			<div><button class="btn btn-small btn-info">'+wn._("Update")+'</div>');
		
		// first
		this.sort_by_select = new wn.ui.FieldSelect($(this.sort_dialog.body)
			.find('.sort-column'), this.doctype).$select;
		this.sort_by_select.css('width', '60%');
		this.sort_order_select = $(this.sort_dialog.body).find('.sort-order');
		
		// second
		this.sort_by_next_select = new wn.ui.FieldSelect($(this.sort_dialog.body)
			.find('.sort-column-1'), this.doctype, null, true).$select;
		this.sort_by_next_select.css('width', '60%');
		this.sort_order_next_select = $(this.sort_dialog.body).find('.sort-order-1');
		
		// initial values
		this.sort_by_select.val(me.doctype + '.modified');
		this.sort_order_select.val('desc');
		
		this.sort_by_next_select.val('');
		this.sort_order_next_select.val('desc');
		
		// button actions
		this.add_button(wn._("Sort By"), function() {
			me.sort_dialog.show();
		}, 'icon-arrow-down');
		
		$(this.sort_dialog.body).find('.btn-info').click(function() { 
			me.sort_dialog.hide();
			me.run();
		});
	},
	
	// setup export
	make_export: function() {
		var me = this;
		if(wn.user.is_report_manager()) {
			this.page.appframe.add_button(wn._("Export"), function() {
				var args = me.get_args();
				args.cmd = 'webnotes.widgets.reportview.export_query'
				open_url_post(wn.request.url, args);
			}, 'icon-download-alt');
		}
	},
	
	make_delete: function() {
		var me = this;
		if(this.can_delete) {
			$(this.page).on("click", "input[type='checkbox'][data-row]", function() {
				me.data[$(this).attr("data-row")]._checked 
					= this.checked ? true : false;
			});
			
			this.page.appframe.add_button(wn._("Delete"), function() {
				var delete_list = []
				$.each(me.data, function(i, d) {
					if(d._checked) {
						if(d.name)
							delete_list.push(d.name);
					}
				});
				
				if(!delete_list.length) 
					return;
				if(!confirm(wn._("This is PERMANENT action and you cannot undo. Continue?"))) {
					return;
				}

				wn.call({
					method: 'webnotes.widgets.reportview.delete_items',
					args: {
						items: delete_list,
						doctype: me.doctype
					},
					callback: function() {
						me.refresh();
					}
				})
				
			}, 'icon-remove');
		}
	},
	
	// save
	make_save: function() {
		var me = this;
		if(wn.user.is_report_manager()) {
			this.page.appframe.add_button(wn._("Save"), function() {
				// name
				if(me.docname) {
					var name = me.docname
				} else {
					var name = prompt('Select Report Name');
					if(!name) {
						return;
					}
				}
				
				// callback
				wn.call({
					method: 'webnotes.widgets.reportview.save_report',
					args: {
						name: name,
						doctype: me.doctype,
						json: JSON.stringify({
							filters: me.filter_list.get_filters(),
							columns: me.columns,
							sort_by: me.sort_by_select.val(),
							sort_order: me.sort_order_select.val(),
							sort_by_next: me.sort_by_next_select.val(),
							sort_order_next: me.sort_order_next_select.val()							
						})
					},
					callback: function(r) {
						if(r.exc) return;
						if(r.message != me.docname)
							wn.set_route('Report2', me.doctype, r.message);
					}
				});
			}, 'icon-upload');
		}
	},

	setup_edit: function() {
		var me = this;
		
		// make editable label
		// var $head = $(this.wrapper).find(".report-head");
		// $("<div class='alert'>This report is editable</div>")
		// 	.appendTo($head.empty());

		this.setup_check_if_cell_is_editable();
		
		$(this.wrapper).on("field-change", function(e, docfield, item, value) {
			if(!item) return;
			e.stopImmediatePropagation();
			
			var name_field = docfield.parent + ":name";
			
			var call_args = {
				doctype: me.doctype,
				name: item[name_field],
				fieldname: docfield.fieldname,
				value: {
					value: value
				}
			};
			
			if(docfield.parent && docfield.parent!=me.doctype) {
				call_args.parenttype = docfield.parent;
				call_args.parent = item[me.doctype + ":name"];
			}

			wn.call({
				method: 'webnotes.client.update_value',
				args: call_args,
				callback: function(r) {
					if(r.exc) {
						msgprint('Could not update');
					} else {
						// update all rows from the doclist
						$.each(me.data, function(i, row) {
							$.each(r.message, function(j, d) {
								if(row && d && row[d.doctype + ":name"]==d.name) {
									for(key in d) {
										row[d.doctype + ":" + key] = d[key];
									}
									r.message.splice(j, 1);
								}
							});
						});
						me.set_data(me.data);
						me.grid.invalidate();
						me.grid.render();
					}
				}
			});			
		});
	},
	
	not_editable: function(e, item) {
		e.stopImmediatePropagation();
		return false;		
	},
	
	setup_check_if_cell_is_editable: function() {
		var me = this;
		this.grid.onBeforeEditCell.subscribe(function(e, args) {
			if(e.target && e.target.tagName == "i") {
				return;
			}

			var item = me.data[args.row];

			var docfield = args.column.docfield;
			if(!docfield) {
				return me.not_editable(e, item, docfield);
			}
					
			if(!wn.perm.has_perm(me.doctype, docfield.permlevel, WRITE)) {
				return me.not_editable(e, item, docfield);
			}
			
			
			if(cint(item[me.doctype + ":docstatus"]) > 0) {
				return me.not_editable(e, item, docfield);
			}
			
			
			if(in_list(['name', 'idx', 'owner', 'creation', 'modified_by', 
				'modified', 'parent', 'parentfield', 'parenttype', 'file_list', 'trash_reason'], 
				docfield.fieldname)) {
				return me.not_editable(e, item, docfield);
			}
						
			if(!in_list(['Data', "Text", 'Small Text', 'Int', 
				'Select', 'Link', 'Currency', 'Float'], docfield.fieldtype)) {
				return me.not_editable(e, item, docfield);
			}
		});
	}
});

wn.ui.ColumnPicker = Class.extend({
	init: function(list) {
		this.list = list;
		this.doctype = list.doctype;
		this.selects = {};
	},
	show: function(columns) {
		wn.require('lib/js/lib/jquery/jquery.ui.interactions.min.js');
		var me = this;
		if(!this.dialog) {
			this.dialog = new wn.ui.Dialog({
				title: wn._("Pick Columns"),
				width: '400'
			});
		}
		$(this.dialog.body).html('<div class="help">'+wn._("Drag to sort columns")+'</div>\
			<div class="column-list"></div>\
			<div><button class="btn btn-small btn-add"><i class="icon-plus"></i>\
				'+wn._("Add Column")+'</button></div>\
			<hr>\
			<div><button class="btn btn-small btn-info">'+wn._("Update")+'</div>');
		
		// show existing
		$.each(columns, function(i, c) {
			me.add_column(c);
		});
		
		$(this.dialog.body).find('.column-list').sortable();
		
		// add column
		$(this.dialog.body).find('.btn-add').click(function() {
			me.add_column(['name']);
		});
		
		// update
		$(this.dialog.body).find('.btn-info').click(function() {
			me.dialog.hide();
			// selected columns as list of [column_name, table_name]
			var columns = [];
			$(me.dialog.body).find('select').each(function() {
				var $selected = $(this).find('option:selected');
				columns.push([$selected.attr('fieldname'), 
					$selected.attr('table')]);
			});
			wn.user.set_default("_list_settings:" + me.doctype, columns);
			me.list.set_columns(columns);
			me.list.run();
		});
		
		this.dialog.show();
	},
	add_column: function(c) {
		var w = $('<div style="padding: 5px; background-color: #eee; \
			width: 90%; margin-bottom: 10px; border-radius: 3px; cursor: move;">\
			<img src="lib/images/ui/drag-handle.png" style="margin-right: 10px;">\
			<a class="close" style="margin-top: 5px;">&times</a>\
			</div>')
			.appendTo($(this.dialog.body).find('.column-list'));
		
		var fieldselect = new wn.ui.FieldSelect(w, this.doctype);
		
		fieldselect.$select
			.css({width: '70%', 'margin-top':'5px'})
			.val((c[1] || this.doctype) + "." + c[0]);
		w.find('.close').click(function() {
			$(this).parent().remove();
		});
	}
});