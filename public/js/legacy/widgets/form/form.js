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

/* Form page structure

	+ this.parent (either FormContainer or Dialog)
 		+ this.wrapper
 			+ this.content
				+ wn.PageLayout	(this.page_layout)
				+ this.wrapper
					+ this.wtab (table)
						+ this.main
							+ this.head
							+ this.body
								+ this.layout
								+ this.footer
						+ this.sidebar
*/

wn.provide('_f');
wn.ui.form.Controller = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
	}
});


_f.frms = {};

_f.Frm = function(doctype, parent, in_form) {
	this.docname = '';
	this.doctype = doctype;
	this.display = 0;
		
	var me = this;
	this.is_editable = {};
	this.opendocs = {};
	this.sections = [];
	this.grids = [];
	
	this.cscript = new wn.ui.form.Controller({frm:this});
		
	this.pformat = {};
	this.fetch_dict = {};
	this.parent = parent;
	this.tinymce_id_list = [];
	
	this.setup_meta(doctype);
	
	// show in form instead of in dialog, when called using url (router.js)
	this.in_form = in_form ? true : false;
	
	// notify on rename
	var me = this;
	$(document).bind('rename', function(event, dt, old_name, new_name) {
		if(dt==me.doctype)
			me.rename_notify(dt, old_name, new_name)
	});
}

_f.Frm.prototype.check_doctype_conflict = function(docname) {
	var me = this;
	if(this.doctype=='DocType' && docname=='DocType') {
		msgprint('Allowing DocType, DocType. Be careful!')
	} else if(this.doctype=='DocType') {
		if (wn.views.formview[docname] || wn.pages['List/'+docname]) {
			msgprint("Cannot open DocType when its instance is open")
			throw 'doctype open conflict'
		}
	} else {
		if (wn.views.formview.DocType && wn.views.formview.DocType.frm.opendocs[this.doctype]) {
			msgprint("Cannot open instance when its DocType is open")
			throw 'doctype open conflict'
		}		
	}
}

_f.Frm.prototype.setup = function() {

	var me = this;
	this.fields = [];
	this.fields_dict = {};

	// wrapper
	this.wrapper = this.parent;
	
	// create area for print fomrat
	this.print_view = new wn.ui.form.PrintView({
		frm: this,
		parent: this.wrapper
	})
	
	// 2 column layout
	this.setup_std_layout();

	// client script must be called after "setup" - there are no fields_dict attached to the frm otherwise
	this.setup_client_script();
	
	this.setup_done = true;
}


_f.Frm.prototype.setup_std_layout = function() {
	this.page_layout = $a(this.wrapper, 'div', 
		'layout-wrapper layout-wrapper-background', {
		display: "none"
	});
	this.page_layout.head = $a(this.page_layout, 'div');	
	this.page_layout.main = $a(this.page_layout, 'div', 'layout-main-section');
	this.page_layout.sidebar_area = $a(this.page_layout, 'div', 'layout-side-section');
	$a(this.page_layout, 'div', '', {clear:'both'});
	this.page_layout.body_header 	= $a(this.page_layout.main, 'div');
	this.page_layout.body 			= $a(this.page_layout.main, 'div');
	this.page_layout.footer 		= $a(this.page_layout.main, 'div');

	// only tray
	this.meta.section_style='Simple'; // always simple!
	
	// layout
	this.layout = new Layout(this.page_layout.body, '100%');
	
	// sidebar
	if(this.meta.in_dialog && !this.in_form) {
		// hide sidebar
		$(this.page_layout).removeClass('layout-wrapper-background').css("box-shadow", "none");
		$(this.page_layout.main).removeClass('layout-main-section');
		$(this.page_layout.sidebar_area).toggle(false);
	} else {
		// module link
		this.setup_sidebar();
	}
		
	// footer
	this.setup_footer();
		
	// header - no headers for tables and guests
	if(!(this.meta.istable || (this.meta.in_dialog && !this.in_form))) 
		this.frm_head = new wn.ui.form.FormHeader(this.page_layout.head, this);
			
	// create fields
	this.setup_fields_std();
}

