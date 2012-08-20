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
		var doc = new wn.model.Document({doctype:dt, __islocal:1, owner:user, 
				name:wn.model.new_name(dt)});
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
	}	
});

// document (row) wrapper
wn.model.Document = Class.extend({
	init: function(fields) {
		this.fields = fields;
	},
	get: function(key, ifnull) {
		return this.fields[key] || ifnull;
	},
	convert_type: function(key, val) {
		if(val===null) return val;
		// check fieldtype and set value
		var df = wn.model.get('DocType', this.get('doctype'))
			.get({fieldname:key, doctype:"DocField"});
			
		if(df.length) {
			df = df[0]
			if(in_list(["Int", "Check"], df.fieldtype)) {
				val = cint(val);
			} else if(in_list(["Currency", "Float"], df.fieldtype)) {
				val = flt(val);
			} else if(df.fieldtype == 'Select') {
				if(in_list(df.options.split('\n'), val)) {
					throw val + " is not a correct option"
				}
			}
		}
		return val;
	},
	set: function(key, val) {
		this.fields[key] = this.convert_type(key, val);
		$(document).trigger(wn.model.event_name(this.get('doctype'), this.get('name')), 
			[key, this.fields[key]]);
	}
});

// doclist (collection) wrapper
wn.model.DocList = Class.extend({
	init: function(doclist) {
		this.doclist = [];
		if(doclist) {
			for(var i=0, len=doclist.length; i<len; i++) {
				this.add(doclist[i]);
			}
		}
	},
	add: function(doc) {
		if(!(doc instanceof wn.model.Document)) {
			var doc = new wn.model.Document(doc);
		}
		doc.doclist = this;
		this.doclist.push(doc);
		if(this.doclist.length==1) {
			this.setup(doc);
		}
	},
	setup: function(doc) {
		// first doc, setup and add to dicts
		this.doc = doc;
		this.doctype = doc.get('doctype');
		this.name = doc.get('name');
		wn.provide('wn.doclists.' + this.doctype);
		wn.doclists[this.doctype][this.name] = this;
	},
	// usage:
	// doclist.each(doctype, filters, fn)
	// doclist.each(filters/doctype, fn);
	// doclist.each(fn);
	//
	// example:
	// doclist.each({"doctype":"DocField", "fieldtype":"Table"}, function(d) {})
	// doclist.each('DocField', function(d) { })
	each: function() {
		if(typeof arguments[0]=='function') {
			var fn = arguments[0];
			$.each(this.doclist, function(i, doc) { fn(doc); })
		} else if(typeof arguments[1]=='function') {
			var fn = arguments[1];
			if(typeof arguments[0]=='string') {
				$.each(this.get({doctype:arguments[0]}), function(i, doc) { fn(doc); });				
			} else {
				$.each(this.get(arguments[0]), function(i, doc) { fn(doc); });				
			}
		} else {
			var fn = arguments[2];
			$.each(this.get(arguments[0], arguments[1]), function(i, doc) { fn(doc); });
		}
	},
	// usage:
	// doclist.get(doctype, filters) => filtered doclist
	// doclist.get(filters) => filtered doclist
	// doclist.get(fieldname) => value of main doc
	get: function() {
		var me = this;
		if(typeof arguments[0]=='string' && typeof arguments[1]=='string') {
			return this.doc.get(arguments[0], arguments[1]);
		} else if(typeof arguments[0]=='string') {
			var filters = {};
			if(arguments[1])
				filters = arguments[1];
			filters.doctype = arguments[0];				
		} else {
			var filters = arguments[0];
		}
		var ret = $.map(this.doclist, function(d) { return me.match(filters, d) })
		ret.sort(function(a, b) {
			return a.idx > b.idx;
		});
		return ret;
	},
	get_value: function(key, def) {
		return this.doc.get(key, def);
	},
	match: function(filters, doc) {
		for(key in filters) {
			var fval = filters[key];
			if(fval instanceof Array) {
				// one of
				if(!in_list(fval, doc.get(key))) return null;
			} else {
				// equal
				if(doc.get(key)!=filters[key]) {
					return null;
				}				
			}
		}
		return doc;
	},
	save: function(callback, btn) {
		var me = this;
		wn.call({
			method: 'webnotes.model.client.save',
			args: {
				docs: this.get_docs()
			},
			callback: function(r) {
				if(!r.exc) {
					// reset the doclist
					me.reset(r.docs);					
				}
				callback(r);
			}
		});
	},
	reset: function(doclist) {
		// clear
		var oldname = this.doc.get('name');
		this.doclist.splice(0, this.doclist.length);
		for(i in doclist) {
			this.add(doclist[i]);
		}
		if(oldname != this.name) {
			// remove old reference
			delete wn.doclists[this.doctype][oldname];
		}
	},
	get_docs: function() {
		return $.map(this.doclist, function(d) { return d.fields; });
	},
	rename: function() {
		this.name = this.doclist[0].get('name');
	},
	meta: function() {
		return wn.model.get('DocType', this.doc.get('doctype'));
	},
	add_child: function(parentfield) {
		var docfield = this.meta().get({fieldname:parentfield, doctype:'DocField'})[0];

		var doc = new wn.model.Document({
			doctype: docfield.get('options'), 
			name: wn.model.new_name(docfield.get('options')),
			__islocal:1, 
			owner:user, 
			parent: this.doc.get('name'),
			parenttype: this.doc.get('doctype'),
			parentfield: parentfield,
			idx: this.get({parentfield: docfield.get('fieldname')}).length + 1
		});

		wn.model.set_defaults(doc);
		
		// append to doclist
		this.add(doc);
		
		return doc;
	},
	remove_child: function(doc) {
		this.doclist.splice(this.doclist.indexOf(doc), 1);
		this.renum_idx(doc.get('parentfield'));
	},
	renum_idx: function(parentfield) {
		$.each(this.get({parentfield: parentfield}), 
			function(i, d) { d.set('idx', i+1);
		});
	}
});