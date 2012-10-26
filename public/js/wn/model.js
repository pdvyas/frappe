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

wn.provide('wn.model');
wn.provide("wn.model.precision_maps");

var no_value_fields = ['Section Break', 'Column Break', 'HTML', 'Table', 
'Button', 'Image'];

wn.model = {

	new_names: {},

	with_doctype: function(doctype, callback) {
		if(locals.DocType[doctype]) {
			callback();
		} else {
			wn.call({
				method:'webnotes.widgets.form.load.getdoctype',
				args: {
					doctype: doctype
				},
				callback: callback
			});
		}
	},
	
	with_doc: function(doctype, name, callback) {
		if(!name) name = doctype; // single type
		if(locals[doctype] && locals[doctype][name]) {
			callback(name);
		} else {
			wn.call({
				method: 'webnotes.widgets.form.load.getdoc',
				args: {
					doctype: doctype,
					name: name
				},
				callback: function(r) { callback(name, r); }
			});
		}
	},

	can_delete: function(doctype) {
		if(!doctype) return false;
		return wn.boot.profile.can_cancel.indexOf(doctype)!=-1;
	},
	
	can_read: function(doctype) {
		if(!doctype) return false;
		return wn.boot.profile.can_read.indexOf(doctype)!=-1;
	},
	
	has_value: function(dt, dn, fn) {
		// return true if property has value
		var val = locals[dt] && locals[dt][dn] && locals[dt][dn][fn];
		var df = wn.meta.get_docfield(dt, fn, dn);
		
		if(!df) console.log("No field found for " + fn);
		
		if(df.fieldtype=='Table') {
			var ret = false;
			$.each(locals[df.options] || {}, function(k,d) {
				if(d.parent==dn && d.parenttype==dt && d.parentfield==df.fieldname) {
					ret = true;
				}
			});
		} else {
			var ret = !is_null(val);			
		}
		return ret ? true : false;
	},
	
	get_precision_map: function(doctype) {
		if(wn.model.precision_maps[doctype])
			return wn.model.precision_maps[doctype];
		
		wn.model.precision_maps[doctype] = {};
		this.with_doctype(doctype, function(r) {
			if(r && r['403']) {
				console.log("Error in get_precision_map for DocType:" + doctype)
				return;
			}
			
			$.each(make_doclist("DocType", doctype), function(i, d) {
				if(d.doctype == "DocField" && in_list(["Currency", "Float"], d.fieldtype))
					wn.model.precision_maps[doctype][d.fieldname] = d.precision;
			});
			
			return wn.model.precision_maps[doctype];
		});
	},
	map_doclist: function(from_to_list, from_docname, callback) {
		// create a new doclist using doctype mapper
		// TODO: change call to map_doclist(from_doctype, from_docname, to_doctype)
		
		var to_doctype = from_to_list[0][1];
		var to_docname = createLocal(to_doctype);
		
		if(!callback)
			callback = function(to_docname) {
				loaddoc(to_doctype, to_docname);
			};
		
		wn.call({
			method: "dt_map",
			callback: function() { callback(to_docname); },
			args: {
				"docs": compress_doclist([locals[to_doctype][to_docname]]),
				"from_doctype": from_to_list[0][0],
				"from_docname": from_docname,
				"to_doctype": from_to_list[0][1],
				"from_to_list": JSON.stringify(from_to_list),
			}
		});
	},
	has_children: function(parent_doctype, parent, table_field) {
		var table_doctype = null;
		$.each(make_doclist("DocType", parent_doctype), function(i, d) {
			if(d.doctype == "DocField" && d.fieldname == table_field) {
				table_doctype = d.options.split("\n")[0];
				
				// break the loop
				return false;
			}
		});
		return getchildren(table_doctype, parent, table_field, parent_doctype).length > 0;
	},

	get: function(doctype, filters) {
		var ret = [];
		if(!locals[doctype]) return ret;
		
		$.each(locals[doctype], function(i, d) {
			for(key in filters) {
				if(d[key]!=filters[key]) return;
			}
			ret.push(d);
		});
		return ret;
	},
	
	get_state_fieldname: function(doctype) {
		if(locals.Workflow && locals.Workflow[doctype])
			return locals.Workflow[doctype].workflow_state_field;
	},
	
}
