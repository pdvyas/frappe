# Copyright (c) 2012 Web Notes Technologies Pvt Ltd (http://erpnext.com)
# 
# MIT License (MIT)
# 
# Permission is hereby granted, free of charge, to any person obtaining a 
# copy of this software and associated documentation files (the "Software"), 
# to deal in the Software without restriction, including without limitation 
# the rights to use, copy, modify, merge, publish, distribute, sublicense, 
# and/or sell copies of the Software, and to permit persons to whom the 
# Software is furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in 
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
# CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
# OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#

from __future__ import unicode_literals
import webnotes
import json

from webnotes.model.controller import Controller

@webnotes.whitelist()
def save():
	"""insert or update from form query"""
	doclist = json.loads(webnotes.form_dict.doclist)
	
	if not webnotes.has_permission(doclist[0]["doctype"], "write"):
		webnotes.msgprint("No Write Permission", raise_exception=True)

	controller = Controller(doclist)
	controller.save()
	
	return [d.fields for d in doclist]

@webnotes.whitelist()
def make_width_property_setter():
	doclist = json.loads(webnotes.form_dict.doclist)
	if doclist[0]["DocType"]=="Property Setter" and doclist[0]["field_name"]=="width":
		controller = Controller(doclist)
		controller.save()

@webnotes.whitelist()
def set_default():
	"""set a user default value"""
	webnotes.conn.set_default(webnotes.form_dict.key, webnotes.form_dict.value, 
		('parent' in webnotes.form_dict) and webntoes.form_dict.parent \
			or webnotes.session.user)
			
	from webnotes.sessions import clear_cache
	clear_cache(webnotes.session.user)

@webnotes.whitelist()
def update_value():
	""" update a value: 
		value must be in json to preserve datatype (string or number)"""
	from webnotes.model.doctype import get_property
	
	globals().update(webnotes.form_dict)
	
	v = json.loads(value).get("value")
	
	if "parent" in webnotes.form_dict:
		controller = Controller(doctype, parent)	
	else:
		controller = Controller(doctype, name)

	row = controller.doclist.get({"name": name})[0]
	
	# check permlevel = 0
	
	if (get_property(doctype, "permlevel", fieldname) or 0) != 0:
		webnotes.msgprint("Direct edit only allowed if permlevel is 0", raise_exception=1)
	
	row.fields[fieldname] = v

	if controller.doc.docstatus!=0:
		webnotes.msgprint("Cannot update Submitted / Cancelled document", 
			raise_exception=True)
	
	controller.save()
	
	return [d.fields for d in controller.doclist]
	
	