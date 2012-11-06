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

// features
// --------
// toolbar - standard and custom
// label - saved, submitted etc
// save / submit button toggle based on "saved" or not
// highlight and fade name based on refresh

wn.ui.form.FormHeader = Class.extend({
	init: function(parent, frm) {
		this.frm = frm;
		this.appframe = new wn.ui.AppFrame(parent, null, frm.meta.module)
		this.$w = this.appframe.$w;

		if(!frm.meta.issingle) {
			this.appframe.add_tab(wn._(frm.doctype), 0.5, function() {
				wn.set_route("List", frm.doctype);
			});
		}
		
		this.appframe.add_module_tab(frm.meta.module);
	},
	refresh: function() {
		this.appframe.title(this.frm.docname);
		
		this.refresh_timestamps();
		this.refresh_labels();
		this.refresh_toolbar();
	},
	refresh_timestamps: function() {
		this.$w.find(".avatar").remove();
		
		if(this.frm.doc.__islocal || !this.frm.doc.owner || !this.frm.doc.modified_by) 
			return;
		
		$(repl('%(avatar_owner)s %(avatar_mod)s', {
			avatar_owner: wn.avatar(this.frm.doc.owner, null, wn._("Created By")),
			avatar_mod: wn.avatar(this.frm.doc.modified_by, null, wn._("Last Updated By"))
		})).insertAfter(this.$w.find(".appframe-title"));
		
		this.$w.find(".avatar:eq(0)").popover({
			trigger:"hover",
			title: wn._("Created By"),
			content: wn.user_info(this.frm.doc.owner).fullname.bold() 
				+" on "+this.frm.doc.creation
		});

		this.$w.find(".avatar:eq(1)").popover({
			trigger:"hover",
			title: wn._("Modified By"),
			content: wn.user_info(this.frm.doc.modified_by).fullname.bold() 
				+" on "+this.frm.doc.modified
		});
		
		this.$w.find('.avatar img').centerImage();
		
		
		
	},
	refresh_labels: function() {
		this.frm.doc = get_local(this.frm.doc.doctype, this.frm.doc.name);
		var labinfo = {
			0: ['Saved', 'label-success'],
			1: ['Submitted', 'label-info'],
			2: ['Cancelled', 'label-important']
		}[cint(this.frm.doc.docstatus)];
		
		if(labinfo[0]=='Saved' && this.frm.meta.is_submittable) {
			labinfo[0]='Saved, to Submit';
		}
		
		if(this.frm.doc.__unsaved || this.frm.doc.__islocal) {
			labinfo[0] = 'Not Saved';
			labinfo[1] = 'label-warning'
		}

		this.set_label(labinfo);
		
		// show update button if unsaved
		if(this.frm.doc.__unsaved && cint(this.frm.doc.docstatus)==1 
			&& this.appframe.buttons[wn._("Update")]) {
			this.appframe.buttons[wn._("Update")].toggle(true);
		}
		
	},
	set_label: function(labinfo) {
		this.$w.find('.label').remove();
		$(repl('<span class="label %(lab_class)s">\
			%(_lab_status)s</span>', {
				_lab_status: wn._(labinfo[0]),
				lab_class: labinfo[1]
			})).insertBefore(this.$w.find('.appframe-title'))
	},
	refresh_toolbar: function() {
		// clear
		var me = this;
		
		if(this.frm.meta.hide_toolbar) {
			$('.appframe-toolbar').toggle(false);
			return;
		}
		
		this.appframe.clear_buttons();
		var p = this.frm.get_doc_perms();

		// Edit
		if(this.frm.meta.read_only_onload && !this.frm.doc.__islocal) {
			if(!this.frm.editable)
				this.appframe.add_button(wn._("Edit"), function() { 
					me.frm.edit_doc();
				},'icon-pencil');
			else
				this.appframe.add_button(wn._("Print View"), function() { 
					me.frm.is_editable[me.frm.docname] = 0;				
					me.frm.refresh(); }, 'icon-print' );	
		}

		var docstatus = cint(this.frm.doc.docstatus);
		// Save
		if(docstatus==0 && p[WRITE]) {
			this.appframe.add_button(wn._("Save"), function() { 
				me.frm.save(null, me.appframe.buttons[wn._("Save")]); }, '');
			this.appframe.buttons[wn._("Save")].addClass('btn-info').text("Save (Ctrl+S)");			
		}
		// Submit
		if(docstatus==0 && p[SUBMIT] && (!me.frm.doc.__islocal))
			this.appframe.add_button(wn._("Submit"), function() { 
				me.frm.savesubmit(me.appframe.buttons[wn._("Submit")]);}, 'icon-lock');

		// Update after sumit
		if(docstatus==1 && p[SUBMIT]) {
			this.appframe.add_button(wn._("Update"), function() { 
				me.frm.save(me.appframe.buttons[wn._("Update")]);}, '');
			if(!me.frm.doc.__unsaved) 
				this.appframe.buttons[wn._("Update")].toggle(false);
		}

		// Cancel
		if(docstatus==1  && p[CANCEL])
			this.appframe.add_button(wn._("Cancel"), function() { 
				me.frm.savecancel(me.appframe.buttons[wn._("Cancel")]) 
			}, 'icon-remove');

		// Amend
		if(docstatus==2  && p[AMEND])
			this.appframe.add_button(wn._("Amend"), function() { me.frm.amend_doc() }, 
				'icon-pencil');
			
		// Help
		if(me.frm.meta.description) {
			this.appframe.add_help_button(wn.markdown('## ' + me.frm.doctype + '\n\n'
				+ me.frm.meta.description));
		}

	},
	show: function() {
	},
	hide: function() {
		
	},
	hide_close: function() {
		this.$w.find('.close').toggle(false);
	}
})
