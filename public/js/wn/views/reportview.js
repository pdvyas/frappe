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
	init: function(doctype, docname) {
		this.doctype = doctype;
		this.docname = docname;
		this.page_name = wn.get_route_str();
		this.make_page();

		var me = this;
		wn.model.with_doctype(doctype, function() {
			me.make_report_view();
			if(docname) {
				wn.model.with_doc('Report', docname, function(r) {
					me.reportview.set_columns_and_filters(JSON.parse(locals['Report'][docname].json));
					me.reportview.run();
				});
			} else {
				me.reportview.run();
			}
		});

	},
	make_page: function() {
		this.page = wn.container.add_page(this.page_name);
		wn.ui.make_app_page({parent:this.page, 
			single_column:true});
		wn.container.change_to(this.page_name);
	},
	make_report_view: function() {
		var module = locals.DocType[this.doctype].module;
		this.page.appframe.set_title(this.doctype);
		this.page.appframe.set_marker(module);
		this.page.appframe.add_module_tab(module);
			
		this.reportview = new wn.views.ReportView({
			doctype: this.doctype, 
			docname: this.docname, 
			page: this.page,
			wrapper: $(this.page).find(".layout-main")
		})
	}
})

wn.views.ReportView = wn.ui.Listing.extend({
	init: function(opts) {
		var me = this;
		$.extend(this, opts);
		this.tab_name = '`tab'+this.doctype+'`';
		this.meta = locals.DocType[this.doctype];
		this.setup();
	},

	set_init_columns: function() {
		// pre-select mandatory columns
		var columns = [['name'],];
		$.each(wn.meta.docfield_list[this.doctype], function(i, df) {
			if(df.in_filter && df.fieldname!='naming_series'
				&& !in_list(no_value_fields, df.fieldname)) {
				columns.push([df.fieldname]);
			}
		});
		this.set_columns(columns);
	},
	
	set_columns: function(columns) {
		this.columns = columns;
	},
	
	setup: function() {
		var me = this;
		$("<div class='report-head'></div><div class='report-grid'></div>")
			.appendTo(this.wrapper)
			
		this.make({
			title: this.no_title ? "" : ('Report: ' + (this.docname ? (this.doctype + ' - ' + this.docname) : this.doctype)),
			appframe: this.page.appframe,
			method: 'webnotes.widgets.doclistview.get',
			get_args: this.get_args,
			parent: $(this.wrapper).find('.report-grid'),
			start: 0,
			page_length: 20,
			show_filters: true,
			new_doctype: this.doctype,
			allow_delete: true
		});
		this.make_column_picker();
		this.make_sorter();
		this.make_export();
		this.set_init_columns();
		this.make_save();
		this.set_tag_filter();
	},
	
	// preset columns and filters from saved info
	set_columns_and_filters: function(opts) {
		var me = this;
		if(opts.columns) this.columns = opts.columns;
		if(opts.filters) $.each(opts.filters, function(i, f) {
			// fieldname, condition, value
			me.filter_list.add_filter(f[0], f[1], f[2], f[3]);
		});
		
		// first sort
		if(opts.sort_by) this.sort_by_select.val(opts.sort_by);
		if(opts.sort_order) this.sort_order_select.val(opts.sort_order);
		
		// second sort
		if(opts.sort_by_next) this.sort_by_next_select.val(opts.sort_by_next);
		if(opts.sort_order_next) this.sort_order_next_select.val(opts.sort_order_next);
	},
	
	// build args for query
	get_args: function() {
		var me = this;
		return {
			doctype: this.doctype,
			fields: $.map(this.columns, function(v) { return me.get_full_column_name(v) }),
			order_by: this.get_order_by(),
			filters: this.filter_list.get_filters(),
			docstatus: this.get_docstatus()
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
			order_by += ', ' + this.get_selected_table_and_column(this.sort_by_next_select) 
				+ ' ' + this.sort_order_next_select.val();
		}
		
		return order_by;
	},
	get_selected_table_and_column: function($select) {
		return this.get_full_column_name([$select.find('option:selected').attr('fieldname'), 
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
			coldef = {
				id: c[0],
				field: c[0],
				docfield: docfield,
				name: (docfield ? docfield.label : toTitle(c[0])),
				width: (docfield ? cint(docfield.width) : 120) || 120,
				formatter: function(row, cell, value, columnDef, dataContext) {
					var docfield = columnDef.docfield;
					return wn.form.get_formatter(docfield ? docfield.fieldtype : "Data")(value, docfield);
				}
			}

			return coldef;
		});
	},
	
	// render data
	render_list: function() {
		var me = this;
		//this.gridid = wn.dom.set_unique_id()
		var columns = [{id:'_idx', field:'_idx', name: 'Sr.', width: 40}].concat(this.build_columns());

		// add sr in data
		$.each(this.data, function(i, v) {
			// add index
			v._idx = i+1;
			v.id = v._idx;
		});

		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false
		};

		this.col_defs = columns;

		this.dataView = new Slick.Data.DataView();
		this.set_data(this.data);
		this.set_row_formatters();		
	
		this.grid = new Slick.Grid(this.$w.find('.result-list')
			.css('border', '1px solid grey')
			.css('height', '500px')
			.get(0), this.dataView, 
			columns, options);

		if(in_list(wn.boot.profile.can_write, this.doctype)) {
			this.grid.setSelectionModel(new Slick.RowSelectionModel());
			this.set_edit();
		}
		wn.slickgrid_tools.add_property_setter_on_resize(this.grid);
		if(this.start!=0) {
			this.grid.scrollRowIntoView(this.data.length-1);
		}
	},
	
	set_data: function() {
		this.dataView.beginUpdate();
		this.dataView.setItems(this.data);
		this.dataView.endUpdate();
	},
	
	set_tag_filter: function() {
		var me = this;
		this.$w.find('.result-list').on("click", ".label-info", function() {
			if($(this).attr("data-label")) {
				me.set_filter("_user_tags", $(this).attr("data-label"));
			}
		});
	},
	
	set_row_formatters: function() {
		var me = this;
		this.dataView.getItemMetadata = function(row) {
			var item = me.data[row];
			var ret = null;
			
			if(item.docstatus==1) {
				ret = { cssClasses: "row-blue" }
			} if(item.docstatus==2) {
				ret = { cssClasses: "row-gray" }			
			}
			
			if(me.meta && me.meta.open_count) {
				var condition = "item." + me.meta.open_count.replace("=", "==");
				if(eval(condition)) {
					ret = { cssClasses: 'row-red' }
				}
			}
			return ret;
		}
	},
	
	set_edit: function() {
		var $head = $(this.wrapper).find(".report-head");
		$("<div class='alert'>This report is editable</div>")
			.appendTo($head.empty());
		
		var me = this;
		this.grid.onClick.subscribe(function(e, args) {
			// need to understand slickgrid event model
			// a bit better. This function also gets called
			// in form (??)
			if(!$(me.wrapper).is(":visible")) return;
			
			// clicked on link
			if(e.target.tagName.toLowerCase()=="a") {
				e.stopImmediatePropagation();
				return false;
			}
			
			if(me.selected_row == args.row) {
				var docfield = me.col_defs[args.cell].docfield;
				var item = me.data[args.row];
				
				if(cint(item.docstatus) > 0) {
					msgprint("Cannot edit Submitted / Cancelled records");
					e.stopImmediatePropagation();
					return false;
				}
				
				if(!docfield || in_list(['name', 'idx', 'owner', 'creation', 'modified_by', 
					'modified', 'parent', 'parentfield', 'parenttype', 'file_list', 'trash_reason'], 
					docfield.fieldname)) {
					msgprint("This field is not editable");
					e.stopImmediatePropagation();
					return false;
				}
				
				if(docfield.permlevel!=0) {
					msgprint("Not permitted to edit the field. (Permlevel is "+docfield.permlevel+")");
					e.stopImmediatePropagation();
					return false;
				}
				
				if(docfield.fieldtype=="Read Only") {
					msgprint("Cannot edit read only field");
					e.stopImmediatePropagation();
					return false;
				}
				
				if(docfield && item.name) {
					var fieldname = docfield.fieldname;
					me.edit_dialog = new wn.ui.Dialog({
						title: item.name,
						width: 700,
						fields: [
							copy_dict(docfield),
								{fieldname:'update', label:'Update', fieldtype:'Button'}
						]
					});
					me.edit_dialog.fields_dict[fieldname].set_value(item[fieldname])
					
					me.edit_dialog.fields_dict.update.$input.click(function() {
						// parent
						var call_args = {
							doctype: me.doctype,
							name: item.name,
							fieldname: fieldname,
							value: me.edit_dialog.fields_dict[fieldname].get_value()
						};
						
						if(docfield.parent && docfield.parent!=me.doctype)
							call_args.parent = docfield.parent;
	
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
											if(row && d && row.name==d.name) {
												$.extend(row, d);
												r.message.splice(j, 1);
											}
										});
									});
									me.edit_dialog.hide();
									me.set_data(me.data);
									me.grid.invalidate();
									me.grid.render();
								}
							},
							btn: this
						})
					});
										
					me.edit_dialog.show();
					
				}
			}
			me.selected_row = args.row;
			return false;
		});
		
	},
	
	// setup column picker
	make_column_picker: function() {
		var me = this;
		this.column_picker = new wn.ui.ColumnPicker(this);
		this.page.appframe.add_button('Pick Columns', function() {
			me.column_picker.show(me.columns);
		}, 'icon-th-list');
	},
	
	// setup sorter
	make_sorter: function() {
		var me = this;
		this.sort_dialog = new wn.ui.Dialog({title:'Sorting Preferences'});
		$(this.sort_dialog.body).html('<p class="help">Sort By</p>\
			<div class="sort-column"></div>\
			<div><select class="sort-order" style="margin-top: 10px; width: 60%;">\
				<option value="asc">Ascending</option>\
				<option value="desc">Descending</option>\
			</select></div>\
			<hr><p class="help">Then By (optional)</p>\
			<div class="sort-column-1"></div>\
			<div><select class="sort-order-1" style="margin-top: 10px; width: 60%;">\
				<option value="asc">Ascending</option>\
				<option value="desc">Descending</option>\
			</select></div><hr>\
			<div><button class="btn btn-small btn-info">Update</div>');
		
		// first
		this.sort_by_select = new wn.ui.FieldSelect($(this.sort_dialog.body).find('.sort-column'), 
			this.doctype).$select;
		this.sort_by_select.css('width', '60%');
		this.sort_order_select = $(this.sort_dialog.body).find('.sort-order');
		
		// second
		this.sort_by_next_select = new wn.ui.FieldSelect($(this.sort_dialog.body).find('.sort-column-1'), 
			this.doctype, null, true).$select;
		this.sort_by_next_select.css('width', '60%');
		this.sort_order_next_select = $(this.sort_dialog.body).find('.sort-order-1');
		
		// initial values
		this.sort_by_select.val(me.doctype + '.modified');
		this.sort_order_select.val('desc');
		
		this.sort_by_next_select.val('');
		this.sort_order_next_select.val('desc');
		
		// button actions
		this.page.appframe.add_button('Sort By', function() {
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
			this.page.appframe.add_button('Export', function() {
				var args = me.get_args();
				args.cmd = 'webnotes.widgets.doclistview.export_query'
				open_url_post(wn.request.url, args);
			}, 'icon-download-alt');
		}
	},
	
	// save
	make_save: function() {
		var me = this;
		if(wn.user.is_report_manager()) {
			this.page.appframe.add_button('Save', function() {
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
					method: 'webnotes.widgets.doclistview.save_report',
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
				title: 'Pick Columns',
				width: '400'
			});
		}
		$(this.dialog.body).html('<div class="help">Drag to sort columns</div>\
			<div class="column-list"></div>\
			<div><button class="btn btn-small btn-add"><i class="icon-plus"></i>\
				Add Column</button></div>\
			<hr>\
			<div><button class="btn btn-small btn-info">Update</div>');
		
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
			me.list.set_columns(columns);
			me.list.run();
		});
		
		this.dialog.show();
	},
	add_column: function(c) {
		var w = $('<div style="padding: 5px 5px 5px 35px; background-color: #eee; width: 70%; \
			margin-bottom: 10px; border-radius: 3px; cursor: move;">\
			<a class="close" style="margin-top: 5px;">&times</a>\
			</div>')
			.appendTo($(this.dialog.body).find('.column-list'));
		var fieldselect = new wn.ui.FieldSelect(w, this.doctype);
		fieldselect.$select.css('width', '90%').val((c[1] || this.doctype) + "." + c[0]);
		w.find('.close').click(function() {
			$(this).parent().remove();
		});
	}
});