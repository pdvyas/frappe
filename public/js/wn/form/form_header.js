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
			this.appframe.add_tab(frm.doctype, 0.5, function() {
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
			avatar_owner: wn.avatar(this.frm.doc.owner, null, "Created By"),
			avatar_mod: wn.avatar(this.frm.doc.modified_by, null, "Last Updated By")
		})).insertAfter(this.$w.find(".appframe-title"));
		
		this.$w.find(".avatar:eq(0)").popover({
			trigger:"hover",
			title: "Created By",
			content: wn.user_info(this.frm.doc.owner).fullname.bold() 
				+" on "+this.frm.doc.creation
		});

		this.$w.find(".avatar:eq(1)").popover({
			trigger:"hover",
			title: "Modified By",
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
		if(this.frm.doc.__unsaved && cint(this.frm.doc.docstatus)==1 && this.appframe.buttons['Update']) {
			this.appframe.buttons['Update'].toggle(true);
		}
		
	},
	set_label: function(labinfo) {
		this.$w.find('.label').remove();
		$(repl('<span class="label %(lab_class)s">\
			%(lab_status)s</span>', {
				lab_status: labinfo[0],
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
				this.appframe.add_button('Edit', function() { 
					me.frm.edit_doc();
				},'icon-pencil');
			else
				this.appframe.add_button('Print View', function() { 
					me.frm.is_editable[me.frm.docname] = 0;				
					me.frm.refresh(); }, 'icon-print' );	
		}

		var docstatus = cint(this.frm.doc.docstatus);
		// Save
		if(docstatus==0 && p[WRITE]) {
			this.appframe.add_button('Save', function() { 
				me.frm.save(null, me.appframe.buttons['Save']); }, '');
			this.appframe.buttons['Save'].addClass('btn-info').text("Save (Ctrl+S)");			
		}
		// Submit
		if(docstatus==0 && p[SUBMIT] && (!me.frm.doc.__islocal))
			this.appframe.add_button('Submit', function() { 
				me.frm.savesubmit(null, me.appframe.buttons['Submit']);}, 'icon-lock');

		// Update after sumit
		if(docstatus==1 && p[SUBMIT]) {
			this.appframe.add_button('Update', function() { 
				me.frm.saveupdate(null, me.appframe.buttons['Update']);}, '');
			if(!me.frm.doc.__unsaved) 
				this.appframe.buttons['Update'].toggle(false);
		}

		// Cancel
		if(docstatus==1  && p[CANCEL])
			this.appframe.add_button('Cancel', function() { 
				me.frm.savecancel(null, me.appframe.buttons['Cancel']) 
			}, 'icon-remove');

		// Amend
		if(docstatus==2  && p[AMEND])
			this.appframe.add_button('Amend', function() { me.frm.amend_doc() }, 'icon-pencil');
			
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
