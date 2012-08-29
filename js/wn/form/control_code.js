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

wn.ui.CodeControl = wn.ui.Control.extend({
	init: function(opts) {
		opts.docfield.vertical = true;
		this._super(opts);
	},
	make_input: function() {
		var me = this;
		this.$input_wrap = $('<div style="border: 1px solid #aaa">')
			.appendTo(this.$w.find('.controls'));
			

		this.$pre = $('<pre style="position: relative; height: 400px;\
			padding: 0px; margin: 0px; background-color: #fff; border: 0px;">')
			.appendTo(this.$input_wrap);

		this.myid = wn.dom.set_unique_id(this.$pre.get(0));

		wn.require('js/lib/ace/ace.js');
		this.editor = ace.edit(this.myid);
		this.set_ace_mode();
	},
	set_ace_mode: function() {
		if(this.docfield.options=='Markdown' || this.docfield.options=='HTML') {
			wn.require('js/lib/ace/mode-html.js');	
			var HTMLMode = require("ace/mode/html").Mode;
		    this.editor.getSession().setMode(new HTMLMode());
		}

		else if(this.docfield.options=='Javascript') {
			wn.require('js/lib/ace/mode-javascript.js');	
			var JavascriptMode = require("ace/mode/javascript").Mode;
		    this.editor.getSession().setMode(new JavascriptMode());
		}

		else if(this.docfield.options=='Python') {
			wn.require('js/lib/ace/mode-python.js');	
			var PythonMode = require("ace/mode/python").Mode;
		    this.editor.getSession().setMode(new PythonMode());
		}		
	},
	set_input: function(val) {
		this.setting_value = true;
		this.editor.getSession().setValue(val || '');
		this.set_static(val);
		this.setting_value = false;
	},
	get: function() {
		return this.editor.getSession().getValue();
	},
	set_change_event: function() {
		var me = this;
		this.editor.resize();
		this.editor.getSession().on('change', function() {
			if(me.setting_value) return; // recursive ??
			me.set(me.get());
		})

	},	
	toggle_input: function(show) {
		this.$input_wrap.toggle(show);
	},
	set_disabled: function(disabled) {
		this.toggle_input(!disabled);
		this.toggle_static(disabled)
	}
});