_f.Frm.prototype.setup_print = function() { 
	this.default_format = 'Standard';
	var l = $.map(wn.meta.get("Print Format", {doc_type:this.meta.name}), 
		function(d) { return d.name });

	// if default print format is given, use it
	if(this.meta.default_print_format)
		this.default_format = this.meta.default_print_format;

	l.push('Standard');
	this.print_sel = $a(null, 'select', '', {width:'160px'});
	add_sel_options(this.print_sel, l);
	this.print_sel.value = this.default_format;
}

_f.Frm.prototype.print_doc = function() {
	if(this.doc.docstatus==2)  {
		msgprint(wn._("Cannot Print Cancelled Documents."));
		return;
	}

	_p.show_dialog(); // multiple options
}

// email the form
_f.Frm.prototype.email_doc = function() {
	// make selector
	if(!_e.dialog) _e.make();
	
	_e.dialog.widgets['To'].value = '';
	
	if (cur_frm.doc && cur_frm.doc.contact_email) {
		_e.dialog.widgets['To'].value = cur_frm.doc.contact_email;
	}
	
	// set print selector
	sel = this.print_sel;
	var c = $td(_e.dialog.rows['Format'].tab,0,1);
	
	if(c.cur_sel) {
		c.removeChild(c.cur_sel);
		c.cur_sel = null;
	}
	c.appendChild(this.print_sel);
	c.cur_sel = this.print_sel;

	// hide / show attachments
	_e.dialog.widgets['Send With Attachments'].checked = 0;
	if(cur_frm.doc.file_list) {
		$ds(_e.dialog.rows['Send With Attachments']);
	} else {
		$dh(_e.dialog.rows['Send With Attachments']);
	}

	_e.dialog.widgets['Subject'].value = get_doctype_label(this.meta.name) + ': ' + this.docname;
	_e.dialog.show();
}

// notify this form of renamed records
_f.Frm.prototype.rename_notify = function(dt, old, name) {	
	// from form
	if(this.meta.in_dialog && !this.in_form) 
		return;
	
	if(this.docname == old)
		this.docname = name;
	else
		return; // thats it, not for children!

	// editable
	this.is_editable[name] = this.is_editable[old];
	delete this.is_editable[old];

	// cleanup
	if(this && this.opendocs[old]) {
		wn.meta.rename_field_copy(this.doctype, old, name)
	}

	delete this.opendocs[old];
	this.opendocs[name] = true;
	
	wn.re_route[window.location.hash] = '#Form/' + encodeURIComponent(this.doctype) + '/' + encodeURIComponent(name);
	wn.set_route('Form', this.doctype, name);
}

// SETUP

_f.Frm.prototype.setup_meta = function(doctype) {
	this.meta = wn.meta.get('DocType', this.doctype)[0];
	this.perm = wn.perm.get_perm(this.doctype); // for create
	if(this.meta.istable) { this.meta.in_dialog = 1 }
	this.setup_print();
}



_f.Frm.prototype.setup_sidebar = function() {
	this.sidebar = new wn.ui.FormSidebar({
		parent: this.page_layout.sidebar_area,
		frm: this
	});
}


_f.Frm.prototype.setup_footer = function() {
	var me = this;
	
	// footer toolbar
	var f = this.page_layout.footer;

	// save buttom
	f.save_area = $a(this.page_layout.footer,'div','',{display:'none', marginTop:'11px'});
	f.help_area = $a(this.page_layout.footer,'div');

	var b = $btn(f.save_area, 'Save',
		function() { cur_frm.save('Save'); },{marginLeft:'0px'},'green');
	
	// show / hide save
	f.show_save = function() {
		$ds(me.page_layout.footer.save_area);
	}

	f.hide_save = function() {
		$dh(me.page_layout.footer.save_area);
	}
}

_f.Frm.prototype.set_intro = function(txt) {
	if(!this.intro_area) {
		this.intro_area = $('<div class="alert form-intro-area">')
			.insertBefore(this.page_layout.body.firstChild);
	}
	if(txt) {
		if(txt.search(/<p>/)==-1) txt = '<p>' + txt + '</p>';
		this.intro_area.html(txt);
	} else {
		this.intro_area.remove();
		this.intro_area = null;
	}
}

_f.Frm.prototype.set_footnote = function(txt) {
	if(!this.footnote_area) {
		this.footnote_area = $('<div class="alert form-intro-area">')
			.insertAfter(this.page_layout.body.lastChild);
	}
	if(txt) {
		if(txt.search(/<p>/)==-1) txt = '<p>' + txt + '</p>';
		this.footnote_area.html(txt);
	} else {
		this.footnote_area.remove();
		this.footnote_area = null;
	}
}


