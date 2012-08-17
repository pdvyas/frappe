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

# model __init__.py
from __future__ import unicode_literals
import webnotes

no_value_fields = ['Section Break', 'Column Break', 'HTML', 'Table', 'FlexTable', 'Button', 'Image', 'Graph']
default_fields = ['doctype','name','owner','creation','modified','modified_by','parent','parentfield','parenttype','idx','docstatus']

def get(doctype, name):
	"""returns doclist identified by name, from table indicated by doctype, with its children"""
	return get_controller(doctype, name).doclist
	
def get_doctype(doctype, processed=False):
	"""returns doclist identified by doctype, from tabDocType with its children"""
	import webnotes.model.doctype
	return webnotes.model.doctype.get(doctype, processed)

def insert(doclist):
	"""insert a new doclist"""
	if doclist and isinstance(doclist, dict):
		doclist = [doclist]
	
	doclistcon = get_controller(doclist)
	for d in doclistcon.doclist:
		d["__islocal"] = 1
	doclistcon.save()

	# can be used to retrieve name or any value after save
	return doclistcon
	
def insert_variants(base, variants):
	for v in variants:
		base_copy = base.copy()
		base_copy.update(v)
		insert(base_copy)

def insert_child(fields):
	"""insert a child, must specify parent, parenttype and doctype"""

	# load parent
	parent = get_controller(fields['parenttype'], fields['parent'])

	# make child
	parent.add_child(fields)

	# save
	parent.save()

controllers = {}
def get_controller(doctype, name=None):
	"""return controller object"""
	global controllers
	
	doclist = doctype
	if isinstance(doctype, list):
		doctype = doclist[0]['doctype']
	
	# return if already loaded
	if doctype in controllers:
		return controllers[doctype](doclist, name)

	import os
	from webnotes.modules import get_module_path, scrub
	from webnotes.model.controller import DocListController		

	module_name = doctype in ["DocType", "DocField", "Custom Field", "DocPerm"] and "core" \
		or get_doctype(doctype)[0].module
	module_path = os.path.join(get_module_path(module_name),
		'doctype', scrub(doctype), scrub(doctype)+'.py')
	# check if path exists
	if os.path.exists(module_path):
		module = __import__(scrub(module_name) + '.doctype.' + scrub(doctype) + '.' \
			+ scrub(doctype), fromlist = [scrub(doctype).encode("utf-8")])

		# find controller in module
		import inspect
		for attr in dir(module):
			attrobj = getattr(module, attr)
			if inspect.isclass(attrobj) and attr.startswith(doctype.replace(' ', '').replace('-', '')) \
				and issubclass(attrobj, DocListController):
				controllers[doctype] = attrobj
				return attrobj(doclist, name)
	
	# vanilla controller
	return DocListController(doclist, name)
	
def check_if_doc_is_linked(dt, dn):
	"""
		Raises excption if the given doc(dt, dn) is linked in another record.
	"""
	sql = webnotes.conn.sql

	ll = get_link_fields(dt)
	for l in ll:
		link_dt, link_field = l
		issingle = sql("select issingle from tabDocType where name = '%s'" % link_dt)

		# no such doctype (?)
		if not issingle: continue
		
		if issingle[0][0]:
			item = sql("select doctype from `tabSingles` where field='%s' and value = '%s' and doctype = '%s' " % (link_field, dn, l[0]))
			if item:
				webnotes.msgprint("Cannot delete %s <b>%s</b> because it is linked in <b>%s</b>" % (dt, dn, item[0][0]), raise_exception=1)
			
		else:
			item = None
			try:
				item = sql("select name, parent, parenttype from `tab%s` where `%s`='%s' and docstatus!=2 limit 1" % (link_dt, link_field, dn))
			except Exception, e:
				if e.args[0]==1146: pass
				else: raise e
			if item:
				webnotes.msgprint("Cannot delete %s <b>%s</b> because it is linked in %s <b>%s</b>" % (dt, dn, item[0][2] or link_dt, item[0][1] or item[0][0]), raise_exception=1)

