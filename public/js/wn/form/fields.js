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

var no_value_fields = ['Section Break', 'Column Break', 'HTML', 'Table', 'FlexTable', 'Button', 'Image'];
var codeid=0; var code_editors={};

function make_field(docfield, doctype, parent, frm, in_grid, hide_label) { // Factory

	switch(docfield.fieldtype.toLowerCase()) {
		
		// general fields
		case 'data':var f = new DataField(); break;
		case 'password':var f = new DataField(); break;
		case 'int':var f = new IntField(); break;
		case 'float':var f = new FloatField(); break;
		case 'currency':var f = new CurrencyField(); break;
		case 'read only':var f = new ReadOnlyField(); break;
		case 'link':var f = new LinkField(); break;
		case 'date':var f = new DateField(); break;
		case 'time':var f = new TimeField(); break;
		case 'html':var f = new HTMLField(); break;
		case 'check':var f = new CheckField(); break;
		case 'text':var f = new TextField(); break;
		case 'small text':var f = new TextField(); break;
		case 'select':var f = new SelectField(); break;
		case 'button':var f = new _f.ButtonField(); break;
		
		// form fields
		case 'code':var f = new _f.CodeField(); break;
		case 'text editor':var f = new _f.CodeField(); break;
		case 'table':var f = new _f.TableField(); break;
		case 'section break':var f= new _f.SectionBreak(); break;
		case 'column break':var f= new _f.ColumnBreak(); break;
		case 'image':var f= new _f.ImageField(); break;
	}

	f.parent 	= parent;
	f.doctype 	= doctype;
	f.df 		= docfield;
	f.perm 		= frm ? frm.perm : [[1,1,1]];
	if(_f)
		f.col_break_width = _f.cur_col_break_width;

	if(in_grid) {
		f.in_grid = true;
		f.with_label = 0;
	}
	if(hide_label) {
		f.with_label = 0;
	}
	if(frm) {
		f.frm = frm;
		if(parent)
			f.layout_cell = parent.parentNode;
	}
	if(f.init) f.init();
	f.make_body();
	return f;
}

wm.require("wn.form");

