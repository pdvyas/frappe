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

function make_field(docfield, doctype, parent, frm, in_grid, hide_label) { // Factory
	field_class = docfield.fieldtype.replace(/ /g, "") + "Field";
	if(wn.form[field_class]) {
		var f = new wn.form[field_class]({
			df: docfield,
			parent: parent,
			doctype: doctype,
			frm: frm,
			in_grid: in_grid,
			perm: frm ? frm.perm : [[1,1,1]]
		});
		f.make_body();
		return f;
	} else {
		console.log("field not found: " + field_class);
		return { df: docfield };
	}
}

wn.provide("wn.form");

wn.form.Field = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.with_label = true;
		if(!this.parent) this.parent = wn.temp_container;
	},
	
	make_body: function() { 
		this.$wrapper = $('<div class="field field-'+ 
				this.df.fieldtype.toLowerCase().replace(/ /g, "") +'">\
			<div class="label_area">\
				<span class="label_txt"></span>\
				<i class="icon icon-warning-sign" \
					style="margin-left: 7px; display: none;"></i>\
			</div>\
			<div class="input_area"></div>\
			<div class="disp_area"></div>\
			<div class="help small"></div>\
			</div>');
			
		if(this.parent) this.$wrapper.appendTo(this.parent);
			
		this.label_span = this.$wrapper.find(".label_txt").get(0);
		this.disp_area = this.$wrapper.find(".disp_area").get(0);
		this.wrapper = this.$wrapper.get(0);
	},
	
	make_input: function() {
		var me = this;
		this.$wrapper.find(":input")
			.attr("name", this.df.fieldname)
			.change(function() {
				me.set_model(me.get_value());
			})
			.addClass("mousetrap"); // for ctrl+s
	},
	
	make_inline: function() {
		this.$wrapper.css({
			display: "inline",
			margin: "0px",
			"margin-top": "-4px"
		}).find(".label_area, .help").remove();
		
		this.$wrapper.find(".input_area").css({display:"inline"})
	},
	
	refresh: function() {
		this.refresh_view();
		if(this.frm)
			this.set_from_model();
	},
	
	refresh_view: function() {
		this.refresh_label();
		this.refresh_display();
		this.refresh_description();
	},
	
	refresh_label: function() {
		this.$wrapper.find(".label_txt").text(this.df.label);
	},
	
	refresh_description: function() {
		this.$wrapper.find(".help").toggle(this.df.description ? true : false)
			.html(this.df.description);
	},
	
	refresh_mandatory: function(val) {
		if(this.in_filter || !this.df.reqd || !this.get_value) return;
		this.$wrapper.toggleClass("mandatory", (val==null || val==="") ? true : false);
	},
	
	refresh_display: function() {
		var status = this.get_status();
		if(status == this.disp_status) return;
		
		if(status=="Write") {
			if(!this.$input && this.make_input)
				this.make_input();
			this.$wrapper.toggle(true);
			this.$wrapper.find(".input_area").toggle(true);
			this.$wrapper.find(".disp_area").toggle(false);

		} else if(status=="Read") {
			this.$wrapper.toggle(true);
			this.$wrapper.find(".input_area").toggle(false);
			this.$wrapper.find(".disp_area").toggle(true);
			
		} else {
			this.$wrapper.toggle(false);
		}
		
		this.disp_status = status;
	},
	
	set_model: function(val, no_trigger) {
		// update locals
		if(!this.frm) return;

		this.refresh_mandatory(val);
		this.frm.set_value_in_locals(this.doctype, this.docname, this.df.fieldname, val);
		
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
	
	set_focus: function() {
		this.$input && this.$input.focus && this.$input.focus();
	},
	
	set_value: function(val) {
		this.set_input && this.set_input(val);
		this.set_display && this.set_display(val);
		this.refresh_mandatory(val);
		this.last_value = val;
	},
	
	set_from_model: function() {
		this.set_value(this.validate(this.get_model_value()));
	},
	
	get_model_value: function() {
		return _f.get_value(this.doctype, this.docname,this.df.fieldname);
	},

	set_input: function(val) {
		if(this.$input) this.$input.val(val);
	},

	get_value: function() {
		return this.$input ? this.validate(this.$input.val()) : null;
	},
	
	set_display: function(v) {
		this.$wrapper.find(".disp_area").html(this.get_formatted_value(v));
	},
	
	get_formatted_value: function(v) {
		return wn.form.get_formatter(this.df.fieldtype)(v, this.df)
	},
	
	get_status: function() {
		if(!this.frm || this.in_filter) {
			return 'Write';
		}

		if(!this.df.permlevel) 
			this.df.permlevel = 0;

		var p = this.perm[this.df.permlevel];
		var ret;

		// hidden
		if(cint(this.df.hidden)) return "None";

		// permission level
		if(this.frm.editable && p && p[WRITE] && !this.df.disabled)
			ret='Write';
		else if(p && p[READ])
			ret='Read';
		else 
			ret='None';

		// for submit
		if(ret=='Write' && cint(this.frm.doc.docstatus) > 0) ret = 'Read';

		if(this.frm.doc && this.frm.doc.docstatus==1 && ret=="Read"
			&& this.df.fieldtype!="Table") {
			ret = this.check_allow_on_submit();			
		}

		return ret;	
	},
	check_allow_on_submit: function() {
		if(this.df.allow_on_submit && cint(this.frm.doc.docstatus)>0) {
			if(this.frm.orig_perm[this.df.permlevel] 
				&& this.frm.orig_perm[this.df.permlevel][WRITE]) {
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
		var me = this;
		this.$input = $("<input type='"+ 
			(this.df.fieldtype=='Password' ? 'password' : 'text') +"'>")
			.appendTo(this.$wrapper.find(".input_area"))
			
		this._super();
	},
	set_value: function(val) {
		// show empty string instead of null
		if(val===undefined || val===null) val = "";
		this._super(val);
	}
});

wn.form.PasswordField = wn.form.DataField;

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
		this.$input.focus(function() {
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

wn.form.ReadOnlyField = wn.form.DataField.extend({
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
		this.$wrapper = $("<div style='field field-html'>").appendTo(this.parent);
		this.disp_area = this.wrapper = this.$wrapper.get(0);
	},
	refresh: function() {
		if(this.df.options) {
			this.$wrapper.html(this.df.options);
		}
	},
	set_value: function(val) {
		return;
	}
})

// Date Field
// -------------------

var datepicker_active = false;
wn.form.DateField = wn.form.DataField.extend({
	validate: function(v) {
		if(!v) return v;
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

		var me = this;
		this.$input.datepicker({
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
		return this.validate(dateutil.user_to_str(this.$input.val()));
	}
});

// Link Field
// -------------------

wn.form.LinkField = wn.form.DataField.extend({
	make_input: function() {
		var me = this;
		this._super();
		this.$input.unbind("change");
		this.$input.autocomplete({
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
				me.set_model(ui.item.value);
			},
			change: function(event, ui) {
				if(!ui.item) {
					$(this).val("");
					me.set_model("");
				}
			}
		}).data('autocomplete')._renderItem = function(ul, item) {
			return $('<li></li>')
				.data('item.autocomplete', item)
				.append(repl('<a>%(label)s<br><span style="font-size:10px">\
					%(info)s</span></a>', item))
				.appendTo(ul);
		};
		
		this.make_buttons();
	},
	set_model: function(val, after_link_validated) {
		// called twice, onchange and after link is valdiated
		// if called onchange, run link validation
		// then update model and run trigger
		
		var me = this;
		if(after_link_validated || !this.frm) {
			this._super(val)
		} else {
			this.validate_link(val);
		}
	},
	validate_link: function(val) {
		// validate the value just entered
		var me = this;
		var fetch = '';
		if(this.frm.fetch_dict[me.df.fieldname])
			fetch = this.frm.fetch_dict[me.df.fieldname].columns.join(', ');

		var me = this;
		wn.call({
			method:'webnotes.widgets.form.utils.validate_link',
			args: {
				'value': val, 
				'options':me.df.options, 
				'fetch': fetch				
			},
			callback: function(r) {
				if(r.message=='Ok') {
					// set fetch values
					if(me.last_value != val) {
						me.set_value(val);
						me.set_model(val, true);
					}

					if(r.fetch_values) 
						me.set_fetch_values(r.fetch_values);

				} else {
					me.set_value("");
					me.set_model("", true);
				}				
			}
		});
	},
	refresh: function() {
		this._super();
		
		this.$wrapper.find(".input_area .icon-plus").css("display", 
			this.can_create ? "inline" : "none")
	},
	
	make_buttons: function() {
		this.can_create = 0;
		if(this.frm && in_list(profile.can_create, this.df.options))
			this.can_create = 1;

		$('<i style="cursor: pointer; margin-left: 2px;" class="icon icon-search"\
				title="Search Link"></i>\
			<i style="cursor: pointer; margin-left: 2px;" class="icon icon-play"\
				title="Open Link"></i>\
			<i style="cursor: pointer; margin-left: 2px;" class="icon icon-plus"\
				title="Make New"></i>').appendTo(this.$wrapper.find(".input_area"));

		var me = this;
		$(this.$wrapper.find(".input_area .icon-search")).click(function() {
			selector.set(me, me.df.options, me.df.label);
			selector.show(me.txt);			
		});

		$(this.$wrapper.find(".input_area .icon-play")).click(function() {
			wn.set_route("Form", me.df.options, me.get_value());
		});

		$(this.$wrapper.find(".input_area .icon-plus")).click(function() {
			newdoc(me.df.options);
		});

	},
	set_fetch_values: function(fetch_values) { 
		var fl = this.frm.fetch_dict[this.df.fieldname].fields;
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
			if(this.frm.fields_dict[changed_fields[i]]) // on main
				this.frm.fields_dict[changed_fields[i]].run_trigger();
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
			if(this.frm)
				var doc = locals[this.frm.doctype][this.frm.docname];
			return this.get_query(doc, this.doctype, this.docname);
		}
	}
})

// Check Field
// -------------------

wn.form.CheckField = wn.form.Field.extend({
	make_body: function() {
		this.$wrapper = $('<div class="field field-check">\
			<span class="input_area"></span>\
			<span class="disp_area">\
			</span>\
			<span class="label_area">\
				<span class="label_txt"></span>\
			</span>\
			<div class="help small"></div>\
			</div>').appendTo(this.parent);
		this.wrapper = this.$wrapper.get(0);
	},
	make_input: function() {
		var me = this;
		this.$input = $("<input type='checkbox' style='width: 20px; margin-top: -2px;'>")
			.appendTo(this.$wrapper.find(".input_area")).click(
				function() {
					me.set_model(me.get_value());
				});
		this.input = this.$input.get(0);
	},
	set_input: function(val) {
		if(this.$input) this.$input.get(0).checked = cint(val) ? true : false;
	},
	get_value: function() {
		if(!this.$input) return null;
		return this.validate(this.$input.get(0).checked ? 1 : 0);
	}
})

// Text Field
// -------------------

var text_dialog;
wn.form.TextField = wn.form.Field.extend({
	make_input: function() {
		var me = this;
		this.$input = $('<textarea>').appendTo(this.$wrapper.find(".input_area"))
		this._super();
	},
})

wn.form.SmallTextField = wn.form.TextField.extend({
	make_input: function() {
		this._super();
		this.$input.css("height", "80px");
	}
});


// Select Field
// -------------------

wn.form.SelectField = wn.form.Field.extend({
	make_input: function() {
		if(this.df.options == 'attach_files:') {
			this.file_attach = true;
		}

		var me = this;
		this.$input = $("<select>").appendTo(this.$wrapper.find(".input_area"))
		this._super();
	},
	validate: function(val) {
		if(!this.$input) 
			return val;
			
		if(!this.$input.find("option[value='"+(val==null ? "" : val)+"']").length) {
			console.log("Unable to set value " + val + " for Select field " 
				+ this.df.fieldname);
			return this.$input.val();
		} else {
			return val;
		}
	},
	refresh: function() {
		this.refresh_view();
		
		// reset options
		this.set_attach_options();
		if(this.$input) this.$input.empty().add_options(this.df.options.split("\n"));

		if(this.frm)
			this.set_from_model();
	},
	set_attach_options: function() {
		// setup options as one of attached files
		if(this.df.options == 'attach_files:') {		
			if(!this.frm) return;
			var fl = this.frm.doc.file_list;
			if(fl) {
				this.df.options = '';
				var fl = fl.split('\n');
				for(var i in fl) {
					this.df.options += '\n' + fl[i].split(',')[1];
				}
			} else {
				this.df.options = '';
			}
		}
	}
});

// Time Field
// -------------------

wn.form.TimeField = wn.form.Field.extend({
	make_input: function() {
		wn.require("lib/js/lib/jquery/jquery.ui.slider.min.js");
		wn.require("lib/js/lib/jquery/jquery.ui.sliderAccess.js");
		wn.require("lib/js/lib/jquery/jquery.ui.timepicker-addon.css");
		wn.require("lib/js/lib/jquery/jquery.ui.timepicker-addon.js");
		
		var me = this;
		this.$input = $('<input type="text">')
			.appendTo(this.$wrapper.find(".input_area"))
			.timepicker({
				timeFormat: 'hh:mm',
			});

		this._super();
	}
});

// Button Field
// -------------------

wn.form.ButtonField = wn.form.Field.extend({
	make_body: function() {
		this._super();
		this.$wrapper.find(".label_area, .disp_area").remove();
	},
	make_input: function() {
		var me = this;
		this.$input = $("<button class='btn btn-small'>")
			.appendTo(this.$wrapper.find(".input_area"))
			.text(this.df.label)
			.click(function() {
				if(!me.frm) return;
				if(me.frm.cscript[me.df.fieldname]) {
					me.frm.runclientscript(me.df.fieldname, me.doctype, me.docname);
				} else {
					me.frm.runscript(me.df.options, me);
				}
			});
			
		this.input = this.$input.get(0);
	}
});