@webnotes.whitelist()
def delete_doc(doctype=None, name=None, doclist = None, force=0):
	"""
		Deletes a doc(dt, dn) and validates if it is not submitted and not linked in a live record
	"""
	import webnotes.model.meta
	sql = webnotes.conn.sql

	# get from form
	if not doctype:
		doctype = webnotes.form_dict.get('dt')
		name = webnotes.form_dict.get('dn')
	
	if not doctype:
		webnotes.msgprint('Nothing to delete!', raise_exception =1)

	# already deleted..?
	if not webnotes.conn.exists(doctype, name):
		return

	tablefields = webnotes.model.meta.get_table_fields(doctype)
	
	# check if submitted
	d = webnotes.conn.sql("select docstatus from `tab%s` where name=%s" % (doctype, '%s'), name)
	if d and int(d[0][0]) == 1:
		webnotes.msgprint("Submitted Record '%s' '%s' cannot be deleted" % (doctype, name))
		raise Exception
	
	# call on_trash if required
	from webnotes.model.code import get_obj
	if doclist:
		obj = get_obj(doclist=doclist)
	else:
		obj = get_obj(doctype, name)

	if hasattr(obj,'on_trash'):
		obj.on_trash()
	
	if doctype=='DocType':
		webnotes.conn.sql("delete from `tabCustom Field` where dt = %s", name)
		webnotes.conn.sql("delete from `tabCustom Script` where dt = %s", name)
		webnotes.conn.sql("delete from `tabProperty Setter` where doc_type = %s", name)
		webnotes.conn.sql("delete from `tabSearch Criteria` where doc_type = %s", name)

	# check if links exist
	if not force:
		check_if_doc_is_linked(doctype, name)

	# remove tags
	from webnotes.widgets.tags import clear_tags
	clear_tags(doctype, name)
	
	try:
		webnotes.conn.sql("delete from `tab%s` where name='%s' limit 1" % (doctype, name))
		for t in tablefields:
			webnotes.conn.sql("delete from `tab%s` where parent = %s" % (t[0], '%s'), name)
	except Exception, e:
		if e.args[0]==1451:
			webnotes.msgprint("Cannot delete %s '%s' as it is referenced in another record. You must delete the referred record first" % (doctype, name))
		
		raise e
		
	return 'okay'

def get_search_criteria(dt):
	import webnotes.model.doc
	# load search criteria for reports (all)
	dl = []
	try: # bc
		sc_list = webnotes.conn.sql("select name from `tabSearch Criteria` where doc_type = '%s' or parent_doc_type = '%s' and (disabled!=1 OR disabled IS NULL)" % (dt, dt))
		for sc in sc_list:
			dl += webnotes.model.doc.get('Search Criteria', sc[0])
	except Exception, e:
		pass # no search criteria
	return dl
	
def get_link_fields(dt):
	"""
		Returns linked fields for dt as a tuple of (linked_doctype, linked_field)
	"""
	import webnotes.model.rename_doc
	link_fields = webnotes.model.rename_doc.get_link_fields(dt)
	link_fields = [[lf['parent'], lf['fieldname']] for lf in link_fields]
	return link_fields

def is_single(doctype):
	"""used in doc.py"""
	from webnotes.utils import cint
	return cint(webnotes.conn.get_value("DocType", doctype, "issingle"))
	
def get_table_fields(doctype):
	table_fields = webnotes.conn.sql("""select options, fieldname from `tabDocField`
		where parent = %s and fieldtype='Table'""", doctype, as_dict=1)
	custom_table_fields = webnotes.conn.sql("""select options, fieldname from `tabCustom Field`
		where dt = %s and fieldtype='Table'""", doctype, as_dict=1)
	return (table_fields or []) + (custom_table_fields or [])
	
def clear_recycle_bin():
	"""
		Clears temporary records that have been deleted
	"""
	sql = webnotes.conn.sql

	tl = sql('show tables')
	total_deleted = 0
	for t in tl:
		fl = [i[0] for i in sql('desc `%s`' % t[0])]
		
		if 'name' in fl:
			total_deleted += sql("select count(*) from `%s` where name like '__overwritten:%%'" % t[0])[0][0]
			sql("delete from `%s` where name like '__overwritten:%%'" % t[0])

		if 'parent' in fl:	
			total_deleted += sql("select count(*) from `%s` where parent like '__oldparent:%%'" % t[0])[0][0]
			sql("delete from `%s` where parent like '__oldparent:%%'" % t[0])
	
			total_deleted += sql("select count(*) from `%s` where parent like 'oldparent:%%'" % t[0])[0][0]
			sql("delete from `%s` where parent like 'oldparent:%%'" % t[0])

			total_deleted += sql("select count(*) from `%s` where parent like 'old_parent:%%'" % t[0])[0][0]
			sql("delete from `%s` where parent like 'old_parent:%%'" % t[0])

	webnotes.msgprint("%s records deleted" % str(int(total_deleted)))
