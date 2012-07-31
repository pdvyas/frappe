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

from webnotes.model.doclist import DocListController

def validate(controller):
	"""validate doctype based on DocType Validator"""
	import webnotes.model
	
	# load validators
	doctypelist = webnotes.model.get_doctype(controller.doclist[0].doctype)
	
	# link field validators
	for d in doctypelist.get({"doctype":"DocType Link Filter"}):
		filter_link(controller.doclist, d, doctypelist)
	
	# if-then validators
	for d in doctypelist.get({"doctype":"DocType Conditional Property"}):
		check_condition(controller.doclist, d, doctypelist)
	
	# duplicate validators
	for d in doctypelist.get({"doctype":"DocType Unique Row"}):
		no_duplicate(controller.doclist, d.unique_table_field, d.keys.split('\n'))

_cached_link_docs = {}
def filter_link(doclist, link_filter, doctypelist):
	"""check if all the rules are valid"""
	import webnotes
	def _get(doctype, name):
		global _cached_link_docs
		return _cached_link_docs.setdefault("%s:%s" % (doctype, name), 
			webnotes.conn.sql("""select * from `tab%s` 
				where name=%s""" % (doctype, '%s'), name, as_dict=1))
			
	def _check(doc):
		# docfield object of the link_field so we know the doctype
		link_df = doctypelist.get_field(link_filter.link_field, parentfield=link_filter.table_field or None)

		# value set
		val = doc.fields.get(link_filter.link_field)
		if val:
			valdoc = _get(link_df.options, val)
			
			if not valdoc:
				webnotes.msgprint("""%s: "%s" is not a valid "%s" """ % (link_df.label, val, 
					link_df.options), raise_exception=webnotes.InvalidLinkError)
			
			if not check_filters(valdoc[0].get(link_filter.fieldname), link_filter.condition, 
					link_filter.value):
					
				# need this meta for the label
				linkdoctypelist = webnotes.model.get_doctype(link_df.options)
				
				webnotes.msgprint("""%s: "%s" must have "%s" %s "%s" """ % \
					(link_df.label, val, linkdoctypelist.get_label(link_filter.fieldname), 
						link_filter.condition, link_filter.value),
					raise_exception = webnotes.LinkFilterError) 
	
	if link_filter.table_field:
		for d in doclist.get({"parentfield":link_filter.table_field}):
			_check(d)
	else:
		_check(doclist[0])

def check_filters(val1, condition, val2):
	"""
		check based on condition
		val1 is the actual value
		val2 is the one saved in filter
	"""
	if condition == 'in':
		return val1 in [v.strip() for v in val2.split(",")]
	elif condition == 'Begins With':
		return (val1 or '').startswith(val2)
	elif condition == 'Filled':
		return val1 or False
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
	

def no_duplicate(doclist, parentfield, keys):
	"""raise exception if duplicate entries are found"""

	import webnotes.model
	import webnotes
	
	all_values = []
	for d in doclist.get({"parentfield":parentfield}):
		values = []
		for key in keys:
			values.append(d.fields.get(key))
				
		if values in all_values:
			doctypelist = webnotes.model.get_doctype(d.doctype)
			labels = map(doctypelist.get_label, keys)
			webnotes.msgprint("""Duplicate rows found in table %s 
				having same values for colums %s""" % (d.doctype, webnotes.comma_and(labels)),
				raise_exception=webnotes.DuplicateEntryError)
				
		all_values.append(values)

def check_condition(doclist, condition, doctypelist):
	"""check if-then type of conditions"""
	import webnotes
	
	def _get_doclist(ctype):
		return doclist.get({"parentfield": condition.fields[_fname(ctype, "table_field")]})
	
	def _get_label(ctype):
		return doctypelist.get_field(condition.fields[_fname(ctype, "field")],
			parentfield=condition.fields[_fname(ctype, "table_field")] or None).label
			
	def _check(doc, ctype):
		return check_filters(doc.fields.get(condition.fields[_fname(ctype, "field")]),
			condition.fields[_fname(ctype, "condition")], condition.fields[_fname(ctype, "value")])
	
	def _fname(ctype, fname):
		return ctype + "_" + fname
		
	if_doclist = _get_doclist('if')
	then_doclist = _get_doclist('then')

	# for each, check if "if" condition is true
	for if_doc in if_doclist:
		if _check(if_doc, 'if'):
			
			# for each, check if "then" condition is false
			for then_doc in then_doclist:
				if not _check(then_doc, 'then'):
					
					# get labels for displaying error message
					condition.fields.update({
						"if_label": _get_label("if"),
						"then_label": _get_label("then")
					})
					
					webnotes.msgprint("""If "%(if_label)s" %(if_condition)s "%(if_value)s", 
						then "%(then_label)s" should be %(then_condition)s "%(then_value)s" """ \
						% condition.fields, raise_exception=webnotes.ConditionalPropertyError)

class DocType:
	def __init__(self, d, dl):
		self.doc, self.doclist = d, dl

class DocTypeValidator(DocListController):
	pass
	