wn.form.Field = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.with_label = true;

		if(this.in_grid) this.hide_label();
	},
	
	make_body: function() { 
		this.wrapper = $('<div class="field">\
			<div class="label_area">\
				<span class="label_txt"></span>\
				<i class="icon icon-warning-sign" \
					style="margin-left: 7px; display: none;"></i>\
			</div>\
			<div class="input_area"></div>\
			<div class="disp_area"></div>\
			<div class="help small"></div>\
			</div>').appendTo(this.parent);
	},
	
	hide_label: function() {
		this.wrapper.find(".label_area").toggle(false);
	},
	
	refresh: function() {
		// if there is a special refresh in case of table, then this is not valid
		if(this.in_grid 
			&& this.table_refresh 
				&& this.disp_status == 'Write') 
					{ this.table_refresh(); return; }

		this.refresh_label();
		this.refresh_display();
		this.refresh_description();
		this.refresh_mandatory();
		if(this.frm)
			this.set_value(this.validate(_f.get_value(this.doctype, 
				this.docname, this.df.fieldname)));

	},
	
	refresh_label: function() {
		this.wrapper.find(".label_txt").text(this.df.label);
	},
	
	refresh_description: function() {
		this.wrapper.find(".help").toggle(this.df.description ? true : false)
			.text(this.df.description);
	},
	
	refresh_mandatory: function() {
		if(this.in_filter) return;
		this.wrapper.toggleClass("mandatory", (this.df.reqd && this.get_value 
			&& is_null(this.get_value())));
	},
	
	refresh_display: function() {
		var status = this.get_status();
		if(status == this.cur_status) return;
		
		if(status=="Write") {
			if(!this.input
				this.make_input();
			this.wrapper.toggle(true);
			this.wrapper.find(".input_area").toggle(true);
			this.wrapper.find(".disp_area").toggle(false);

		} else if(status=="Read") {
			this.wrapper.find(".input_area").toggle(false);
			this.wrapper.find(".disp_area").toggle(true);
			
		} else {
			this.wrapper.toggle(false);
		}
		
		this.cur_status = status;
	},
	
	set_model: function(val, no_trigger) {
		// update locals
		if(!this.frm) return;

		if((!this.docname) && this.grid)
			this.docname = this.grid.add_newrow(); // new row

		cur_frm.set_value_in_locals(this.doctype, this.docname, this.df.fieldname, val);
		
		if(!no_trigger)
			this.run_trigger();
		
		this.value = val; // for return
	},
	
	validate: function(v) {
		return v;
	},
		
	run_trigger: function() {
		if(!this.frm) return;

		if(this.frm.cscript[this.df.fieldname])
			this.frm.runclientscript(this.df.fieldname, this.doctype, this.docname);

		this.frm.refresh_dependency();
	},
	
	activate: function() {
		this.docname = docname;
		this.refresh();
		var v = _f.get_value(this.doctype, this.docname, this.df.fieldname);
		this.set_value(v);
		this.set_focus();
	},
	
	set_focus: function() {
		this.input && this.input.focus && this.input.focus();
	},
	
	set_value: function(val) {
		this.set_input && this.set_input(val);
		this.set_display && this.set_display(val);		
	},
	
	set_display: function(v) {
		this.wrapper.find(".disp_area").html(v);
	},
	
	get_status: function() {
		if(this.frm || this.in_filter) {
			return 'Write';
		}

		if(!this.df.permlevel) 
			this.df.permlevel = 0;

		var p = this.perm[this.df.permlevel];
		var ret;

		// hidden
		if(cint(this.df.hidden)) return "None";

		// permission level
		if(cur_frm.editable && p && p[WRITE] && !this.df.disabled)
			ret='Write';
		else if(p && p[READ])
			ret='Read';
		else 
			ret='None';

		// for submit
		if(ret=='Write' && cint(cur_frm.doc.docstatus) > 0) ret = 'Read';

		if(this.frm.doc && this.frm.docstatus==1 && ret=="Read")
			ret = this.check_allow_on_submit();

		return ret;		
	},
	check_allow_on_submit = function() {
		var aos = cint(this.df.allow_on_submit);

		if(aos && (this.in_grid || (this.frm && this.frm.not_in_container))) {
			aos = null;
			if(this.in_grid) aos = this.grid.field.df.allow_on_submit; // take from grid
			if(this.frm && this.frm.not_in_container) { aos = cur_grid.field.df.allow_on_submit;} // take from grid
		}

		if(cur_frm.editable && aos && cint(cur_frm.doc.docstatus)>0) {
			tmp_perm = get_perm(cur_frm.doctype, cur_frm.docname, 1);
			if(tmp_perm[this.df.permlevel] && tmp_perm[this.df.permlevel][WRITE]) {
				return 'Write';
			}
		}
		return "Read"
	}	
});

// Data Field
// -------------------

wn.form.DataField = wn.form.Field.extend({
	make_input: function() {
		this.input = $("<input type='"+ 
			(this.df.fieldtype=='Password' ? 'password' : 'text') +"'>")
			.appendTo(this.wrapper.find(".input_area"))
			.attr("name", this.df.fieldname)
			.attr("id", this.df.parent + "_" this.df.fieldname)
			.change(function() {
				// fix: allow 0 as value
				me.set_model(me.get_value());
			});
	},
	get_value: function() {
		return this.validate(this.input.val());
	},
	set_value: function(val) {
		// show empty string instead of null
		if(v===undefined || v===null) val = "":
		this._super(val);
	},
	set_input: function(val) {
		this.input.val(val);
	}
	
})

// Integer Field
// -------------------

wn.form.IntField = wn.form.DataField.extend({
	validate: function(v) {
		if(isNaN(parseInt(v)))return null;
		return cint(v);
	}
});

// Float Field
// -------------------

wn.form.FloatField = wn.form.DataField.extend({
	validate: function(v) {
		var v= parseFloat(v); 
		if(isNaN(v))
			return null;
		return v;
	}
});

// Currency Field
// -------------------

wn.form.CurrencyField = wn.form.DataField.extend({
	make_input: function() {
		this._super();
		// select if 0
		this.input.focus(function() {
			if(cint(this.value)==0)
				this.select();
		});
	},
	validate: function(v) {
		if(v==null || v=='')
			return 0;
		return flt(v,2);
	},
	set_value: function(val) {
		this._super(fmt_money(val));
	}
});

// Read Only Field
// -------------------

wn.form.ReadOnlyField = wn.form.Field.extend({
	get_status: function() {
		var status = this._super();
		if(status=="Write") return "Read"
		else return status;
	}
})

// HTML Field
// -------------------

