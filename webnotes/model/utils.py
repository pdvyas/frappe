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
	for d in docs['_vl']:
		doc = xzip(docs['_kl'][d[0]], d);
		clist.append(doc)
	return clist

def compress(doclist):
	"""
	   Compress a doclist before sending it to the client side. (Internally used by the request handler)

	"""
	docs = [hasattr(d, 'fields') and d.fields or d for d in doclist]
	
	kl, vl = {}, []
	forbidden = ['server_code_compiled']

	# scan for keys & values
	for d in docs:
		dt = d['doctype']
		if not (dt in kl.keys()):
			kl[dt] = ['doctype','localname','__oldparent','__unsaved']	

		# add client script for doctype, doctype due to ambiguity
		if dt=='DocType' and '__client_script' not in kl[dt]: 
			kl[dt].append('__client_script')

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
	return {'_vl':vl,'_kl':kl}


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
	from webnotes.model.controller import Controller
	
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
	
	doclistobj = Controller()
	doclistobj.set_doclist(new_doclist)
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