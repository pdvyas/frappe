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

wn.provide('wn.meta.docfield_map');
wn.provide('wn.meta.docfield_list');
wn.provide('wn.meta.doctypes');
wn.provide("wn.metadata");
wn.provide("wn.meta.docfields")

$.extend(wn.meta, {
	// build docfield_map and docfield_list
	add_field: function(df) {
		wn.provide('wn.meta.docfield_map.' + df.parent);
		wn.meta.docfield_map[df.parent][df.fieldname || df.label] = df;
		
		if(!wn.meta.docfield_list[df.parent])
			wn.meta.docfield_list[df.parent] = [];
			
		// check for repeat
		for(var i in wn.meta.docfield_list[df.parent]) {
			var d = wn.meta.docfield_list[df.parent][i];
			if(df.fieldname==d.fieldname) 
				return; // no repeat
		}
		wn.meta.docfield_list[df.parent].push(df);
	},
	get_docfield: function(dt, fn, dn) {
		if(dn && wn.meta.docfields[dt] && wn.meta.docfields[dt][dn]){
			return wn.meta.docfields[dt][dn][fn];
		} else {
			return wn.meta.docfield_map[dt][fn];
		}
	},
	get: function(doctype, filters) {
		if(!wn.metadata[doctype]) return [];
		return wn.utils.filter_dict(wn.metadata[doctype], filters);
	},
	make_field_copy_for_doc: function(doctype, name) {
		var docfields = wn.provide("wn.meta.docfields." + doctype + "." + name);
		$.each(wn.meta.get("DocField", {parent:doctype}), function(i,d) {
			docfields[d.fieldname || d.label] = copy_dict(d);		
		});
	},
	rename_field_copy: function(doctype, oldname, newname) {
		var d = wn.meta.docfields[doctype];
		d[newname] = d[oldname];
		d[oldname] = null;
	},
	is_submittable: function(doctype) {
		return wn.meta.get("DocPerm", {document_type: doctype, submit:1}).length;
	},
	get_state_fieldname: function(doctype) {
		var wf = wn.meta.get("Workflow", {document_type: doctype});
		return wf.length ? wf[0].workflow_state_field : null;
	}	
});