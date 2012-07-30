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

cur_frm.cscript.refresh = function(doc) {
	if(doc.for_doctype) {
		cur_frm.cscript.for_doctype(doc);
	}
	if(!doc.__islocal) {
		cur_frm.add_custom_button('Export', function() {
			var module = wn.model.getone({"doctype":"DocType", "name":doc.for_doctype}).module;
			if(!module) {
				msgprint("Module missing");
				return;
			}
			wn.call({
				method:'webnotes.modules.export_doc',
				args: {
					doctype:'DocType Validator',
					name: cur_frm.docname,
					module: module
				}
			})
		})
	}
}

cur_frm.cscript.for_doctype = function(doc) {
	// load all select values
	wn.model.with_doctype(doc.for_doctype, function() {
		cur_frm.cscript.update_selects(doc)				
	});	
}

cur_frm.cscript.update_selects = function(doc) {
	var parent_fields = $.map(wn.model.get({"doctype":"DocField", "parent": doc.for_doctype, 
		"fieldtype":"Table"}), function(df) { return df.fieldname });

	cur_frm.set_child_df_property("DocType Link Filter", "table_field", "options",
		[""].concat(parent_fields).join('\n'))

	cur_frm.set_child_df_property("DocType Conditional Property", "if_table_field", "options",
		[""].concat(parent_fields).join('\n'))

	cur_frm.set_child_df_property("DocType Conditional Property", "then_table_field", "options",
		[""].concat(parent_fields).join('\n'))

	cur_frm.set_child_df_property("DocType Unique Row", "unique_table_field", "options",
		parent_fields.join('\n'))

}

// automatically set link fields of main doc
cur_frm.fields_dict.link_filters.grid.onrowadd = function(doc, cdt, cdn) {
	cur_frm.cscript.table_field(doc, cdt, cdn);
}

// set the link fields based on the table field selected or the main doc
cur_frm.cscript.table_field = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn];
	wn.provide('cur_frm.row_doctype');

	if(d.table_field) {
		var table_df = wn.model.get({"doctype":"DocField", "fieldname":d.table_field, 
			"parent": doc.for_doctype})[0];
		var doctype = table_df.options;
		cur_frm.row_doctype[d.table_field || doc.name] = table_df.parent;
	} else {
		var doctype = doc.for_doctype;
		cur_frm.row_doctype[d.table_field || doc.name] = doc.for_doctype;
	}

	var link_fields = $.map(wn.model.get({"doctype":"DocField", "parent":doctype, 
		"fieldtype":"Link"}), function(d) { return d.fieldname; } );
	
	cur_frm.set_child_df_property("DocType Link Filter", "link_field", "options",
		[""].concat(link_fields).join('\n'))
}

// select fieldnames for the link field
cur_frm.cscript.link_field = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn];
	
	var link_doctype = cur_frm.row_doctype[d.table_field || doc.name];
	var link_df = wn.model.get({doctype:"DocField", "parent":link_doctype, 
		"fieldname": d.link_field})[0];
				
	wn.model.with_doctype(link_df.options, function() {
		cur_frm.set_child_df_property("DocType Link Filter", "fieldname", "options",
		$.map(wn.model.get({"doctype":"DocField", "parent":link_df.options}), 
			function(d) { return d.fieldname }).join('\n')
		)
	});
}

// automatically set link fields of main doc
cur_frm.fields_dict.conditional_properties.grid.onrowadd = function(doc, cdt, cdn) {
	cur_frm.cscript.if_table_field(doc, cdt, cdn);
	cur_frm.cscript.then_table_field(doc, cdt, cdn);
}


// set the if and then fields based on the table field selected or the main doc
cur_frm.cscript.if_table_field = function(doc, cdt, cdn) {
	cur_frm.cscript.set_if_then_fields(doc, cdt, cdn, 'if_table_field', 'if_field');
}

cur_frm.cscript.then_table_field = function(doc, cdt, cdn) {
	cur_frm.cscript.set_if_then_fields(doc, cdt, cdn, 'then_table_field', 'then_field');
}

// set the if and then fields based on the table field selected or the main doc
cur_frm.cscript.set_if_then_fields = function(doc, cdt, cdn, table_fieldname, fieldname) {
	var d = locals[cdt][cdn];

	if(d[table_fieldname]) {
		var table_df = wn.model.get({"doctype":"DocField", "fieldname":d[table_fieldname], 
			"parent": doc.for_doctype})[0];
		var doctype = table_df.options;
	} else {
		var doctype = doc.for_doctype;
	}

	var all_fields =$.map(wn.model.get({"doctype":"DocField", "parent":doctype}), 
		function(d) { return d.fieldname; } );
	all_fields.sort();
	
	cur_frm.set_child_df_property("DocType Conditional Property", fieldname, "options",
		[""].concat(all_fields).join('\n'))
}

