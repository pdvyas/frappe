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
		this.bind_action();
	},
	
	bind_action: function() {
		var me = this;
		$(this.parent).on("click", "[data-action]", function() {
			var action = $(this).attr("data-action");
			var next_state = wn.model.get("Workflow Transition", {
				parent: me.frm.doctype,
				action: action
			})[0].next_state;
			
			me.frm.doc.workflow_state = next_state;
			
			var new_docstatus = wn.model.get("Workflow Document State", {
				parent: me.frm.doctype,
				state: next_state
			})[0].doc_status;
			
			if(new_docstatus==1 && me.frm.doc.docstatus==0) {
				me.frm.savesubmit();
			} else if(new_docstatus==0 && me.frm.doc.docstatus==0) {
				me.frm.save();
			} else if(new_docstatus==2 && me.frm.doc.docstatus==1) {
				me.frm.savecancel();
			} else {
				msgprint("Docstatus transition from " + me.frm.doc.docstatus + " to" + 
					new_docstatus + " is not allowed.");
				return;
			}
			
			return false;
		})
	},
	
	refresh: function() {
		// hide if its not yet saved
		if(this.frm.doc.__islocal) {
			this.parent.toggle(false);
			return;
		}
		this.parent.toggle(true);
		
		// state text
		var state = this.get_state();
		
		if(state) {
			// show current state on the button
			this.parent.find(".state-text").text(state);
			
			
			// show actions from that state
			this.show_actions(state);
			
			// disable if not allowed
		} else {
			this.parent.toggle(false);
		}				
	},
	
	show_actions: function(state) {
		var $ul = this.parent.find("ul");
		$ul.empty();
		$.each(wn.model.get("Workflow Transition", {
			parent: this.frm.doctype,
			state: state,
		}), function(i, d) {
			if(in_list(user_roles, d.allowed)) {
				$(repl('<li><a href="#" data-action="%(action)s">%(action)s</a></li>', d)).appendTo($ul);				
			}
		});
		
		// disable the button if user cannot change state
		if(!$ul.find("li").length) {
			this.parent.find('.btn').attr('disabled', true);
		}
	},
	
	get_state: function() {
		if(!this.frm.doc.workflow_state) {
			var me = this;
			var d = wn.model.get("Workflow Document State", {
				parent: me.frm.doctype,
				idx: 1
			});
			
			if(d.length)
				me.frm.set_value_in_locals(me.frm.doctype, me.frm.docname, 'workflow_state', d[0].state);			
		}
		return this.frm.doc.workflow_state;
	}
});