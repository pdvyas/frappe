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

wn.ui.form.States = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
	},
	refresh: function() {
		if(this.frm.doc.__islocal) {
			this.parent.toggle(false);
			return;
		}
		this.parent.toggle(true);
		
		// state text
		var state_text = this.get_state();
		
		if(state_text) {
			// show current state on the button
			this.parent.find(".state-text").text()
			
			// show actions from that state
		} else {
			this.parent.toggle(false);
		}				
	},
	get_state: function() {
		if(!this.frm.doc.workflow_state) {
			var me = this;
			if(locals["Workflow Document State"]) {
				$.each(locals["Workflow Document State"], function(i, d) {
					if(d.parent==me.frm.doctype && d.idx==1)
						me.frm.set_value_in_locals(me.frm.doctype, me.frm.docname, 'workflow_state', d.state);
				});				
			}
		}
		return this.frm.doc.workflow_state;
	}
});