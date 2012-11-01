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

var locals = {'DocType':{}};

wn.provide("wn.model.precision_maps");

var no_value_fields = ['Section Break', 'Column Break', 'HTML', 'Table', 
'Button', 'Image'];

wn.model = {

	new_names: {},
	new_name_count: {},

	get_new_doc: function(doctype) {
		wn.provide("locals." + doctype);
		var doc = {
			docstatus: 0,
			doctype: doctype,
			name: wn.model.get_new_name(doctype),
			__islocal: 1,
			owner: user
		};
		wn.model.set_default_values(doc);
		locals[doctype][doc.name] = doc;
		return doc;		
	},
	
	make_new_doc_and_get_name: function(doctype) {
		return wn.model.get_new_doc(doctype).name;
	},
	
	get_new_name: function(doctype) {
		var cnt = wn.model.new_name_count
		if(!cnt[doctype]) 
			cnt[doctype] = 0;
		cnt[doctype]++;
		return 'New '+ doctype + ' ' + cnt[doctype];
	},
	
	set_default_values: function(doc) {
		var doctype = doc.doctype;
		var docfields = wn.meta.docfield_list[doctype] || [];
		var updated = [];
		
		for(var fid=0;fid<docfields.length;fid++) {
			var f = docfields[fid];
			if(!in_list(no_value_fields, f.fieldtype) && doc[f.fieldname]==null) {
				var v = wn.model.get_default_value(f);
				if(v) {
					doc[f.fieldname] = v;
					updated.push(f.fieldname);
				}
			}
		}
		return updated;
	},
	
	get_default_value: function(df) {
		var def_vals = {
			"_Login": user,
			"__user": user,
			"Today": dateutil.get_today(),
			"__today": dateutil.get_today(),
			"Now": dateutil.get_cur_time()
		}
		
		if(def_vals[df["default"]])
			return def_vals[df["default"]];
		else if(df["default"])
			return df["default"];
		else if(user_defaults[df.fieldname])
			return user_defaults[df.fieldname][0];
		else if(sys_defaults[df.fieldname])
			return sys_defaults[df.fieldname];
	},
	
	add_child: function(doc, childtype, parentfield) {
		// create row doc
		var d = wn.model.get_new_doc(childtype);
		$.extend(d, {
			parent: doc.name,
			parentfield: parentfield,
			parenttype: doc.doctype,
			idx: getchildren(childtype, d.parent, d.parentfield, d.parenttype).length 
		});
		return d;
	},
	
	copy_doc: function(dt, dn, from_amend) {
		var no_copy_list = ['name','amended_from','amendment_date','cancel_reason'];
		var newdoc = wn.model.get_new_doc(dt);

		for(var key in locals[dt][dn]) {
			// dont copy name and blank fields
			var df = wn.meta.get_docfield(dt, key);
			
			if(key.substr(0,2)!='__' 
				&& !in_list(no_copy_list, key) 
				&& !(df && (!from_amend && cint(df.no_copy)==1))) { 
				newdoc[key] = locals[dt][dn][key];
			}
		}
		return newdoc;
	},

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
			var fields = wn.meta.get("DocField", { parent:doctype, fieldtype: "Currency"})
				.concat(wn.meta.get("DocField", { parent:doctype, fieldtype: "Float"}))

			$.each(fields, function(i, d) {
				wn.model.precision_maps[doctype][d.fieldname] = d.precision;
			})
			
			return wn.model.precision_maps[doctype];
		});
	},
	
	map_doclist: function(from_to_list, from_docname, callback) {
		// create a new doclist using doctype mapper
		// TODO: change call to map_doclist(from_doctype, from_docname, to_doctype)
		
		var to_doctype = from_to_list[0][1];
		var to_docname = wn.model.make_new_doc_and_get_name(to_doctype);
		
		if(!callback)
			callback = function(to_docname) {
				loaddoc(to_doctype, to_docname);
			};
		
		wn.call({
			method: "dt_map",
			callback: function() { callback(to_docname); },
			args: {
				"docs": wn.model.compress([locals[to_doctype][to_docname]]),
				"from_doctype": from_to_list[0][0],
				"from_docname": from_docname,
				"to_doctype": from_to_list[0][1],
				"from_to_list": JSON.stringify(from_to_list),
			}
		});
	},
	
	has_children: function(parent_doctype, parent, table_field) {
		var table_doctype = wn.meta.get("DocField", 
			{parent:parent_doctype, fieldname: table_field})[0].options;

		return getchildren(table_doctype, parent, table_field, parent_doctype).length > 0;
	},

	get: function(doctype, filters) {
		if(!locals[doctype]) return [];
		return wn.utils.filter_dict(locals[doctype], filters);
	},
	
	getchildren: function(child_dt, parent, parentfield, parenttype) { 
		if(parenttype) {
			var l = wn.model.get(child_dt, {parent:parent, 
				parentfield:parentfield, parenttype:parenttype});
		} else {
			var l = wn.model.get(child_dt, {parent:parent, 
				parentfield:parentfield});				
		}

		l.sort(function(a,b) { return cint(a.idx) - cint(b.idx) }); 
		$.each(l, function(i, v) { v.idx = i+1; }); // for chrome bugs ???
		return l; 
	},

	get_doclist: function(doctype, name) {
		doclist = [];
		if(!locals[doctype]) 
			return doclist;

		doclist[0] = locals[doctype][name];

		$.each(wn.meta.get("DocField", {parent:doctype, fieldtype:"Table"}), 
			function(i, table_field) {
				doclist = doclist.concat(wn.model.get(table_field.options, {
					parent:name, parenttype: doctype, parentfield: table_field.fieldname})
				);
			}
		);
		
		return doclist;
	},
	
	clear_doclist: function(doctype, name) {
		$.each(wn.model.get_doclist(doctype, name), function(i, d) {
			if(d) wn.model.clear_doc(d.doctype, d.name);
		});
	},
	
	clear_doc: function(doctype, name) {
		delete locals[doctype][name];		
	},
}

// for old code
function get_local(dt, dn) { return locals[dt] ? locals[dt][dn] : null; };
function get_doctype_label(dt) { return dt };
function get_label_doctype(label) { return label };
var getchildren = wn.model.getchildren;
