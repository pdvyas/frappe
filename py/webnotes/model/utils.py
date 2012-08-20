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

def rename(doctype, old, new):
	import webnotes.utils
	import webnotes.model.doctype
	from webnotes.model.code import get_obj
	
	doctypelist = webnotes.model.doctype.get(doctype)

	# call on_rename method if exists
	obj = get_obj(doctype, old)
	hasattr(obj, 'on_rename') and obj.on_rename(new, old)
	
	# rename main doc
	webnotes.conn.sql("""update `tab%s` set name=%s where name=%s""" % (doctype, '%s', '%s'),
		(new, old))
	
	# rename children
	for d in doctypelist.get({"fieldtype":"Table"}):
		webnotes.conn.sql("""update `tab%s` set parent=%s where parent=%s""" % (d.options, '%s', '%s'),
			(new, old))
	
	# renamed linked
	rename_links(doctype, old, new)
	
def rename_links(doctype, old, new):
	import webnotes.model.doctype
	
	for dt in webnotes.conn.sql("""select name from tabDocType"""):
		link_fields = webnotes.model.doctype.get_link_fields(dt[0])
		for df in link_fields.get({"options":doctype}).extend(\
			link_fields.get({"options":"link:" + doctype})):
			
			if webnotes.model.doctype.get_property(dt[0], 'issingle'):
				webnotes.conn.sql("""update `tabSingles` set `value`=%s 
					where doctype=%s and field=%s and `value`=%s""",
					(new, dt[0], df.fieldname, old))
			else:
				webnotes.conn.sql("""update `tab%s` set `%s`=%s where `%s`=%s""" % \
					(df.parent, df.fieldname, '%s', df.fieldname, '%s'),
					(new, old))
				
		

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
	if doclist and hasattr(doclist[0],'fields'):
		docs = [d for d in doclist]
	else:
		docs = doclist

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
	#errprint(str({'_vl':vl,'_kl':kl}))
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
		if d.parent and (not d.parent.lower().startswith('old_parent:')) and d.parentfield == field:
			l.append(d)

	l.sort(lambda a, b: cint(a.idx) - cint(b.idx))

	return l

def commonify_doclist(doclist, with_comments=1):
	"""
		Makes a doclist more readable by extracting common properties.
		This is used for printing Documents in files
	"""
	from webnotes.utils import get_common_dict, get_diff_dict

	def make_common(doclist):
		c = {}
		if with_comments:
			c['##comment'] = 'These values are common in all dictionaries'
		for k in common_keys:
			c[k] = doclist[0][k]
		return c

	def strip_common_and_idx(d):
		for k in common_keys:
			if k in d: del d[k]
			
		if 'idx' in d: del d['idx']
		return d

	def make_common_dicts(doclist):

		common_dict = {} # one per doctype

		# make common dicts for all records
		for d in doclist:
			if not d['doctype'] in common_dict:
				d1 = d.copy()
				del d1['name']
				common_dict[d['doctype']] = d1
			else:
				common_dict[d['doctype']] = get_common_dict(common_dict[d['doctype']], d)
		return common_dict

	common_keys = ['owner','docstatus','creation','modified','modified_by']
	common_dict = make_common_dicts(doclist)

	# make docs
	final = []
	for d in doclist:
		f = strip_common_and_idx(get_diff_dict(common_dict[d['doctype']], d))
		f['doctype'] = d['doctype'] # keep doctype!

		# strip name for child records (only an auto generated number!)
		if f['doctype'] != doclist[0]['doctype']:
			del f['name']

		if with_comments:
			f['##comment'] = d['doctype'] + ('name' in f and (', ' + f['name']) or '')
		final.append(f)

	# add commons
	commons = []
	for d in common_dict.values():
		d['name']='__common__'
		if with_comments:
			d['##comment'] = 'These values are common for all ' + d['doctype']
		commons.append(strip_common_and_idx(d))

	common_values = make_common(doclist)
	return [common_values]+commons+final

def uncommonify_doclist(dl):
	"""
		Expands an commonified doclist
	"""
	# first one has common values
	common_values = dl[0]
	common_dict = {}
	final = []
	idx_dict = {}

	for d in dl[1:]:
		if 'name' in d and d['name']=='__common__':
			# common for a doctype - 
			del d['name']
			common_dict[d['doctype']] = d
		else:
			dt = d['doctype']
			if not dt in idx_dict: idx_dict[dt] = 1;
			d1 = common_values.copy()

			# update from common and global
			d1.update(common_dict[dt])
			d1.update(d)

			# idx by sequence
			d1['idx'] = idx_dict[dt]
			
			# increment idx
			idx_dict[dt] += 1

			final.append(d1)

	return final

def pprint_doclist(doclist, with_comments = 1):
	"""
		Pretty Prints a doclist with common keys separated and comments
	"""
	from webnotes.utils import pprint_dict

	dictlist =[pprint_dict(d) for d in commonify_doclist(doclist, with_comments)]
	title = '# '+doclist[0]['doctype']+', '+doclist[0]['name']
	return title + '\n[\n' + ',\n'.join(dictlist) + '\n]'

def peval_doclist(txt):
	"""
		Restore a pretty printed doclist
	"""
	doclist = eval(txt)
	
	if txt.startswith('#'):
		return uncommonify_doclist(doclist)
	else:
		return doclist