wn.form.HTMLField = wn.form.Field.extend({
	make_body: function() {
		this.wrapper = $("<div>").appendTo(this.parent);
	},
	refresh: function() {
		if(this.df.options) {
			this.wrapper.html(this.df.options);
		}
	}
})

// Date Field
// -------------------

var datepicker_active = false;
wn.form.DateField = wn.form.DataField.extend({
	validate: function(v) {
		if(!v) return;
		var me = this;
		this.clear = function() {
			msgprint ("Date must be in format " + this.user_fmt);
			me.set_value('');
			return '';
		}
		var t = v.split('-');
		if(t.length!=3) { return this.clear(); }
		else if(cint(t[1])>12 || cint(t[1])<1) { return this.clear(); }
		else if(cint(t[2])>31 || cint(t[2])<1) { return this.clear(); }
		return v;
	},
	make_input: function() {
		this._super();

		this.user_fmt = sys_defaults.date_format;
		if(!this.user_fmt)this.user_fmt = 'yyyy-mm-dd';

		$(this.input).datepicker({
			dateFormat: me.user_fmt.replace('yyyy','yy'), 
			altFormat:'yy-mm-dd', 
			changeYear: true,
			beforeShow: function(input, inst) { 
				datepicker_active = 1 
			},
			onClose: function(dateText, inst) { 
				datepicker_active = 0;
				if(_f.cur_grid_cell)
					_f.cur_grid_cell.grid.cell_deselect();	
			}
		});
	},
	set_value: function(val) {
		this._super(dateutil.str_to_user(val));
	},
	get_value: function() {
		return this._super(dateutil.user_to_str(val));
	},
	set_display: function(val) {
		this._super(dateutil.str_to_user(val));
	}
});

// Link Field
// -------------------

