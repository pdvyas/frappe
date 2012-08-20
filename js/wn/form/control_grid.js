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

wn.ui.GridControl = wn.ui.Control.extend({
	init: function(opts) {
		opts.docfield.vertical = true;
		this.tabletype = opts.docfield.options;
		this._super(opts);
	},
	make_input: function() {
		var me = this;
		wn.lib.import_slickgrid();
		var width = $(this.parent).parent('form:first').width();
		this.$input_wrapper = $('<div style="height: 300px; border: 1px solid grey;"></div>')
			.appendTo(this.$w.find('.controls'))
			.css('width', width);
			
		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			enableRowReordering: true,
			rowHeight: 32,
			editable: false
		};
		
		this.grid = new Slick.Grid(this.$input_wrapper.get(0), [], 
			this.get_columns(), options);
		this.setup_drag_and_drop();
		this.make_add_row_button();
		this.set_edit_on_double_click();
		this.$w.find('.vertical-label').toggle(false);
	},
	set_edit_on_double_click: function() {
		var me = this;
		this.grid.onClick.subscribe(function(e, args) {
			if(me.selected_row == args.row) {
				me.edit_row(me.doc.doclist.get({parentfield:me.docfield.fieldname, 
					idx: args.row + 1})[0]);
			}
			me.selected_row = args.row;
			return false;
		});
	},
	get_columns: function() {
		var columns = $.map(wn.model.get('DocType', this.tabletype).get({doctype:'DocField'}), 
			function(d) {
				if(!d.get('hidden')) {
					return {
						id: d.get('fieldname'),
						field: d.get('fieldname'),
						name: d.get('label'),
						width: cint(d.get('width')) || 100
					}
				} else {
					return null;
				}
			}
		);
		
		function EditButtonFormatter(row, cell, value, columnDef, data) {
			return repl('<button class="btn btn-small grid-edit" \
				data-parentfield="%(parentfield)s" data-name="%(name)s">Edit</button>', data);
	  	}
		
		return [
			{id: "#", name: "", width: 40, behavior: "selectAndMove", selectable: false,
				resizable: false, cssClass: "cell-reorder dnd" },
			//{id:'_edit', field:'_edit', name:'', width: 55, 
			//	formatter:EditButtonFormatter},
			{id:'idx', field:'idx', name:'Sr', width: 40}
		].concat(columns);
	},
	make_add_row_button: function() {
		var me = this;
		this.add_row_button = $('<button class="btn btn-small" style="margin-top: 5px;">\
			<i class="icon-plus"></i>\
			Add Row</button>').click(function() {
				var d = me.doclist.add_child(me.docfield.fieldname);
				me.set();
				// edit
				me.edit_row(d);
				return false;
			}).appendTo(this.$w.find('.controls'));
	},
	toggle_editable: function() {
		// no toggle for this
		this.$w.find('.control-static').toggle(false);
	},
	set_init_value: function() {
		this.set();
	},
	get_data: function() {
		var data = this.doc.doclist.get({parentfield:this.docfield.fieldname});
		
		data = $.map(data, function(d) { return d.fields;  });
		data.sort(function(a, b) { return a.idx > b.idx; });
		return data;
	},
	set: function() {
		// refresh values from doclist
		this.grid.setData(this.get_data());
		this.grid.render();
		this.set_height();
		//this.set_edit_button();
	},
	set_height: function() {
		var height = 32 * (this.doclist.get(
			{parentfield: this.docfield.fieldname}).length + 2);
		this.$w.find('.ui-widget:first').css('height', (height > 300 ? 300 : height) + 'px');
	},
	set_edit_button: function() {
		var me = this;
		this.$input_wrapper.find('.grid-edit').on('click', function() {
			var d = me.doc.doclist.get({
					parentfield:$(this).attr('data-parentfield'),
					name:$(this).attr('data-name'),
				})[0];
			me.edit_row(d);
			return false;
		});
	},
	edit_row: function(d) {
		var form_dialog = new wn.views.RowEditFormDialog({
			title: d.get('doctype') + ' in row #' + d.get('idx'),
			doc: d,
			control_grid: this
		});
		form_dialog.show();		
	},
	setup_drag_and_drop: function() {
		// via http://mleibman.github.com/SlickGrid/examples/example9-row-reordering.html
		var grid = this.grid;
		var me = this;
		grid.setSelectionModel(new Slick.RowSelectionModel());

		var moveRowsPlugin = new Slick.RowMoveManager();

		moveRowsPlugin.onBeforeMoveRows.subscribe(function (e, data) {
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
			});

			grid.resetActiveCell();
			grid.setData(data);
			grid.setSelectedRows(selectedRows);
			grid.render();
		});

	  	grid.registerPlugin(moveRowsPlugin);

		grid.onDragInit.subscribe(function (e, dd) {
			// prevent the grid from cancelling drag'n'drop by default
			e.stopImmediatePropagation();
		});

		grid.onDragStart.subscribe(function (e, dd) {
			var cell = grid.getCellFromEvent(e);
			if (!cell) {
				return;
			}

			dd.row = cell.row;
			if (!data[dd.row]) {
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
});

