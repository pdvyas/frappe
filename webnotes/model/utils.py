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
from webnotes.model.doc import Document
from webnotes import _, msgprint, DictObj
from webnotes.utils import getdate
"""
Model utilities, unclassified functions
"""

def expand(docs):
	"""
		Expand a doclist sent from the client side. (Internally used by the request handler)
	"""
	def xzip(a,b):
		d = {}
		for i in range(len(a)):
			d[a[i]] = b[i]
		return d

	from webnotes.utils import load_json

	docs = load_json(docs)
	clist = []
	for d in docs['values']:
		doc = xzip(docs['keys'][d[0]], d);
		clist.append(doc)
	return clist

def compress(doclist):
	"""
	   Compress a doclist before sending it to the client side. (Internally used by the request handler)

	"""
	docs = [hasattr(d, 'fields') and d.fields or d for d in doclist]
	
	kl, vl = {}, []
	forbidden = []

	# scan for keys & values
	for d in docs:
		dt = d['doctype']
		if not (dt in kl.keys()):
			kl[dt] = ['doctype','localname']

		for f in d.keys():
			if not (f in kl[dt]) and not (f in forbidden):
				# if key missing, then append
				kl[dt].append(f)

		# build values
		tmp = []
		for f in kl[dt]:
			v = d.get(f)
			if type(v)==long:
				v=int(v)
			tmp.append(v)

		vl.append(tmp)
	return {'values':vl,'keys':kl}


def getlist(doclist, field):
	"""
   Filter a list of records for a specific field from the full doclist

   Example::

     # find all phone call details
     dl = getlist(self.doclist, 'contact_updates')
     pl = []
     for d in dl:
       if d.type=='Phone':
         pl.append(d)
	"""
	from webnotes.utils import cint
	l = []
	for d in doclist:
		if d.parentfield == field:
			l.append(d)

	l.sort(lambda a, b: cint(a.idx) - cint(b.idx))

	return l

# Copy doclist
# ------------

def clone(source_doclist):
	""" Copy previous invoice and change dates"""
	from webnotes.model.doc import Document
	
	new_doclist = []
	new_parent = Document(fielddata = source_doclist.doc.fields.copy())
	new_parent.name = 'Temp/001'
	new_parent.fields['__islocal'] = 1
	new_parent.fields['docstatus'] = 0

	if new_parent.fields.has_key('amended_from'):
		new_parent.fields['amended_from'] = None
		new_parent.fields['amendment_date'] = None

	new_parent.save(1)

	new_doclist.append(new_parent)

	for d in source_doclist.doclist[1:]:
		newd = Document(fielddata = d.fields.copy())
		newd.name = None
		newd.fields['__islocal'] = 1
		newd.fields['docstatus'] = 0
		newd.parent = new_parent.name
		new_doclist.append(newd)
	
	doclistobj = webnotes.model_doclist(new_doclist)
	doclistobj.doc = new_doclist[0]
	doclistobj.doclist = new_doclist
	doclistobj.children = new_doclist[1:]
	doclistobj.save()
	return doclistobj

def getvaluelist(doclist, fieldname):
	"""
		Returns a list of values of a particualr fieldname from all Document object in a doclist
	"""
	l = []
	for d in doclist:
		l.append(d.fields[fieldname])
	return l

def _make_html(doc, link_list):

	from webnotes.utils import cstr
	out = '<table class="simpletable">'
	for k in doc.fields.keys():
		if k!='server_code_compiled':
			v = cstr(doc.fields[k])

			# link field
			if v and (k in link_list.keys()):
				dt = link_list[k]
				if isinstance(dt, basestring) and dt.startswith('link:'):
					dt = dt[5:]
				v = '<a href="index.cgi?page=Form/%s/%s">%s</a>' % (dt, v, v)

			out += '\t<tr><td>%s</td><td>%s</td></tr>\n' % (cstr(k), v)

	out += '</table>'
	return out

def check_duplicate(doclist, combination, key="item_code"):
	"""combination is a list of fieldnames"""
	existing = []
	for doc in doclist:
		match = [(doc.fields.get(field) or None) for field in combination]
		
		if match in existing:
			import webnotes.model.doctype
			from webnotes.utils import comma_or
			doctypelist = webnotes.model.doctype.get(doc.parenttype or doc.doctype)
			
			msgprint(_("""%(key_label)s %(key)s appears more than once.
				Please change atleast one of %(labels)s to continue \
				or remove the duplicate rows.""") % {
					"key_label": doctypelist.get_label(key, 
						parentfield=doc.parentfield or None),
					"key": doc.fields.get(key),
					"labels": comma_or([doctypelist.get_label(field,
						parentfield=doc.parentfield or None) for field in combination])
				}, raise_exception=1)
		else:
			existing.append(match)
	
def validate_condition(doclist, field, condition, expected_value):
	from webnotes.model.doclist import objectify
	
	if isinstance(doclist, (Document, dict)):
		doclist = [doclist]

	for doc in objectify(doclist):
		if not check(doc.fields.get(field), condition, expected_value):
			import webnotes.model.doctype
			
			msg = doc.idx and _("Row # %(idx)s: ") or ""
			
			if condition == "startswith":
				msg += _("""%(label)s should start with %(expected_value)s""")
			else:
				msg += _("""%(label)s should be %(condition)s %(expected_value)s""")
			
			label = webnotes.model.doctype.get(doc.parenttype or doc.doctype)\
				.get_label(field, parentfield=doc.parentfield or None)
			
			msgprint(msg % {"label": label, "condition": condition, 
				"expected_value": expected_value}, raise_exception=1)
	
def check(val1, condition, val2):
	"""
		check based on condition
			* val1 is the actual value
			* val2 is the one saved in filter
	"""
	import datetime
	if isinstance(val1, datetime.date) or isinstance(val2, datetime.date):
		val1 = getdate(val1)
		val2 = getdate(val2)

	if condition == 'in':
		return val1 in [v.strip() for v in val2.split(",")]
	elif condition == "startswith":
		return (val1 or "").startswith(val2)
	elif condition=='=':
		return val1 == val2
	elif condition=='>':
		return val1 > val2
	elif condition=='<':
		return val1 < val2
	elif condition=='>=':
		return val1 >= val2
	elif condition=='<=':
		return val1 <= val2
	elif condition=='!=':
		return val1 != val2
