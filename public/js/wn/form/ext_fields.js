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

// Column Break Field
// -------------------

wn.form.ColumnBreakField = wn.form.Field.extend({
	make_body: function() {
		this.cell = this.frm.layout.addcell(this.df.width);
		$(this.cell.wrapper).css({
			padding: "8px"
		});
		
		if(this.df.label) {
			$("<h4>").text(this.df.label).appendTo(this.cell.wrapper);
		}
	},
	refresh: function() {
		var hidden = 0;
		
		// we generate column breaks, but hide it based on perms/hidden value
		if((!this.perm[this.df.permlevel]) || (!this.perm[this.df.permlevel][READ]) || 
			this.df.hidden) {
			// do not display, as no permission
			hidden = 1;
		}

		// hidden
		if(this.set_hidden!=hidden) {
			if(hidden)
				this.cell.hide();
			else
				this.cell.show();
			this.set_hidden = hidden;
		}		
	},
	
	
})

// Section Break Field
// -------------------
wn.form.SectionBreakField = wn.form.Field.extend({
	make_row: function() {
		this.row = this.df.label ? this.frm.layout.addrow() : this.frm.layout.addsubrow();		
	},	
	make_body: function() {
		this.fields = [];
		var me = this;
		this.make_row();

		if(this.df.label) {
			if(!this.df.description) 
				this.df.description = '';
			$(this.row.main_head).html(repl('<div class="form-section-head">\
					<h3 class="head">%(label)s</h3>\
					<div class="help small" \
						style="margin-top: 4px; margin-bottom: 8px;">\
						%(description)s</div>\
				</div>', this.df));
		} else {
			// simple
			$(this.row.main_head).html('<div class="form-section-head"></div>');
		}
		
	},
	refresh: function() {
		var hidden = 0;
		// we generate section breaks, but hide it based on perms/hidden value
		if((!this.perm[this.df.permlevel]) || (!this.perm[this.df.permlevel][READ]) || this.df.hidden) {
			// no display
			hidden = 1;
		}
		
		if(hidden) {
			if(this.row)this.row.hide();
		} else {
			if(this.row)this.row.show();
		}
	}
});

// Code Field
// -------------------

wn.form.CodeField = wn.form.Field.extend({
	make_input: function() {
		wn.require('lib/js/lib/ace/ace.js');
		var input_area = this.$wrapper.find(".input_area");
		
		input_area.css('border','1px solid #aaa');
		this.pre = $("<pre style='position: relative; height: 400px; \
			width: 100%; padding: 0px; border-radius: 0px;\
			margin: 0px; background-color: #fff;'>").appendTo(input_area).get(0);

		this.$input = {};
		this.myid = wn.dom.set_unique_id(this.pre);
		this.editor = ace.edit(this.myid);

		if(this.df.options=='Markdown' || this.df.options=='HTML') {
			wn.require('lib/js/lib/ace/mode-html.js');	
			var HTMLMode = require("ace/mode/html").Mode;
		    this.editor.getSession().setMode(new HTMLMode());
		}

		else if(this.df.options=='Javascript') {
			wn.require('lib/js/lib/ace/mode-javascript.js');	
			var JavascriptMode = require("ace/mode/javascript").Mode;
		    this.editor.getSession().setMode(new JavascriptMode());
		}

		else if(this.df.options=='Python') {
			wn.require('lib/js/lib/ace/mode-python.js');	
			var PythonMode = require("ace/mode/python").Mode;
		    this.editor.getSession().setMode(new PythonMode());
		}
		
		this.refresh_on_render();
	},
	refresh_on_render: function() {
		var me = this;
		$(this.frm.wrapper).bind('render_complete', function() {
			me.editor.resize();
			me.editor.getSession().on('change', function() {
				if(me.setting_value) return;
				var val = me.get_value();
				if(locals[me.frm.doctype][me.frm.docname][me.df.fieldname] != val) {
					me.set_model(me.get_value());
				}
			})
		});
	},
	set_value: function(v) {
		this._super(v==null ? "" : v);
	},
	get_formatted_value: function(v) {
		return "<pre>"+ v.replace(/</g, "&lt;").replace(/>/g, "&gt;") +"</pre>";
	},
	set_input: function(v) {
		if(!this.editor) return;
		this.setting_value = true;
		this.editor.getSession().setValue(v);
		this.editor.resize();
		this.setting_value = false;
	},
	get_value: function() {
		return this.editor.getSession().getValue();
	}
});

// Text Editor Field
// -------------------

wn.form.TextEditorField = wn.form.Field.extend({
	make_input: function() {
		var me = this;
		this.$input = $('<textarea class="span8">').css('font-size','12px').css('height', '300px')
			.appendTo(this.$wrapper.find(".input_area"));
		
		this.myid = wn.dom.set_unique_id(this.$input.get(0));

		wn.require('lib/js/lib/wysihtml5/bootstrap-wysihtml5.css');
		wn.require('lib/js/lib/wysihtml5/wysihtml5.min.js');
		wn.require('lib/js/lib/wysihtml5/bootstrap-wysihtml5.min.js');

		this.editor = this.$input.wysihtml5({
			"html": true,
			"color": true,
			"events": {
				change: function() {
					me.set_model(me.get_value());
				}
			}
		});
		
	},
	set_input: function(val) {
		if(this.editor) this.editor.data("wysihtml5").editor.setValue(val);
	},
	get_value: function() {
		return this.validate($('#' + this.myid).val().replace(/&nbsp;/g, ' '));
	}
	
});