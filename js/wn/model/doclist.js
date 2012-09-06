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
		doc = this.objectify(doc);
		this.doclist.push(doc);
		if(this.doclist.length==1) {
			this.setup(doc);
		}
	},
	objectify: function(doc) {
		if(!(doc instanceof wn.model.Document)) {
			var doc = new wn.model.Document(doc);
		}
		doc.doclist = this;
		return doc;
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
		var ret = $.map(this.doclist, function(d) { return me.match(filters, d) });
		ret.sort(function(a, b) { return (a.fields.idx - b.fields.idx); });
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
		try {
			this.validate();			
		} catch(e) {
			console.log(e);
			callback({exc: e});
			return;
		}
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
				callback && callback(r);
			},
			btn: btn
		});
	},
	validate: function() {
		// validate mandatory and duplication?
		var reqd = []
		$.each(this.doclist, function(i, d) {
			var meta = wn.model.get('DocType', d.get('doctype'));
			if(meta) {
				$.each(meta.get({doctype:'DocField', reqd:1}), 
					function(i, df) {
						var val = d.get(df.get('fieldname'));
						if(val===null || val===undefined) {
							reqd.push([df, d]);
						}
					});
			}
		})
		if(reqd.length) {
			$.each(reqd, function(i, info) {
				if(info[1].get('parent')) {
					msgprint(repl("<b>%(label)s</b> in <b>%(parent)s</b> \
						table row %(idx)s is mandatory.", {
							label: info[0].get('label'),
							idx: info[1].get('idx'),
							parent: wn.model.get('DocType', info[1].get('parenttype'))
								.get({fieldname: info[1].get('parentfield')})[0].get('label')
						}));
				} else {
					msgprint(repl("<b>%(label)s</b> in <b>%(parent)s</b> is mandatory.", info[0].fields));					
				}
			});
			msgprint('<div class="alert alert-error">Please enter some values in the above fields.</div>');
			throw 'mandatory error';
		}
	},
	reset: function(doclist) {
		// clear
		var oldname = this.doc.get('name');

		// new main doc
		this.doc.fields = doclist[0];
		this.name = this.doc.get('name');

		// for children
		this.doclist.splice(1);
		doclist = doclist.splice(1);
		
		for(i in doclist) {
			this.add(doclist[i]);
		}
		if(oldname != this.name) {
			// remove old reference
			delete wn.doclists[this.doctype][oldname];
		}
		this.dirty = false;
		this.trigger('reset');
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

		var doc = new wn.model.Document(docfield.get('options'));
		doc.extend({
			parent: this.doc.get('name'),
			parenttype: this.doc.get('doctype'),
			parentfield: parentfield,
			idx: this.get({parentfield: docfield.get('fieldname')}).length + 1			
		})

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
	},
	copy: function() {
		var new_doclist = new wn.model.DocList();
		this.each(function(d) {
			var new_doc = d.copy();
			
			// parent must point to new main
			if(d.get('parent')) 
				new_doc.set('parent', new_doclist.doc.get('name'));

			new_doclist.add(new_doc);
		});
		return new_doclist;
	},
	get_perm: function() {
		if(!this.perm) {
			this.perm = wn.model.perm.get(this.doc.get('doctype'), this.doc.get('name'));
		}
		return this.perm;
	},
	trigger_change_event: function(key, val, doc) {
		this.trigger('change', key, val, doc);
		if(doc.get('parentfield')) {
			this.trigger('change ' + doc.get('parentfield') + ' ' + key, 
				key, val, doc);
		} else {
			this.trigger('change ' + key, key, val, doc);
		}		
	}
});