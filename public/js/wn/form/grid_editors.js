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

wn.form.SlickEditorAdapter = function(args) {
	var df = args.column.docfield;
	var me = this;
	this.init = function() {
		if(!args.item.name) {
			args.item.name = args.column.table_field.add_row().name;
		}

		me.field = make_field(df, df.parent, args.container, args.column.frm, true);
		me.field.docname = args.item.name;
		me.field.grid = args.column.table_field.grid; // helpers
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
		return me.field ? me.field.get_value() : null;
	};

	this.applyValue = function (item, state) {
		item[df.fieldname] = state;
	};

	this.loadValue = function (item) {
		me.field.set_value(item[df.fieldname]);
	};

	this.isValueChanged = function () {
		if(!args.item.name) 
			return true;
		if(!me.field) 
			return false;
		if(me.field.disp_status!="Write")
			return false;
		changed = (me.field.get_value() != locals[df.parent][args.item.name][df.fieldname]);
		// this is not called later
		if(changed) 
			me.field.set_model(me.field.get_value())
		return changed;
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
		if(!args.item.name) {
			args.item.name = args.column.table_field.add_row().name;
		}

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
			scope.hide();
			e.preventDefault();
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