_f.Frm.prototype.setup_fields_std = function() {
	var fl = wn.meta.docfield_list[this.doctype]; 
	
	fl.sort(function(a,b) { return a.idx - b.idx});

	if(fl[0]&&fl[0].fieldtype!="Section Break" || get_url_arg('embed')) {
		this.layout.addrow(); // default section break
		if(fl[0].fieldtype!="Column Break") {// without column too
			var c = this.layout.addcell();
			$y(c.wrapper, {padding: '8px'});			
		}
	}

	var sec;
	for(var i=0;i<fl.length;i++) {
		var f=fl[i];
				
		// if section break and next item 
		// is a section break then ignore
		if(f.fieldtype=='Section Break' && fl[i+1] && fl[i+1].fieldtype=='Section Break') 
			continue;
		
		// no std fields for display
		if(f.std_field) 
			continue;
		
		var fn = f.fieldname?f.fieldname:f.label;
				
		var fld = make_field(f, this.doctype, this.layout.cur_cell, this);

		this.fields[this.fields.length] = fld;
		this.fields_dict[fn] = fld;

		if(sec && ['Section Break', 'Column Break'].indexOf(f.fieldtype)==-1) {
			fld.parent_section = sec;
			sec.fields.push(fld);			
		}
		
		if(f.fieldtype=='Section Break') {
			sec = fld;
			this.sections.push(fld);
		}
		
		// default col-break after sec-break
		if((f.fieldtype=='Section Break')&&(fl[i+1])&&(fl[i+1].fieldtype!='Column Break')) {
			var c = this.layout.addcell();
			$y(c.wrapper, {padding: '8px'});			
		}
	}
}