wn.form.LinkField = wn.form.DataField.extend({
	make_input: function() {
		this._super();
		
		this.input.autocomplete({
			source: function(request, response) {
				wn.call({
					method:'webnotes.widgets.search.search_link',
					args: {
						'txt': request.term, 
						'dt': me.df.options,
						'query': me.get_custom_query()
					},
					callback: function(r) {
						response(r.results);
					},
				});
			},
			select: function(event, ui) {
				me.set_value(ui.item.value);
			}
		}).data('autocomplete')._renderItem = function(ul, item) {
			return $('<li></li>')
				.data('item.autocomplete', item)
				.append(repl('<a>%(label)s<br><span style="font-size:10px">%(info)s</span></a>', item))
				.appendTo(ul);
		};
		
		this.make_buttons();
	}
	make_buttons: function() {
		this.can_create = 0;
		if(this.frm && in_list(profile.can_create, this.df.options)) {
			this.can_create = 1;

		$('<i style="cursor: pointer; margin-left: 2px;" class="icon icon-search"\
				title="Search Link"></i>\
			<i style="cursor: pointer; margin-left: 2px;" class="icon icon-play"\
				title="Open Link"></i>\
			<i style="cursor: pointer; margin-left: 2px;" class="icon icon-plus"\
				title="Make New"></i>').appendTo(this.wrapper.find(".input_area"));

		var me = this;
		$(this.wrapper.find(".input_area .icon-search")).click(function() {
			selector.set(me, me.df.options, me.df.label);
			selector.show(me.txt);			
		});

		$(this.wrapper.find(".input_area .icon-play")).click(function() {
			wn.set_route("Form", me.df.options, me.get_value());
		});

		$(this.wrapper.find(".input_area .icon-plus")).click(function() {
			newdoc(me.df.options);
		});

	},
	refresh: function() {
		this._super();
		
		this.wrapper.find(".input_area .icon-plus").css("display", 
			this.can_create ? "inline", "none")
	},
	set_display: function(val) {
		this._super(repl('<a href="#Form/%(doctype)s/%(name)s">%(names)</a>', {
			doctype: this.df.options,
			name: val
		}));
	},
	set_model: function(val, after_link_validated) {
		// called twice, onchange and after link is valdiated
		// if called onchange, run link validation
		// then update model and run trigger
		
		var me = this;
		if(after_link_validated) {
			this._super(val)
		} else {
			this.validate_link(val);
		}
	},
	validate_link: function(val) {
		// validate the value just entered
		var me = this;
		var fetch = '';
		if(cur_frm.fetch_dict[me.df.fieldname])
			fetch = cur_frm.fetch_dict[me.df.fieldname].columns.join(', ');

		var me = this;
		wn.call({
			method:'webnotes.widgets.form.utils.validate_link',
			args: {
				'value':val, 
				'options':me.df.options, 
				'fetch': fetch				
			},
			callback: function(r) {
				if(r.message=='Ok') {
					// set fetch values
					if(me.get_value()!=val) {
						me.set_value(val)
						me.set_model(val, true);
					}

					if(r.fetch_values) 
						me.set_fetch_values(r.fetch_values);

				} else {
					var astr = '';
					if(in_list(profile.can_create, me.df.options)) 
						astr = repl('<br><br><span class="link_type" \
							onclick="newdoc(\'%(dt)s\')">Click here</span> to create \
							a new %(dtl)s', { 
								dt:me.df.options, dtl:get_doctype_label(me.df.options)
							})
					msgprint(repl('error:<b>%(val)s</b> is not a valid %(dt)s.<br><br>\
						You must first create a new %(dt)s <b>%(val)s</b> and then select \
						its value. To find an existing %(dt)s, click on the magnifying \
						glass next to the field.%(add)s', {
							val:me.txt.value, dt:get_doctype_label(me.df.options), add:astr
						})); 
					me.set_value("");
					me.set_model("", true);
				}				
			}
		});
	},
	set_fetch_values: function(fetch_values) { 
		var fl = cur_frm.fetch_dict[this.df.fieldname].fields;
		var changed_fields = [];
		for(var i=0; i< fl.length; i++) {
			if(locals[this.doctype][this.docname][fl[i]]!=fetch_values[i]) {
				locals[this.doctype][this.docname][fl[i]] = fetch_values[i];
				if(!this.grid) {
					refresh_field(fl[i]);

					// call trigger on the target field
					changed_fields.push(fl[i]);
				}
			}
		}

		// run triggers
		for(i=0; i<changed_fields.length; i++) {
			if(cur_frm.fields_dict[changed_fields[i]]) // on main
				cur_frm.fields_dict[changed_fields[i]].run_trigger();
		}

		// refresh grid
		if(this.grid) this.grid.refresh();
	},
	set_get_query: function() { 
		if(this.get_query)return;

		if(this.grid) {
			var f = this.grid.get_field(this.df.fieldname);
			if(f.get_query) this.get_query = f.get_query;
		}
	},
	get_custom_query: function() {
		this.set_get_query();
		if(this.get_query) {
			if(cur_frm)
				var doc = locals[cur_frm.doctype][cur_frm.docname];
			return this.get_query(doc, this.doctype, this.docname);
		}
	}
})

wn.form.CheckField = wn.form.Field.extend({
	make_body: function() {
		this.wrapper = $('<div class="field">\
			<span class="input_area"></span>\
			<span class="disp_area">\
				<i class="icon icon-ok"></i>\
			</span>\
			<span class="label_area">\
				<span class="label_txt"></span>\
			</span>\
			<div class="help small"></div>\
			</div>').appendTo(this.parent);
	}
	make_input: function() {
		this.input = $("<input type='checkbox' style='width: 20px; margin-top: -2px;'>")
			.appendTo(this.input_area).click(
			function() {
				me.set_model(this.checked?1:0);
			});
	},
	set_input: function(val) {
		this.input.get(0).checked= cint(val) ? true : false;
	},
	set_display: function(val) {
		this.wrapper.find(".icon-ok").css("display", cint(val) ? true : false);
	},
	get_value: function() {
		return this.input.get(0).checked ? 1 : 0;		
	}
})


// ======================================================================================


function TextField() { } TextField.prototype = new Field();
TextField.prototype.set_disp = function(val) { 
	this.disp_area.innerHTML = replace_newlines(val);
}
TextField.prototype.make_input = function() {
	var me = this; 
	
	if(this.in_grid)
		return; // do nothing, text dialog will take over
	
	this.input = $a(this.input_area, 'textarea');
	if(this.df.fieldtype=='Small Text')
		this.input.style.height = "80px";
	this.input.set_input = function(v) {
		me.input.value = v;
	}
	this.input.onchange = function() {
		me.set(me.input.value); 
		me.run_trigger();
	}
	this.get_value= function() {
		return this.input.value;
	}
}

// text dialog
var text_dialog;
function make_text_dialog() {
	var d = new Dialog(520,410,'Edit Text');
	d.make_body([
		['Text', 'Enter Text'],
		['HTML', 'Description'],
		['Button', 'Update']
	]);
	d.widgets['Update'].onclick = function() {
		var t = this.dialog;
		t.field.set(t.widgets['Enter Text'].value);
		t.hide();
	}
	d.onshow = function() {
		this.widgets['Enter Text'].style.height = '300px';
		var v = _f.get_value(this.field.doctype,this.field.docname,this.field.df.fieldname);
		this.widgets['Enter Text'].value = v==null?'':v;
		this.widgets['Enter Text'].focus();
		this.widgets['Description'].innerHTML = ''
		if(this.field.df.description)
			$a(this.widgets['Description'], 'div', 'help small', '', this.field.df.description);
	}
	d.onhide = function() {
		if(_f.cur_grid_cell)
			_f.cur_grid_cell.grid.cell_deselect();
	}
	text_dialog = d;
}

TextField.prototype.table_refresh = function() {
	if(!this.text_dialog)
		make_text_dialog();
	text_dialog.set_title('Enter text for "'+ this.df.label +'"'); 
	text_dialog.field = this;
	text_dialog.show();
}


// Select
// ======================================================================================

function SelectField() { } SelectField.prototype = new Field();
SelectField.prototype.make_input = function() { 
	var me = this;
	var opt=[];
	
	if(this.in_filter && (!this.df.single_select)) {
		// multiple select
		this.input = $a(this.input_area, 'select');
		this.input.multiple = true;
		this.input.style.height = '4em';
		this.input.lab = $a(this.input_area, 'div', {fontSize:'9px',color:'#999'});
		this.input.lab.innerHTML = '(Use Ctrl+Click to select multiple or de-select)'
	} else {

		// Single select
		this.input = $a(this.input_area, 'select');
		
		this.input.onchange = function() {
			if(me.validate)
				me.validate();
			me.set(sel_val(this));
			me.run_trigger();
		}
		
		if(this.df.options == 'attach_files:') {
			this.file_attach = true;
		}
	}

	// set as single (to be called from report builder)
	this.set_as_single = function() {
		var i = this.input;
		i.multiple = false;
		i.style.height = null;
		if(i.lab)$dh(i.lab)
	}
	
	// refresh options list
	this.refresh_options = function(options) {		
		if(options)
			me.df.options = options;

		if(this.file_attach)
			this.set_attach_options();
		
		me.options_list = me.df.options?me.df.options.split('\n'):[''];
		
		// add options
		empty_select(this.input);
		if(me.in_filter && me.options_list[0]!='') {
			me.options_list = add_lists([''], me.options_list);			
		}
		add_sel_options(this.input, me.options_list);
	}
	
	// refresh options
	this.onrefresh = function() {
		this.refresh_options();

		if(this.frm) {
			this.input.value = '';
			return;
		}
		
		if(_f.get_value)
			var v = _f.get_value(this.doctype,this.docname,this.df.fieldname);
		else {
			if(this.options_list && this.options_list.length)
				var v = this.options_list[0];
			else
				var v = null;
		}
		this.input.set_input(v);
	}
	
	this.input.set_input=function(v) {
		if(!v) {
			if(!me.input.multiple) {
				if(me.docname) { // if called from onload without docname being set on fields
					if(me.options_list && me.options_list.length) {
						me.set(me.options_list[0]);
						me.input.value = me.options_list[0];
					} else {
						me.input.value = '';
					}
				}
			}
		} else {
			if(me.options_list) {
				if(me.input.multiple) {
					for(var i=0; i<me.input.options.length; i++) {
						me.input.options[i].selected = 0;
						if(me.input.options[i].value && inList(typeof(v)=='string'?v.split(","):v, me.input.options[i].value))
							me.input.options[i].selected = 1;
					}
				} else if(in_list(me.options_list, v)){
					me.input.value = v;
				}
			}
		}
	}
	this.get_value= function() {
		if(me.input.multiple) {
			var l = [];
			for(var i=0;i<me.input.options.length; i++ ) {
				if(me.input.options[i].selected)l[l.length] = me.input.options[i].value;
			}
			return l;
		} else {
			if(me.input.options) {
				var val = sel_val(me.input);
				if(!val && !me.input.selectedIndex)
					val = me.input.options[0].value;
				return val;
			}
			return me.input.value;
		}
	}
	
	this.set_attach_options = function() {
		if(!cur_frm) return;
		var fl = cur_frm.doc.file_list;
		if(fl) {
			this.df.options = '';
			var fl = fl.split('\n');
			for(var i in fl) {
				this.df.options += '\n' + fl[i].split(',')[1];
			}
		} else {
			this.df.options = ''
		}
	}
	this.refresh();
}

// Time
// ======================================================================================

function TimeField() { } TimeField.prototype = new Field();

TimeField.prototype.get_time = function() {
	return time_to_hhmm(sel_val(this.input_hr), sel_val(this.input_mn), sel_val(this.input_am));
}
TimeField.prototype.set_time = function(v) {	
	//show_alert(ret);
	ret = time_to_ampm(v);
	this.input_hr.inp.value = ret[0];
	this.input_mn.inp.value = ret[1];
	this.input_am.inp.value = ret[2];
}

TimeField.prototype.set_style_mandatory = function() { }

TimeField.prototype.make_input = function() { var me = this;
	this.input = $a(this.input_area, 'div', 'time_field');
	
	var t = make_table(this.input, 1, 3, '200px');

	var opt_hr = ['1','2','3','4','5','6','7','8','9','10','11','12'];
	var opt_mn = ['00','05','10','15','20','25','30','35','40','45','50','55'];
	var opt_am = ['AM','PM'];

	this.input_hr = new SelectWidget($td(t,0,0), opt_hr, '50px');
	this.input_mn = new SelectWidget($td(t,0,1), opt_mn, '50px');
	this.input_am = new SelectWidget($td(t,0,2), opt_am, '50px');
	
	var onchange_fn = function() {
		me.set(me.get_time()); 
		me.run_trigger();
	}
	
	this.input_hr.inp.onchange = onchange_fn;
	this.input_mn.inp.onchange = onchange_fn;
	this.input_am.inp.onchange = onchange_fn;
	
	this.onrefresh = function() {
		var v = _f.get_value ? _f.get_value(me.doctype,me.docname,me.df.fieldname) : null;
		me.set_time(v);
		if(!v)
			me.set(me.get_time());
	}
	
	this.input.set_input=function(v) {
		if(v==null)v='';
		me.set_time(v);
	}

	this.get_value = function() {
		return this.get_time();
	}
	this.refresh();
}

TimeField.prototype.set_disp=function(v) {
	var t = time_to_ampm(v);
	var t = t[0]+':'+t[1]+' '+t[2];
	this.set_disp_html(t);
}


_f.ButtonField = function() { };
_f.ButtonField.prototype = new Field();
_f.ButtonField.prototype.with_label = 0;
_f.ButtonField.prototype.init = function() {
	this.prev_button = null;
	// if previous field is a button, add it to the same div!
	
	// button-set structure
	// + wrapper (1st button)
	// 		+ input_area
	//			+ button_area
	//			+ button_area
	//			+ button_area
	
	if(!this.frm) return;
	
	if(cur_frm && 
		cur_frm.fields[cur_frm.fields.length-1] &&
			cur_frm.fields[cur_frm.fields.length-1].df.fieldtype=='Button') {
				
		this.make_body = function() {
			this.prev_button = cur_frm.fields[cur_frm.fields.length-1];
			if(!this.prev_button.prev_button) {
				// first button, make the button area
				this.prev_button.button_area = $a(this.prev_button.input_area, 'span');
			}
			this.wrapper = this.prev_button.wrapper;
			this.input_area = this.prev_button.input_area;
			this.disp_area = this.prev_button.disp_area;
			
			// all buttons in the same input_area
			this.button_area = $a(this.prev_button.input_area, 'span');
		}
	}
}
_f.ButtonField.prototype.make_input = function() { var me = this;
	if(!this.prev_button) {
		$y(this.input_area,{marginTop:'4px', marginBottom: '4px'});
	}

	// make a button area for one button
	if(!this.button_area) 
		this.button_area = $a(this.input_area, 'span','',{marginRight:'4px'});
	
	// make the input
	this.input = $btn(this.button_area, 
		me.df.label, null, 
		{fontWeight:'bold'}, null, 1)

	$(this.input).click(function() {
		if(me.not_in_form) return;
		
		if(cur_frm.cscript[me.df.fieldname] && (!me.in_filter)) {
			cur_frm.runclientscript(me.df.fieldname, me.doctype, me.docname);
		} else {
			cur_frm.runscript(me.df.options, me);
		}
	});
}

_f.ButtonField.prototype.hide = function() { 
	$dh(this.button_area);
};

_f.ButtonField.prototype.show = function() { 
	$ds(this.button_area);
};


_f.ButtonField.prototype.set = function(v) { }; // No Setter
_f.ButtonField.prototype.set_disp = function(val) {  } // No Disp on readonly



