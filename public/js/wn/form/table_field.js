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
		this.$wrapper = $("<div class='field field-grid' \
			style='margin-top: 8px;'>").appendTo(this.parent);
		this.wrapper = this.$wrapper.get(0);
		this.setup_client_script_helpers();
	},
	
	make_grid: function() {
		var me = this;
		wn.require_lib("slickgrid");

		this.$wrapper.empty();

		var width = $(this.parent).parent('.form-layout-row:first').width();
		this.$input = $('<div style="height: 300px; border: 1px solid grey;"></div>')
			.appendTo(this.wrapper)
			.css('width', width);

		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			enableRowReordering: true,
			enableAddRow: true,
			rowHeight: 32,
			editable: true
		};

		var columns = this.get_columns();
		this.slickgrid = new Slick.Grid(this.$input.get(0), [], 
			columns, options);
		
		// edit permission on grid
		this.slickgrid.onBeforeEditCell.subscribe(function(e, args) {
			if(me.disp_status=="Write") return true;
			else return false;
		})
		
		this.setup_drag_and_drop();
		this.setup_add_row();

		// description
		if(this.df.description) {
			$('<div class="help small">')
				.appendTo(this.wrapper)
				.html(this.df.description)
		}
	},
	
	add_row: function() {
		var d = LocalDB.add_child(this.frm.doc, this.df.options, this.df.fieldname);
		d.idx = this.data.length+1;

		this.slickgrid.invalidateRow(this.data.length);
		this.slickgrid.updateRowCount();
		this.refresh_data();
		
		return d;
	},
	
	setup_add_row: function() {
		var me = this;
		if(this.disp_status=="Write") {
			this.slickgrid.setSelectionModel(new Slick.CellSelectionModel());
		}
	},
	
	setup_client_script_helpers: function() {
		var me = this;

		this.grid = {
			get_field: function() {
				return me;
			},
			set_column_disp: function() {
				return me;
			},
			refresh_cell: function() {
				me.refresh_data();
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
				if(!d.hidden) {
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
							: wn.form.SlickEditorAdapter)
					}
										
					return column;
				} else {
					return null;
				}
			}
		);
				
		return [
			{id: "_select", name: "", width: 40, behavior: "selectAndMove", selectable: false,
				resizable: false, cssClass: "cell-reorder dnd" },
			{id:'idx', field:'idx', name:'Sr', width: 40}
		].concat(columns);
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
		this.disp_status = this.get_status();
		
		if(this.disp_status=="None") {
			this.$wrapper.toggle(false);
		} else {
			this.$wrapper.toggle(true);
			this.make_grid();
			this.refresh_data();
		}
		
	},

	refresh_data: function() {
		var data = this.get_data();			
		this.slickgrid.setData(data);
		this.slickgrid.render();
		this.set_height(data);		
	},

	set_height: function(data) {
		var height = 32 * (data.length + 2);
		this.$wrapper.find('.ui-widget:first')
			.css('height', (height > 300 ? 300 : height) + 'px')
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
				//row.idx = idx+1
				locals[row.doctype][row.name].idx = idx + 1;
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

wn.form.SlickEditorAdapter = function(args) {
	var df = args.column.docfield;
	var me = this;
	this.init = function() {
		if(!args.item.name) {
			args.item.name = args.column.table_field.add_row().name;
			return;
		}

		me.field = make_field(df, df.parent, args.container, args.column.frm, true);
		me.field.docname = args.item.name;
		me.field.make_inline();
		me.field.refresh();
		me.field.$wrapper.find(":input").bind("keydown", function(e) {
			if (e.keyCode == $.ui.keyCode.LEFT || e.keyCode == $.ui.keyCode.RIGHT) {
				e.stopImmediatePropagation();
			}
			if(df.fieldtype=="Link" || df.fieldtype=="Select") {
				if (e.keyCode == $.ui.keyCode.UP || e.keyCode == $.ui.keyCode.DOWN || e.keyCode == $.ui.keyCode.ENTER) {
					e.stopImmediatePropagation();
				}				
			}
		});
		me.field.set_focus();
	}

	this.destroy = function () {
		$(args.container).empty();
	};

	this.focus = function () {
		me.field.set_focus();
    };

	this.serializeValue = function () {
		return me.field.get_value();
	};

	this.applyValue = function (item, state) {
		console.log(state)
		item[df.fieldname] = state;
		// already happens on change?
		//me.field.set_model(me.field.validate(state));
	};

	this.loadValue = function (item) {
		me.field.set_value(item[df.fieldname]);
	};

    this.isValueChanged = function () {
		if(!args.item.name) 
			return true;
		return me.field.get_value() != locals[df.parent][args.item.name][df.fieldname];
	};

	this.validate = function () {
		return {valid: true, msg: null};
	};
	
	this.init();
}

/*
 * An example of a "detached" editor.
 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */

wn.form.SlickLongTextEditorAdapter = function (args) {
  var $input, $wrapper;
  var defaultValue;
  var scope = this;

  this.init = function () {
    var $container = $("body");

    $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
        .appendTo($container);

    $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0'>")
        .appendTo($wrapper);

    $("<DIV style='text-align:right'><BUTTON class='btn btn-small' style='margin-right:3px;'>Save (ctrl+enter)</BUTTON> <BUTTON class='btn btn-small'>Cancel</BUTTON></DIV>")
        .appendTo($wrapper);

    $wrapper.find("button:first").bind("click", this.save);
    $wrapper.find("button:last").bind("click", this.cancel);
    $input.bind("keydown", this.handleKeyDown);

    scope.position(args.position);
    $input.focus().select();
  };

  this.handleKeyDown = function (e) {
    if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
      scope.save();
    } else if (e.which == $.ui.keyCode.ESCAPE) {
      e.preventDefault();
      scope.cancel();
    } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
      e.preventDefault();
      args.grid.navigatePrev();
    } else if (e.which == $.ui.keyCode.TAB) {
      e.preventDefault();
      args.grid.navigateNext();
    }
  };

  this.save = function () {
    args.commitChanges();
  };

  this.cancel = function () {
    $input.val(defaultValue);
    args.cancelChanges();
  };

  this.hide = function () {
    $wrapper.hide();
  };

  this.show = function () {
    $wrapper.show();
  };

  this.position = function (position) {
    $wrapper
        .css("top", position.top - 5)
        .css("left", position.left - 5)
  };

  this.destroy = function () {
    $wrapper.remove();
  };

  this.focus = function () {
    $input.focus();
  };

  this.loadValue = function (item) {
    $input.val(defaultValue = item[args.column.field]);
    $input.select();
  };

  this.serializeValue = function () {
    return $input.val();
  };

  this.applyValue = function (item, state) {
	item[args.column.field] = state;
	locals[args.item.doctype][args.item.name][args.column.field] = state;
  };

  this.isValueChanged = function () {
    return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
  };

  this.validate = function () {
    return {
      valid: true,
      msg: null
    };
  };

  this.init();
}

