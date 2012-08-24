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
wn.provide('wn.docs');
wn.provide('wn.doclists');
wn.provide('wn.model.local_name_idx');

$.extend(wn.model, {
	no_value_type: ['Section Break', 'Column Break', 'HTML', 'Table', 
 	'Button', 'Image'],

	new_names: {},

	with_doctype: function(doctype, callback) {
		if(wn.model.has('DocType', doctype)) {
			callback();
		} else {
			wn.call({
				method:'webnotes.model.client.get_doctype',
				args: {
					doctype: doctype
				},
				callback: function(r) {
					wn.model.sync(r.docs);
					callback(r);
				}
			});
		}
	},
	with_doc: function(doctype, name, callback) {
		if(!name) name = doctype; // single type
		if(wn.model.has(doctype, name)) {
			callback(name);
		} else {
			wn.call({
				method:'webnotes.model.client.get_doclist',
				args: {
					doctype: doctype,
					name: name
				},
				callback: function(r) {
					wn.model.sync(r.docs);
					callback(name, r);
				}
			});
		}
	},
	can_delete: function(doctype) {
		if(!doctype) return false;
		return wn.model.get('DocType', doctype).get('allow_trash') && 
			wn.boot.profile.can_cancel.indexOf(doctype)!=-1;
	},
	sync: function(doclist) {
		for(var i=0, len=doclist.length; i<len; i++) {
			var doc = doclist[i];
			if(doc.parent) {
				var doclistobj = wn.doclists[doc.parenttype][doc.parent];
				doclistobj.add(doc);
			} else {
				new wn.model.DocList([doc]);
			}
		}
	},
	// return doclist
	get: function(dt, dn) {
		return wn.doclists[dt] && wn.doclists[dt][dn];
	},
	has: function(dt, dn) {
		if(wn.doclists[dt] && wn.doclists[dt][dn]) return true;
		else return false;
	},
	get_value: function(dt, dn, fieldname) {
		var doclist = wn.model.get(dt, dn);
		if(doclist) return doclist.doc.get(fieldname);
		else return null;
	},
	set_value: function(dt, dn, fieldname, value) {
		wn.model.get(dt, dn).doc.set(fieldname, value);
	},
	remove: function(dt, dn) {
		delete wn.doclists[dt][dn];
	},
	// naming style for onchange events
	event_name: function(dt, dn) {
		return 'change-'+dt.replace(/ /g, '_')+'-' + (dn || '').replace(/ /g, '_');
	},
	insert: function(doc, callback, btn) {
		var doclist = wn.model.create(doc.doctype);
		$.extend(doclist.doc.fields, doc);
		doclist.save(callback, btn);
	},
	// create a new local doclist
	create: function(dt) {
		// create a new doclist and add defaults
		var doc = new wn.model.Document(dt);
		wn.model.set_defaults(doc);
		return new wn.model.DocList([doc]);
	},
	new_name: function(dt) {
		if(!wn.model.local_name_idx[dt]) wn.model.local_name_idx[dt] = 1;
		var n = 'New '+ dt + ' ' + wn.model.local_name_idx[dt];
		wn.model.local_name_idx[dt]++;
		return n;
	},
	set_defaults: function(doc) {
		var doctypelist = wn.model.get('DocType', doc.get('doctype'));
		if(doctypelist) {
			doctypelist.each({doctype:'DocField'}, function(df) {
				var def = wn.model.get_default(df);
				if(def!==null)
					doc.set(df.fieldname, def)
			});			
		}
	},
	get_default: function(df) {
		if(df.fields) df = df.fields;
		var def = df['default'];
		var v = null;
		if(def=='__user')
			v = user;
		else if(df.fieldtype=='Date' && (def=='Today' || def=='__today')) {
			v = get_today(); }
		else if(def)
			v = def;
		else if(user_defaults[df.fieldname])
			v = user_defaults[df.fieldname][0];
		else if(sys_defaults[df.fieldname])
			v = sys_defaults[df.fieldname];
		return v;
	},
	get_grid_width: function(df, def_width) {
		if(df.fields) df = df.fields;
		if(df.width)
			return cint(df.width)
		else if(in_list(['Text', 'Small Text', 'Text Editor'], df.fieldtype))
			return 240
		else
			return def_width || 140
	}
});
