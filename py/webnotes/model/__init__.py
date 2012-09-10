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
from webnotes.utils import cint, remove_nulls
no_value_fields = ['Section Break', 'Column Break', 'HTML', 'Table', 'FlexTable', 'Button', 'Image', 'Graph']
default_fields = ['doctype','name','owner','creation','modified','modified_by','parent','parentfield','parenttype','idx','docstatus']

def get_fieldnames(session, doctype, filters=None, additional_fields=None):
	if not filters: filters = {}
	if not additional_fields: additional_fields = default_fields
	
	filters.update({"fieldtype": ["not in", no_value_fields]})
	return get_doctype(doctype).get_fieldnames(filters) + additional_fields
	
	
def insert_variants(session, base, variants):
	for v in variants:
		base_copy = base.copy()
		base_copy.update(v)
		insert(session, base_copy)
		
def insert_test_data(session, doctype, sort_fn=None):
	from webnotes.modules.export import get_test_doclist
	data = get_test_doclist(doctype)
	if sort_fn:
		data = sorted(data, key=sort_fn)
	
	for doclist in data:
		insert(session, doclist)

def insert_child(fields):
	"""insert a child, must specify parent, parenttype and doctype"""
	parent = get_controller(fields['parenttype'], fields['parent'])
	parent.add_child(fields)
	parent.save()

@webnotes.whitelist()
def map_doc(from_doctype, to_doctype, from_docname):
	from core.doctype.doctype_mapper.doctype_mapper import map_doc
	return map_doc(from_doctype, to_doctype, from_docname)
	
def check_if_doc_is_linked(dt, dn):
	"""
		Raises excption if the given doc(dt, dn) is linked in another record.
	"""
	sql = webnotes.conn.sql

	ll = get_link_fields(dt)
	for l in ll:
		link_dt, link_field = l
		issingle = sql("select issingle from tabDocType where name = '%s'" % link_dt, as_dict=False)

		# no such doctype (?)
		if not issingle: continue
		
		if issingle[0][0]:
			item = sql("select doctype from `tabSingles` where field='%s' and value = '%s' and doctype = '%s' " % (link_field, dn, l[0]), as_dict=False)
			if item:
				webnotes.msgprint("Cannot delete %s <b>%s</b> because it is linked in <b>%s</b>" % (dt, dn, item[0][0]), raise_exception=1)
			
		else:
			item = None
			try:
				item = sql("select name, parent, parenttype from `tab%s` where `%s`='%s' and docstatus!=2 limit 1" % (link_dt, link_field, dn), as_dict=False)
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
	sql = webnotes.conn.sql

	# get from form
	if not doctype:
		doctype = webnotes.form.get('dt')
		name = webnotes.form.get('dn')
	
	if not doctype:
		webnotes.msgprint('Nothing to delete!', raise_exception =1)

	# already deleted..?
	if not webnotes.conn.exists(doctype, name):
		return

	tablefields = get_table_fields(doctype)
	
	# check if submitted
	d = webnotes.conn.sql("select docstatus from `tab%s` where name=%s" % \
		(doctype, '%s'), name, as_dict=False)
	if d and cint(d[0][0]) == 1:
		webnotes.msgprint("Submitted Record '%s' '%s' cannot be deleted" % (doctype, name))
		raise Exception
	
	# call on_trash if required
	if doclist:
		get_controller(doclist).run("on_trash")
	else:
		get_controller(doctype, name).run("on_trash")
	
	if doctype=='DocType':
		webnotes.conn.sql("delete from `tabCustom Field` where dt = %s", name)
		webnotes.conn.sql("delete from `tabCustom Script` where dt = %s", name)
		webnotes.conn.sql("delete from `tabProperty Setter` where doc_type = %s", name)
		webnotes.conn.sql("delete from `tabSearch Criteria` where doc_type = %s", name)

	# check if links exist
	if not force:
		check_if_doc_is_linked(doctype, name)

	# TODO: implement clear_tags
	# remove tags
	# from webnotes.widgets.tags import clear_tags
	# 	clear_tags(doctype, name)
	
	try:
		webnotes.conn.sql("delete from `tab%s` where name='%s' limit 1" % (doctype, name))
		for t in tablefields:
			webnotes.conn.sql("delete from `tab%s` where parent = %s" % (t['options'],
				'%s'), name)
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
		sc_list = webnotes.conn.sql("select name from `tabSearch Criteria` where doc_type = '%s' or parent_doc_type = '%s' and (disabled!=1 OR disabled IS NULL)" % (dt, dt), as_dict=False)
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
	
def get_parent_dt(dt):
	"""get first parent table of this table"""
	parent_dt = webnotes.conn.sql("""select parent from tabDocField 
		where fieldtype="Table" and options="%s" and (parent not like "old_parent:%%") 
		limit 1""" % dt)
	return parent_dt and parent_dt[0].parent or ''
