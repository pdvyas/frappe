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
import webnotes.model.doc
from webnotes.utils import cstr

class DocList(list):
	"""DocList object as a wrapper around a list"""
	def get(self, filters, max=0):
		"""pass filters as:
			{"key":"val", "key":"!val", "key": "^val", "key": "[val]", "key": "![val]" }"""
		out = []
		for d in self:
			add = True
			for f in filters:
				fval = filters[f]
				if cstr(fval).startswith('['):
					if d.get(f) not in [v.strip() for v in fval[1:-1].split(",")]:
						add = False
						break
				if cstr(fval).startswith('!['):
					if d.get(f) in [v.strip() for v in fval[2:-1].split(",")]:
						add = False
						break
				if cstr(fval).startswith('!'): 
					if d.get(f) == fval[1:]:
						add = False
						break
				if cstr(fval).startswith('^'):
					if not (d.get(f) or '').startswith(fval[1:]):
						add = False
						break
				elif d.get(f)!=fval:
					add = False
					break

			if add: 
				out.append(d)
				if max and len(out)-1==max:
					break
		return DocList(out)

	def getone(self, filters):
		return self.get(filters, max=1)[0]

	def extend(self, n):
		list.extend(self, n)
		return self


def load_doclist(doctype, name):
	# load main doc
	doclist = [load_main(doctype, name)]
	
	# load children
	table_fields = map(lambda f: (f.options, name, f.fieldname, doctype),
		webnotes.model.get_table_fields(doctype))

	for args in table_fields:
		children = load_children(*args)
		if children: doclist += children

	return objectify_doclist(doclist)

def load_main(doctype, name):
	"""retrieves doc from database"""
	if webnotes.model.is_single(doctype):
		doc = webnotes.conn.sql("""select field, value from `tabSingles`
			where doctype=%s""", doctype)
		doc = dict(doc)
	else:
		doc  = webnotes.conn.sql("""select * from `tab%s` where name = %s""" % \
			(doctype, "%s"), name, as_dict=1)
		if not doc:
			webnotes.msgprint("""%s: "%s" does not exist""" % (doctype, name),
				raise_exception=NameError)
		doc = doc[0]

	doc["doctype"] = doctype
	return doc

def load_children(options, parent, parentfield, parenttype):
	"""load children based on options, parentfield, parenttype and parent"""
	options = options.split("\n")[0].strip()
		
	return webnotes.conn.sql("""select *, "%s" as doctype from `tab%s` where parent = %s 
		and parentfield = %s and parenttype = %s""" % (options, options, "%s", "%s", "%s"),
		(parent, parentfield, parenttype), as_dict=1)
		
def objectify_doclist(doclist):
	doclist_obj = DocList([])
	for d in doclist:
		if isinstance(d, webnotes.model.doc.Document):
			doclist_obj.append(d)
		else:
			doclist_obj.append(webnotes.model.doc.Document(fielddata = d))
	return doclist_obj
