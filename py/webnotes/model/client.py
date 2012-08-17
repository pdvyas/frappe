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
import webnotes.model

@webnotes.whitelist()
def get_doclist():
	"""get bundle of doc"""	
	doclist = webnotes.model.get(webnotes.form.doctype, webnotes.form.name)

	# add comments
	doclist[0]['__comments'] = webnotes.conn.sql("""select * from tabComment where
		parenttype=%s and parent=%s order by modified""", 
		(doclist[0].doctype, doclist[0].name), as_dict=1)
	
	# add assignment
	todo = 	webnotes.conn.sql("""select owner from tabToDo where
			reference_type=%s and reference_name=%s""", (doclist[0].doctype, doclist[0].name))
	doclist[0]['__assigned_to'] = todo and todo[0][0] or ''

	webnotes.response['docs'] = doclist

@webnotes.whitelist()
def get_doctype():
	"""get doctype, all child doctypes"""
	docs = []
	doctypelist = webnotes.model.get_doctype(webnotes.form.doctype, processed=True)
	docs = doctypelist
	for d in doctypelist.get({"fieldtype":"Table", "doctype":"DocField"}):
		docs.extend(webnotes.model.get_doctype(d.options, processed=True))
	
	webnotes.response['docs'] = docs
	
@webnotes.whitelist()
def save():
	"""insert doclist"""
	import webnotes.model
	import json
	
	c = webnotes.model.get_controller(json.loads(webnotes.form.get('docs')))
	c.save()
	webnotes.response['docs'] = c.doclist

@webnotes.whitelist()
def delete():
	"""delete model, by id"""
	import webnotes.model
	import json

	if 'docs' in webnotes.form:
		c = webnotes.model.get_controller(json.loads(webnotes.form.get('docs')))
	else:
		c = webnotes.model.get_controller(webnotes.form.doctype, webnotes.form.name)
		
	#c.delete()
