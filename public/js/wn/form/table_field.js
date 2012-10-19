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


wn.form.TableField = wn.form.Field.extend({
	make_body: function() {
		this.frm_docname = null;
		this.frm_docstatus = null;
		
		this.$wrapper = $("<div class='field field-grid' \
			style='margin-top: 8px;'>").appendTo(this.parent);
		this.make_toolbar();
			
		this.wrapper = this.$wrapper.get(0);
		this.setup_client_script_helpers();
		
		var me = this;
	},
	
	make_toolbar: function() {
		var me = this;
		this.toolbar = $("<div style='margin-bottom: 4px; height: 26px;'>"+
			'<span style="margin-top: 5px; display: inline-block;">' + this.df.label.bold()
			+"</span></div>").appendTo(this.$wrapper);
			
		btn_group = $('<div class="btn-group" style="float: right;">').appendTo(this.toolbar);
		$('<button class="btn btn-small">\
			<i class="icon-small icon-plus-sign"></i> Insert</button>')
			.appendTo(btn_group)
			.click(function() {
				var active_cell = me.slickgrid.getActiveCell();
								
				if(!active_cell || !me.data[active_cell.row]) {
					var newrow = me.add_row();
				} else {
					var idx = me.data[active_cell.row].idx;
					// push below
					
					for(var i=0; i<me.data.length; i++) {
						if(me.data[i].idx >= idx) me.data[i].idx++;
					}

					var newrow = me.add_row();
					newrow.idx = idx;
				}
				
				me.refresh_data();

				me.slickgrid.setActiveCell(newrow.idx-1, 
					active_cell ? active_cell.cell : 2);
				me.frm.set_unsaved();
			});
		$('<button class="btn btn-small"><i class="icon-small icon-remove"></i> Delete</button>')
			.appendTo(btn_group)
			.click(function() {
				var active_cell = me.slickgrid.getActiveCell();
				
				if(!active_cell) {
					msgprint("Select a row to delete first.");
					return;
				}

				var d = me.data[active_cell.row];
				if(!d) return;

				LocalDB.delete_record(d.doctype, d.name);

				// renum
				me.get_data();
				$.each(me.data, function(i, d) {
					d.idx = i + 1;
				});

				me.refresh_data();				
				me.frm.set_unsaved();
			});
			
		$("<div class='clear'>").appendTo(this.toolbar);
		
	},
	
	make_grid: function() {
		var width = $(this.parent).parent('.form-layout-row:first').width();
		if(this.$input) 
			this.$input.empty();
		else
			this.$input = $('<div style="height: 300px; border: 1px solid grey;"></div>')
				.appendTo(this.wrapper)
				.css('width', width);

		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			enableRowReordering: true,
			enableAddRow: false, //this.disp_status=="Write" ? true : false,
			rowHeight: 32,
			editable: true,
			autoEdit: true
		};

		this.slickgrid = new Slick.Grid(this.$input.get(0), [], 
			this.get_columns(), options);
		
		// edit permission on grid
		this.setup_permissions();
		this.setup_drag_and_drop();
		this.setup_add_row();
		wn.slickgrid_tools.add_property_setter_on_resize(this.slickgrid);

		// description
		if(this.df.description) {
			$('<div class="help small">')
				.appendTo(this.wrapper)
				.html(this.df.description)
		}
	},
	
	setup_permissions: function() {
		var me = this;
		this.slickgrid.onBeforeEditCell.subscribe(function(e, args) {
			var df = args.column.docfield;
			if(me.disp_status=="Write") {
				if(me.frm.perm[me.df.permlevel]
					&& me.frm.perm[me.df.permlevel][WRITE])
					return true;
				else 
					return false;
			} else {
				// allow on submit
				if(me.frm.doc.docstatus==1 
					&& df.allow_on_submit
						&& me.frm.orig_perm[me.df.permlevel]
							&& me.frm.orig_perm[me.df.permlevel][WRITE])
							return true;
				else
					return false;
			}
		})
		
	},
	
	add_row: function() {
		var d = LocalDB.add_child(this.frm.doc, this.df.options, this.df.fieldname);
		this.data.push(d);
		this.set_height(this.data);
		return d;
	},
	
	setup_add_row: function() {
		var me = this;
		if(false) {
			this.slickgrid.setSelectionModel(new Slick.CellSelectionModel());
			
			this.slickgrid.onAddNewRow.subscribe(function (e, args) {
				// reload the data
				me.refresh_data();
				$('.slick-cell.active').click();
			});
			
		}
	},
	
	setup_client_script_helpers: function() {
		var me = this;
		this.field_settings = {};

		this.grid = {
			get_field: function(fieldname) {
				if(!me.field_settings[fieldname])
					me.field_settings[fieldname] = {};
				return me.field_settings[fieldname];
			},
			set_column_disp: function() {
				return me;
			},
			refresh_cell: function(docname, fieldname) {
				$.each(me.data, function(i, d) {
					if(d.name==docname) me.slickgrid.updateRow(i);
				});
			}
		}
		
		$(window).on('resize', function() { 
			$grid = me.$wrapper.find('.ui-widget:first');
			$grid.css('width', $(this.parent).width());
			me.slickgrid.resizeCanvas(); 
		});
		
	},
	
	get_columns: function() {
		var me = this;
		var columns = $.map(wn.meta.docfield_list[this.df.options], 
			function(d) {
				if(!d.hidden && !d.std_field) {
					var column = {
						id: d.fieldname,
						field: d.fieldname,
						name: d.label,
						width: cint(d.width) || 120,
						cssClass: d.reqd ? 'slick-mandatory-column' : null,
						docfield: d,
						frm: me.frm,
						table_field: me,
						editor: (d.fieldtype=="Text" || d.fieldtype=="Small Text" 
							? wn.form.SlickLongTextEditorAdapter 
							: wn.form.SlickEditorAdapter),
						formatter: function(row, cell, value, columnDef, dataContext) {
							var docfield = columnDef.docfield;
							return wn.form.get_formatter(docfield ? docfield.fieldtype : "Data")(value, docfield);
						}
					}
					
					return column;
				} else {
					return null;
				}
			}
		);
		
		this.columns = [];
		if(this.disp_status=="Write") {
			this.columns.push({id: "_select", name: "", width: 40, 
				behavior: "selectAndMove", selectable: false,
				resizable: false, cssClass: "cell-reorder dnd" })
		}
		this.columns.push({id:'idx', field:'idx', name:'Sr', width: 40});			
		this.columns = this.columns.concat(columns);
		return this.columns;
	},

	get_data: function() {
		this.data = $.map(getchildren(this.df.options, this.frm.docname, 
			this.df.fieldname, this.frm.doctype), function(d) {
				d.id = d.name;
				return d;
			});
			
		return this.data;
	},

	refresh: function() {
		var old_status = this.disp_status;
		this.disp_status = this.get_status();
		
		if(this.disp_status=="None") {
			this.$wrapper.toggle(false);
		} else {
			this.$wrapper.toggle(true);
			
			var active_cell = null;
			if(this.slickgrid && this.frm_docname == this.frm.doc.name) {
				var active_cell = this.slickgrid.getActiveCell();
			}
						
			// remake grid if read becomes write or otherwise
			if(this.disp_status!=old_status)
				this.make_grid();

			this.refresh_data();
			
			// show / hide toolbar
			this.toolbar.find('.btn-group')
				.toggle(this.disp_status=="Write" ? true : false);
			
			// set active
			if(active_cell) {
				this.slickgrid.setActiveCell(active_cell.row, active_cell.cell);
			}
			$('.slick-cell.active').click();
			
		}

		this.frm_docname = this.frm.doc.name;
		this.frm_docstatus = this.frm.doc.docstatus;
	},

	refresh_data: function() {
		var data = this.get_data();			
		this.slickgrid.setData(data);
		this.slickgrid.render();
		this.set_height(data);
	},

	set_height: function(data) {
		var height = 32 * (data.length + 3);
		this.$wrapper.find('.ui-widget:first')
			.css('height', (height > 450 ? 450 : height) + 'px')
			.css('background-color', '#f2f2f2');
		this.slickgrid.resizeCanvas();
	},

	setup_drag_and_drop: function() {
		// via http://mleibman.github.com/SlickGrid/examples/example9-row-reordering.html
		var grid = this.slickgrid;
		var me = this;
		grid.setSelectionModel(new Slick.RowSelectionModel());

		var moveRowsPlugin = new Slick.RowMoveManager();

		moveRowsPlugin.onBeforeMoveRows.subscribe(function (e, data) {
			if(me.disp_status=="Read") {
				return false;
			}
			for (var i = 0; i < data.rows.length; i++) {
				// no point in moving before or after itself
				if (data.rows[i] == data.insertBefore || data.rows[i] == data.insertBefore - 1) {
					e.stopPropagation();
					return false;
				}
			}
			return true;
		});

		moveRowsPlugin.onMoveRows.subscribe(function (e, args) {
			var extractedRows = [], left, right;
			var rows = args.rows;
			var insertBefore = args.insertBefore;
			var data = me.get_data();
			
			left = data.slice(0, insertBefore);
			right = data.slice(insertBefore, data.length);

			rows.sort(function(a,b) { return a-b; });

			for (var i = 0; i < rows.length; i++) {
				extractedRows.push(data[rows[i]]);
			}

			rows.reverse();

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				if (row < insertBefore) {
					left.splice(row, 1);
				} else {
					right.splice(row - insertBefore, 1);
				}
			}

			data = left.concat(extractedRows.concat(right));

			var selectedRows = [];
			for (var i = 0; i < rows.length; i++)
			selectedRows.push(left.length + i);

			// reset idx
			$.each(data, function(idx, row) {
				row.idx = idx+1
				//locals[row.doctype][row.name].idx = idx + 1;
			});
			
			grid.resetActiveCell();
			grid.setData(data);
			grid.setSelectedRows(selectedRows);
			grid.render();
			me.frm.set_unsaved();
		});

		grid.registerPlugin(moveRowsPlugin);

		grid.onDragInit.subscribe(function (e, dd) {
			// prevent the grid from cancelling drag'n'drop by default
			e.stopImmediatePropagation();
		});

		grid.onDragStart.subscribe(function (e, dd) {
			var cell = grid.getCellFromEvent(e);
			var data = me.data;
			if (!cell) {
				return;
			}
			
			dd.row = cell.row;
			if (!data || !data[dd.row]) {
				return;
			}

			if (Slick.GlobalEditorLock.isActive()) {
				return;
			}

			e.stopImmediatePropagation();
			dd.mode = "recycle";

			var selectedRows = grid.getSelectedRows();

			if (!selectedRows.length || $.inArray(dd.row, selectedRows) == -1) {
				selectedRows = [dd.row];
				grid.setSelectedRows(selectedRows);
			}

			dd.rows = selectedRows;
			dd.count = selectedRows.length;

			var proxy = $("<span></span>")
			.css({
				position: "absolute",
				display: "inline-block",
				padding: "4px 10px",
				background: "#e0e0e0",
				border: "1px solid gray",
				"z-index": 99999,
				"-moz-border-radius": "8px",
				"-moz-box-shadow": "2px 2px 6px silver"
			})
			.text("Drag to Recycle Bin to delete " + dd.count + " selected row(s)")
			.appendTo("body");

			dd.helper = proxy;

			$(dd.available).css("background", "pink");

		});
	}
	
})