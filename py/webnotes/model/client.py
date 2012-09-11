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


import webnotes
import webnotes.model

@webnotes.whitelist()
def get_doclist(session):
	"""get bundle of doc"""	
	doclist = session.get_doclist(session.request.params.get('doctype'), 
		session.request.params.get('name'), strip_nulls=True)

	# add comments
	doclist[0]['__comments'] = session.db.sql("""select * from tabComment where
		parenttype=%s and parent=%s order by modified""", 
		(doclist[0].doctype, doclist[0].name), as_dict=1)
	
	# add assignment
	todo = 	session.db.sql("""select owner from tabToDo where
			parent=%s and reference_name=%s""", (doclist[0].doctype, doclist[0].name))
	doclist[0]['__assigned_to'] = todo and todo[0][0] or ''
	
	session.json['docs'] = doclist
	
	session.profile.update_recent(session.request.params.get('doctype'), 
		session.request.params.get('name'))

@webnotes.whitelist()
def get_doctype(session):
	"""get doctype, all child doctypes"""
	docs = []
	doctypelist = session.get_doctype(session.request.params.get('doctype'), 
		processed=True, strip_nulls=True)
	docs = doctypelist
	for d in doctypelist.get({"fieldtype":"Table", "doctype":"DocField"}):
		docs.extend(session.get_doctype(d.options, processed=True))
	
	session.json['docs'] = docs
	
@webnotes.whitelist()
def save(session):
	"""insert doclist"""
	import json
	
	c = session.get_controller(json.loads(session.request.params('docs')))
	c.save()
	session.json['docs'] = c.doclist

@webnotes.whitelist()
def delete(session):
	"""delete model, by id"""
	import json

	if 'docs' in session.request.params:
		c = session.get_controller(json.loads(session.request.params('docs')))
	else:
		c = session.get_controller(session.request.params.get('doctype'), 
			session.request.params.get('name'))
		
	#c.delete()

@webnotes.whitelist()
def update_value(session):
	"""update a single value"""
	from webnotes.utils import remove_nulls
	
	obj = session.get_controller(session.request.params.get('doctype'), 
		session.request.params.get('doctype') or session.request.params.get('name'))
	if session.request.params.get('parent'):
		doc = obj.doclist.get({ "name": session.request.params.get('name') })[0]
	else:
		doc = obj.doc
	
	doc[session.request.params.get('field')] = session.request.params.get('value')
	
	obj.save()
	
	return remove_nulls(doc)
	
	