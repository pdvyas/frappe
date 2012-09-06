// ERPNext - web based ERP (http://erpnext.com)
// Copyright (C) 2012 Web Notes Technologies Pvt Ltd
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

wn.form_classes['DocType Validator'] = wn.ui.Form.extend({
	setup: function() {
		var me = this;
		
		// add export button
		if (wn.boot.developer_mode) {
			this.add_export_button();
		}
		
		// load doctype when for_doctype is changed
		this.doclist.on('change for_doctype', function(key, val) {
			wn.model.with_doctype(val, function() {
			});
		});
		
		// update link fields when table_field is updated
		this.on("make link_filters table_field", function(control) {
			var me = this;
			control.set_options(this.get_parent_fields());
		});
		
		this.doclist.on("change link_filters table_field", function(key, val, doc) {
			// update options of link_field (if they exist)
			var link_field_control = doc.form.controls.link_field;
			if(link_field_control)
				link_field_control.set_options([""].concat(me.get_filter_links(val)));			
		});
		
		// set fieldname options (from link field)
		this.doclist.on("change link_filters link_field", function(key, val, doc) {
			if (!val) return;
			me.set_link_fieldnames(me.link_filter_on_doctype, val, null,
				function(fieldnames) {
					doc.form.controls.fieldname.set_options(fieldnames);
					doc.form.controls["fieldname"].set_init_value()
			});
		});

		this.on("make conditional_properties if_table_field", function(control) {
			control.set_options(this.get_parent_fields());
		});

		this.on("make conditional_properties then_table_field", function(control) {
			control.set_options(this.get_parent_fields());			
		});

		this.on("make unique_validation unique_table_field", function(control) {
			control.set_options(this.get_parent_fields());
		});

		this.doclist.on("change conditional_properties if_table_field", function(key, val, doc) {
			me.set_if_then_fields(doc, key, 'if_field');
		});

		this.doclist.on("change conditional_properties then_table_field", function(key, val, doc) {
			me.set_if_then_fields(doc, key, 'then_field');
		});
		
		// for conditions on linked document
		this.doclist.on("change conditional_properties if_field",
			function(key, val, doc) {
				me.set_if_then_ref_fields(doc, "if");
			});
		this.doclist.on("change conditional_properties then_field",
			function(key, val, doc) {
				me.set_if_then_ref_fields(doc, "then");
			});

		if(this.doc.get('for_doctype'))
			this.doc.trigger_change_event('for_doctype');
	},
	get_doctype_from_table_field: function(table_field_val) {
		var doctype = this.doc.get('for_doctype');
		if(table_field_val) {
			var doctype = wn.model.get('DocType', this.doc.get('for_doctype')).get({
				"fieldname": table_field_val })[0].get('options');
		}
		return doctype;
	},
	get_filter_links: function(val) {
		var doctype = this.get_doctype_from_table_field(val);
		this.link_filter_on_doctype = doctype;
		
		return $.map(
			wn.model.get('DocType', doctype).get({fieldtype: "Link"}),
			function(d) { return d.get('fieldname'); }
		);
	},
	get_parent_fields: function() {
		var parent_fields = $.map(wn.model.get('DocType', this.doc.get('for_doctype')).get({
			doctype:'DocField', 
			fieldtype: 'Table'
		}), function(d) { return d.get('fieldname'); });
		
		return [""].concat(parent_fields);
	},
	set_if_then_fields: function(doc, table_fieldname, fieldname) {
		var doctype = this.get_doctype_from_table_field(doc.get(table_fieldname));
		
		var all_fields = $.map(
			wn.model.get('DocType', doctype).get({doctype: "DocField"}),
			function(d) { return d.get('fieldname'); }
		);
		all_fields.sort();
		
		doc.form.controls[fieldname].set_options([""].concat(all_fields));
	},
	set_if_then_ref_fields: function(doc, type) {
		var me = this;
		var doctype = me.get_doctype_from_table_field(doc.get(type+"_table_field"));
		if (doctype) {
			me.set_link_fieldnames(doctype, doc.get(type+"_field"),
				doc.get(type+"_table_field"), function(fieldnames) {
					var ref_field = type+"_reference_field";
					doc.form.controls[ref_field].set_options([""].concat(fieldnames));
					doc.form.controls[ref_field].set_init_value()
			});
		}
	},
	set_link_fieldnames: function(doctype, fieldname, parent, callback) {
		var link_field_df = wn.model.get('DocType', doctype).get({
			doctype: 'DocField', fieldname: fieldname, fieldtype: 'Link'});

		if (link_field_df && link_field_df[0]) {
			link_field_df = link_field_df[0];
			wn.model.with_doctype(link_field_df.get('options'), function() {
				var fieldnames = $.map(wn.model.get('DocType',
					link_field_df.get('options')).get({doctype:'DocField'}),
					function(d) { return d.get('fieldname'); });

				callback(fieldnames);
			});
		}
	},
	add_export_button: function() {
		var me = this;
		var get_module = function() {
			var module = wn.model.get("DocType", 
				me.doc.get("for_doctype")).doclist[0].get("module");
			if(!module) {
				msgprint(wn._("Error: ") + wn._("Module missing"), null, 1);
			}
			return module;
		}
		this.export_button = $(this.appframe.add_button(wn._("Export"), function() {
			wn.call({
				method: "webnotes.modules.export_doc",
				args: {
					doctype: me.doc.get("doctype"),
					name: me.doc.get("name"),
					module: get_module()
				}
			});
		}));
		
		// on change hide the button
		this.doclist.on('change', function() {
			me.export_button.toggle(!me.doclist.doc.get('__islocal') &&
				!me.doclist.dirty);
		});
		
	}
});