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

wn.ui.RichTextControl = wn.ui.Control.extend({
	init: function(opts) {
		opts.docfield.vertical = true;
		this._super(opts);
	},
	make_input: function() {
		var me = this;
		this.$input_wrap = $('<div>').appendTo(this.$w.find('.controls'));
		this.$input = $('<textarea type="text">').css('font-size','12px')
			.appendTo(this.$input_wrap);

		this.myid = wn.dom.set_unique_id(this.$input.get(0));

		// setup tiny mce
		this.$input.tinymce({
			// Location of TinyMCE script
			script_url : 'js/lib/tiny_mce_33/tiny_mce.js',

			// General options
			theme : "advanced",
			plugins : "style,inlinepopups,table,advimage",
			extended_valid_elements: "div[id|dir|class|align|style]",

			// w/h
			width: '100%',
			height: '360px',

			// buttons
			theme_advanced_buttons1 : "bold,italic,underline,strikethrough,hr,|,justifyleft,justifycenter,justifyright,|,formatselect,fontselect,fontsizeselect,|,image",
			theme_advanced_buttons2 : "bullist,numlist,|,outdent,indent,|,undo,redo,|,link,unlink,code,|,forecolor,backcolor,|,tablecontrols",
			theme_advanced_buttons3 : "",

			theme_advanced_toolbar_location : "top",
			theme_advanced_toolbar_align : "left",

			content_css: "js/lib/tiny_mce_33/custom_content.css",

			oninit: function() { me.init_editor(); }
		});		
	},
	get: function() {
		if(this.editor) return this.editor.getContent();
		else return this.$input.val();
	},
	set_input: function(v) {
		if(this.editor)this.editor.setContent(v);
		else this.$input.val(v);
	
	},
 	init_editor: function() {
		// attach onchange methods
		var me = this;
		this.editor = tinymce.get(this.myid);
		this.editor.onKeyUp.add(function(ed, e) { 
			me.set(ed.getContent()); 
		});
		this.editor.onPaste.add(function(ed, e) { 
			me.set(ed.getContent());
		});
		this.editor.onSetContent.add(function(ed, e) { 
			me.set(ed.getContent()); 
		});

		// reset content
		if(this.doc) {
			this.editor.setContent(this.doc.get(this.docfield.fieldname));
		}	
	},
	toggle_input: function(show) {
		this.$input_wrap.toggle(show);
	}
});