// --------------------------------------------------------------------------------------
_f.Frm.prototype.add_custom_button = function(label, fn, icon) {
	this.frm_head.appframe.add_button(label, fn, icon);
}
_f.Frm.prototype.clear_custom_buttons = function() {
	this.frm_head.refresh_toolbar()
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.add_fetch = function(link_field, src_field, tar_field) {
	if(!this.fetch_dict[link_field]) {
		this.fetch_dict[link_field] = {'columns':[], 'fields':[]}
	}
	this.fetch_dict[link_field].columns.push(src_field);
	this.fetch_dict[link_field].fields.push(tar_field);
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.setup_client_script = function() {
	// setup client obj

	if(this.meta.client_script_core || this.meta.client_script || this.meta.__js) {
		this.runclientscript('setup', this.doctype, this.docname);
	}
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.show_the_frm = function() {
	// show the dialog
	if(this.meta.in_dialog && !this.parent.dialog.display) {
		if(!this.meta.istable)
			this.parent.table_form = false;
		this.parent.dialog.show();
	}	
}

// --------------------------------------------------------------------------------------
_f.Frm.prototype.set_print_heading = function(txt) {
	this.pformat[cur_frm.docname] = txt;
}


_f.Frm.prototype.get_doc_perms = function() {
	var p = [0,0,0,0,0,0];
	for(var i=0; i<this.perm.length; i++) {
		if(this.perm[i]) {
			if(this.perm[i][READ]) p[READ] = 1;
			if(this.perm[i][WRITE]) p[WRITE] = 1;
			if(this.perm[i][SUBMIT]) p[SUBMIT] = 1;
			if(this.perm[i][CANCEL]) p[CANCEL] = 1;
			if(this.perm[i][AMEND]) p[AMEND] = 1;
		}
	}
	return p;
}

_f.Frm.prototype.refresh_header = function() {
	// set title
	// main title
	if(!this.meta.in_dialog || this.in_form) {
		set_title(this.meta.issingle ? this.doctype : this.docname);
	}	
	
	// form title
	//this.page_layout.main_head.innerHTML = '<h2>'+this.docname+'</h2>';

	// show / hide buttons
	if(this.frm_head)this.frm_head.refresh();
	
	// add to recent
	if(wn.ui.toolbar.recent) 
		wn.ui.toolbar.recent.add(this.doctype, this.docname, 1);	
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.check_doc_perm = function() {
	// get perm
	var dt = this.parent_doctype?this.parent_doctype : this.doctype;
	var dn = this.parent_docname?this.parent_docname : this.docname;

	this.orig_perm = this.perm = wn.perm.get_perm(dt, dn);

	// update permissions for submitted / cancelled
	if(locals[dt][dn].docstatus > 0) {
		$.each(this.perm, function(i, p) { p[WRITE] = 0; });		
	}
				  
	if(!this.perm[0][READ]) { 
		if(user=='Guest') {
			// allow temp access? via encryted akey
			if(_f.temp_access[dt] && _f.temp_access[dt][dn]) {
				this.perm = [[1,0,0]]
				return 1;
			}
		}
		window.history.back();
		return 0;
	}
	return 1
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.refresh = function(docname) {
	// record switch
	if(docname) {
		if(this.docname != docname && (!this.meta.in_dialog || this.in_form) && !this.meta.istable) 
			scroll(0, 0);
		this.docname = docname;
	}
	if(!this.meta.istable) {
		cur_frm = this;
		this.parent.cur_frm = this;
	}
	
	if(this.docname) { // document to show

		// check permissions
		if(!this.check_doc_perm()) return;
		
		// check if doctype is already open
		if (!this.opendocs[this.docname]) {
			this.check_doctype_conflict(this.docname);
		}

		// set the doc
		this.doc = get_local(this.doctype, this.docname);	  

		// do setup
		if(!this.setup_done) this.setup();

		// set customized permissions for this record
		this.runclientscript('set_perm',this.doctype, this.docname);
		
		// load the record for the first time, if not loaded (call 'onload')
		cur_frm.cscript.is_onload = false;
		if(!this.opendocs[this.docname]) { 
			cur_frm.cscript.is_onload = true;
			this.setnewdoc(this.docname); 
		}

		// editable
		if(this.doc.__islocal) 
			this.is_editable[this.docname] = 1; // new is editable

		this.editable = this.is_editable[this.docname];
		
		if(this.editable || (!this.editable && this.meta.istable)) {
			// show form layout (with fields etc)
			// ----------------------------------
			this.layout.show();
			
			if(this.print_view) {
				$(this.print_view.wrapper).toggle(false);
				$(this.page_layout).toggle(true);
			}

			// header
			if(!this.meta.istable) { 
				this.refresh_header();
				this.sidebar && this.sidebar.refresh();
			}
			
			// call trigger
	 		this.runclientscript('refresh');
			
			// trigger global trigger
			// to use this
			// $(docuemnt).bind('form_refresh', function() { })
			$(document).trigger('form_refresh');
						
			// fields
			this.refresh_fields();
			
			// dependent fields
			this.refresh_dependency();

			// footer
			this.refresh_footer();
			
			// call onload post render for callbacks to be fired
			if(cur_frm.cscript.is_onload) {
				this.runclientscript('onload_post_render', this.doctype, this.docname);
			}
				
			// focus on first input
			
			if(this.doc.docstatus==0) {
				$(this.wrapper).find('.form-layout-row :input:first').focus();
			}
		
		} else {
			// show print layout
			// ----------------------------------
			this.refresh_header();
			if(this.print_view) {
				this.print_view.refresh(true);
			}
			this.runclientscript('edit_status_changed');
		}

		$(cur_frm.wrapper).trigger('render_complete');
	} 
}

// --------------------------------------------------------------------------------------

_f.Frm.prototype.refresh_footer = function() {
	var f = this.page_layout.footer;
	if(f.save_area) {
		if(this.editable && (!this.meta.in_dialog || this.in_form) 
			&& !this.meta.hide_toolbar
			&& !this.meta.hide_heading
			&& this.doc.docstatus==0 
			&& !this.meta.istable 
			&& this.get_doc_perms()[WRITE]
			&& (this.fields && this.fields.length > 7)) {
			f.show_save();
		} else {
			f.hide_save();
		}
	}
}

_f.Frm.prototype.refresh_field = function(fname) {
	this.fields_dict[fname] && this.fields_dict[fname].refresh
		&& this.fields_dict[fname].refresh();
}

_f.Frm.prototype.refresh_fields = function() {
	// refresh fields
	for(var i=0, fields_len = this.fields.length; i< fields_len; i++) {
		var f = this.fields[i];
		f.perm = this.perm;
		f.docname = this.docname;
				
		// if field is identifiable (not blank section or coluakemn break)
		// get the "customizable" parameters for this record
		var fn = f.df.fieldname || f.df.label;
		if(fn)
			f.df = wn.meta.get_docfield(this.doctype, fn, this.docname);
			
		if(f.df.fieldtype!='Section Break' && f.refresh) {
			f.refresh();
		}
	}

	// refresh sections
	$.each(this.sections, function(i, f) {
		f.refresh(true);
	})

	// cleanup activities after refresh
	this.cleanup_refresh(this);
}


_f.Frm.prototype.cleanup_refresh = function() {
	var me = this;
	if(me.fields_dict['amended_from']) {
		if (me.doc.amended_from) {
			unhide_field('amended_from'); unhide_field('amendment_date');
		} else {
			hide_field('amended_from'); hide_field('amendment_date');
		}
	}

	if(me.fields_dict['trash_reason']) {
		if(me.doc.trash_reason && me.doc.docstatus == 2) {
			unhide_field('trash_reason');
		} else {
			hide_field('trash_reason');
		}
	}

	if(me.meta.autoname && me.meta.autoname.substr(0,6)=='field:' && !me.doc.__islocal) {
		var fn = me.meta.autoname.substr(6);
		cur_frm.toggle_display(fn, false);
	}
}

// Resolve "depends_on" and show / hide accordingly

_f.Frm.prototype.refresh_dependency = function() {
	var me = this;
	var doc = locals[this.doctype][this.docname];

	// build dependants' dictionary	
	var has_dep = false;
	
	for(fkey in me.fields) { 
		var f = me.fields[fkey];
		f.dependencies_clear = true;
		if(f.df.depends_on) {
			has_dep = true;
		}
	}
	if(!has_dep)return;


	// show / hide based on values
	for(var i=me.fields.length-1;i>=0;i--) { 
		var f = me.fields[i];
		f.guardian_has_value = true;
		if(f.df.depends_on) {
			// evaluate guardian
			var v = doc[f.df.depends_on];
			if(f.df.depends_on.substr(0,5)=='eval:') {
				f.guardian_has_value = eval(f.df.depends_on.substr(5));
			} else if(f.df.depends_on.substr(0,3)=='fn:') {
				f.guardian_has_value = me.runclientscript(f.df.depends_on.substr(3), me.doctype, me.docname);
			} else {
				if(v || (v==0 && !v.substr)) { 
					// guardian has value
				} else { 
					f.guardian_has_value = false;
				}
			}

			// show / hide
			if(f.guardian_has_value) {
				f.df.hidden = 0;
				f.refresh()
			} else {
				f.df.hidden = 1;
				f.refresh()
			}
		}
	}
}

// setnewdoc is called when a record is loaded for the first time
// ======================================================================================

_f.Frm.prototype.setnewdoc = function(docname) {
	// moved this call to refresh function
	// this.check_doctype_conflict(docname);

	// if loaded
	if(this.opendocs[docname]) { // already exists
		this.docname=docname;
		return;
	}

	//if(!this.meta)
	//	this.setup_meta();

	// make a copy of the doctype for client script settings
	// each record will have its own client script
	wn.meta.make_field_copy_for_doc(this.doctype,docname);

	this.docname = docname;
	var me = this;
	
	var viewname = docname;
	if(this.meta.issingle) viewname = this.doctype;

	// Client Script
	this.runclientscript('onload', this.doctype, this.docname);
	
	this.is_editable[docname] = 1;
	if(this.meta.read_only_onload) this.is_editable[docname] = 0;
		
	this.opendocs[docname] = true;
}

_f.Frm.prototype.edit_doc = function() {
	// set fields
	this.is_editable[this.docname] = true;
	this.refresh();
}


_f.Frm.prototype.show_doc = function(dn) {
	this.refresh(dn);
}

// ======================================================================================
var validated; // bad design :(
_f.Frm.prototype.save = function(callback, btn) {
	var me = this;

	// removes focus from a field before save, 
	// so that its change event gets triggered before saving
	$(document.activeElement).blur();
	
	var doclist = new wn.model.DocList(this.doctype, this.docname);
	
	// validate
	if(doclist.doc.docstatus<2) {
		validated = true;
		if(this.cscript.validate)
			this.runclientscript('validate');
	
		if(!validated) {
			return;
		}
	}
	doclist.save(function(r) {
		if(r.exc) {
			//
		} else {
			me.refresh();
		}
		callback && callback(r);
	}, btn);
}

_f.Frm.prototype.savesubmit = function(btn) {
	this.doc.docstatus = 1;
	this.save(function(r) {
		if(!r.exc && me.cscript.on_submit) {
			me.runclientscript('on_submit', me.doctype, me.docname);
		}
	}, btn);
}

_f.Frm.prototype.savecancel = function(btn) {
	var me = this;
	var doclist = new wn.model.DocList(this.doctype, this.docname);
	doclist.cancel(function(r) {
		if(!r.exc) me.refresh();
	}, btn);
}

_f.Frm.prototype.runscript = function(scriptname, callingfield, onrefresh) {
	var me = this;
	if(this.docname) {
		// make doc list
		var doclist = wn.model.compress(wn.model.get_doclist(this.doctype, this.docname));
		// send to run
		if(callingfield)
			$(callingfield.input).set_working();

		$c('runserverobj', {'docs':doclist, 'method':scriptname }, 
			function(r, rtxt) { 
				// run refresh
				if(onrefresh)
					onrefresh(r,rtxt);

				// fields
				me.refresh_fields();
				
				// dependent fields
				me.refresh_dependency();

				// enable button
				if(callingfield)
					$(callingfield.input).done_working();
			}
		);
	}
}

_f.Frm.prototype.runclientscript = function(caller, cdt, cdn) {
	if(!cdt)cdt = this.doctype;
	if(!cdn)cdn = this.docname;

	var ret = null;
	var doc = locals[cur_frm.doc.doctype][cur_frm.doc.name];
	
	if(this.cscript[caller])
		ret = this.cscript[caller](doc, cdt, cdn);
	// for product
	if(this.cscript['custom_'+caller])
		ret += this.cscript['custom_'+caller](doc, cdt, cdn);

	if(caller && caller.toLowerCase()=='setup') {

		var doctype = wn.meta.get('DocType', this.doctype)[0];
		
		// js
		var cs = doctype.__js || (doctype.client_script_core + doctype.client_script);
		if(cs) {
			try {
				eval(cs);				
			} catch(e) {
				console.log("There was error in client script while loading");
				console.log(e);
			}
		}

		// css
		if(doctype.__css) set_style(doctype.__css)
		
		// ---Client String----
		if(doctype.client_string) { // split client string
			this.cstring = {};
			var elist = doctype.client_string.split('---');
			for(var i=1;i<elist.length;i=i+2) {
				this.cstring[strip(elist[i])] = elist[i+1];
			}
		}
	}
	return ret;
}

_f.Frm.prototype.copy_doc = function(onload, from_amend) {
	if(!this.perm[0][CREATE]) {
		msgprint('You are not allowed to create '+this.meta.name);
		return;
	}
	
	var dn = this.docname;
	// copy parent
	var newdoc = wn.model.copy_doc(this.doctype, dn, from_amend);

	// do not copy attachments
	if(this.meta.allow_attach && newdoc.file_list && !from_amend)
		newdoc.file_list = null;
	
	// copy chidren
	var dl = wn.model.get_doclist(this.doctype, dn);

	// table fields dict - for no_copy check
	var tf_dict = {};

	for(var d in dl) {
		d1 = dl[d];
		
		// get tabel field
		if(d1.parentfield && !tf_dict[d1.parentfield]) {
			tf_dict[d1.parentfield] = wn.meta.get_docfield(d1.parenttype, d1.parentfield);
		}
		
		if(d1.parent==dn && cint(tf_dict[d1.parentfield].no_copy)!=1) {
			var ch = wn.model.copy_doc(d1.doctype, d1.name, from_amend);
			ch.parent = newdoc.name;
			ch.docstatus = 0;
			ch.owner = user;
			ch.creation = '';
			ch.modified_by = user;
			ch.modified = '';
		}
	}

	newdoc.__islocal = 1;
	newdoc.docstatus = 0;
	newdoc.owner = user;
	newdoc.creation = '';
	newdoc.modified_by = user;
	newdoc.modified = '';

	if(onload)onload(newdoc);

	loaddoc(newdoc.doctype, newdoc.name);
}

_f.Frm.prototype.reload_doc = function() {
	this.check_doctype_conflict(this.docname);

	var me = this;
	var ret_fn = function(r, rtxt) {
		// n tweets and last comment				
		me.runclientscript('setup', me.doctype, me.docname);
		me.refresh();
	}

	if(me.doc.__islocal) { 
		// reload only doctype
		$c('webnotes.widgets.form.load.getdoctype', {'doctype':me.doctype }, ret_fn, null, null, 'Refreshing ' + me.doctype + '...');
	} else {
		// reload doc and docytpe
		$c('webnotes.widgets.form.load.getdoc', {'name':me.docname, 'doctype':me.doctype, 'getdoctype':1, 'user':user}, ret_fn, null, null, 'Refreshing ' + me.docname + '...');
	}
}

// delete the record
_f.Frm.prototype.savetrash = function(btn) {
	var me = this;
	var answer = confirm("Permanently Delete "+this.docname+"? This action cannot be reversed");
	if(answer) {
		$(btn).attr("disabled", true);
		$c('webnotes.model.delete_doc', {dt:this.doctype, dn:this.docname}, function(r,rt) {
			$(btn).attr("disabled", false);
			if(r.message=='okay') {
				// delete from locals
				wn.model.clear_doclist(me.doctype, me.docname)
				
				// delete from recent
				if(wn.ui.toolbar.recent) wn.ui.toolbar.recent.remove(me.doctype, me.docname);
				
				// "close"
				window.history.back();
			}
		})
	} 
}

_f.Frm.prototype.amend_doc = function() {
	if(!this.fields_dict['amended_from']) {
		alert('"amended_from" field must be present to do an amendment.');
		return;
	}
	var me = this;
    var fn = function(newdoc) {
      newdoc.amended_from = me.docname;
      if(me.fields_dict && me.fields_dict['amendment_date'])
	      newdoc.amendment_date = dateutil.obj_to_str(new Date());
    }
    this.copy_doc(fn, 1);
}

_f.get_value = function(dt, dn, fn) {
	if(locals[dt] && locals[dt][dn]) 
		return locals[dt][dn][fn];
}

_f.Frm.prototype.set_value_in_locals = function(dt, dn, fn, v) {
	var d = locals[dt][dn];

	if (!d) return;
	
	var changed = d[fn] != v;
	if(changed && (d[fn]==null || v==null) && (cstr(d[fn])==cstr(v))) 
		changed = false;

	if(changed) {
		d[fn] = v;
		if(d.parenttype)
			d.__unsaved = 1;
		this.set_unsaved();
	}
}

_f.Frm.prototype.set_unsaved = function() {
	if(cur_frm.doc.__unsaved) return;
	cur_frm.doc.__unsaved = 1;
	var frm_head = cur_frm.frm_head || wn.container.page.frm.frm_head;
	frm_head.refresh_labels();
}

_f.Frm.prototype.get_doc = function() {
	return locals[this.doctype][this.docname];
}

_f.Frm.prototype.get_doclist = function() {
	return wn.model.get_doclist(this.doctype, this.docname);
}

_f.Frm.prototype.field_map = function(fnames, fn) {
	if(typeof fnames=='string') {
		if(fnames == '*') {
			fnames = keys(this.fields_dict);
		} else {
			fnames = [fnames];			
		}
	}
	$.each(fnames, function(i,f) {
		var field = cur_frm.fields_dict[f].df;
		if(field) {
			fn(field);
			cur_frm.refresh_field(f);
		};
	})
	
}

_f.Frm.prototype.set_df_property = function(fieldname, property, value) {
	var field = wn.meta.get_docfield(cur_frm.doctype, fieldname, cur_frm.docname)
	if(field) {
		field[property] = value;
		cur_frm.refresh_field(fieldname);
	};
}

_f.Frm.prototype.toggle_enable = function(fnames, enable) {
	cur_frm.field_map(fnames, function(field) { field.disabled = enable ? false : true; });
}

_f.Frm.prototype.toggle_reqd = function(fnames, mandatory) {
	cur_frm.field_map(fnames, function(field) { field.reqd = mandatory ? true : false; });
}

_f.Frm.prototype.toggle_display = function(fnames, show) {
	cur_frm.field_map(fnames, function(field) { field.hidden = show ? false : true; });
}

_f.Frm.prototype.call_server = function(method, args, callback) {
	$c_obj(cur_frm.get_doclist(), method, args, callback);
}

_f.Frm.prototype.set_value = function(field, value) {
	cur_frm.get_doc()[field] = value;
	cur_frm.fields_dict[field].refresh();
}
