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

// document (row) wrapper
wn.model.Document = Class.extend({
	init: function(fields) {
		if(typeof fields === 'string') {
			fields = {
				doctype: fields, 
				__islocal:1, 
				owner:user, 
				name:wn.model.new_name(fields), 
				docstatus:0
			}
		}
		this.fields = fields;
	},
	get: function(key, ifnull) {
		var val = this.fields[key];
		if(!val && ifnull) return ifnull
		else return val;
	},
	convert_type: function(key, val) {
		if(!val) return val;
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
	
	// will trigger events
	// "change"
	// "change fieldname" or "change parentfield.fieldname"
	set: function(key, val) {
		var new_val = this.convert_type(key, val);
		if(this.fields[key] !== new_val) {
			this.fields[key] = new_val;
			this.trigger_change_event(key)
		}
	},
	trigger_change_event: function(key) {
		if(this.doclist) {
			this.doclist.trigger_change_event(key, this.fields[key], this)
		}
	},
	copy_from: function(doc) {
		var meta = wn.model.get('DocType', this.get('doctype'));

		var me = this;

		$.each(doc.fields, function(key, val) {
			var docfield = meta.get({doctype:"DocField", fieldname: key})[0]
			if(docfield) {
				if(!docfield.get('no_copy')) {
					me.set(key, val);
				}
			} else if(in_list(['parentfield', 'parenttype', 'idx'], key)) {
				me.set(key, val);				
			}
		});
	},
	copy: function() {
		// return a sanitized copy with a new name
		var new_doc = new wn.model.Document(this.get('doctype'));
		new_doc.copy_from(this);
		return new_doc;
	},
	extend: function(dict) {
		$.extend(this.fields, dict);
	}
});
