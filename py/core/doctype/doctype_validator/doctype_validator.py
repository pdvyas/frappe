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
from webnotes.model.controller import DocListController

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
		no_duplicate(controller.doclist, d.unique_table_field, d['keys'].split('\n'))

_cached_link_docs = {}
def filter_link(doclist, link_filter, doctypelist):
	"""check if all the rules are valid"""
	import webnotes
	from webnotes.utils import convert_type
	
	def _get(doctype, name):
		global _cached_link_docs
		return _cached_link_docs.setdefault("%s:%s" % (doctype, name), 
			webnotes.conn.sql("""select * from `tab%s` 
				where name=%s""" % (doctype, '%s'), name, as_dict=1))
			
	def _check(doc):
		# docfield object of the link_field so we know the doctype
		link_df = doctypelist.get_field(link_filter.link_field, parentfield=link_filter.table_field or None)

		link_filter.value = link_filter.value.startswith('field:') \
			and doc.fields.get(link_filter.value[6:].strip()) or link_filter.value

		link_filter.value = convert_type(link_df, link_filter.value)
		
		if link_df.fieldtype == 'Int':
			link_filter.value = cint(link_filter.value)
		elif link_df.fieldtype in ('Float', 'Currency'):
			link_filter.value = flt(link_filter.value)
			

		# value set
		val = doc.get(link_filter.link_field)
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
			* val1 is the actual value
			* val2 is the one saved in filter
	"""
	if condition == 'in':
		return val1 in [v.strip() for v in val2.split(",")]
	elif condition == 'Begins With':
		return (val1 or '').startswith(val2)
	elif condition == 'Filled':
		return (val1 is not None and val1 != '') or False
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
			values.append(d.get(key))
				
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
	from webnotes.utils import cint, flt
	
	def _get_doclist(if_then):
		return doclist.get({"parentfield": _fvalue(if_then, "table_field")})
	
	def _get_field(if_then):
		return doctypelist.get_field(_fvalue(if_then, "field"),
			parentfield=_fvalue(if_then, "table_field") or None)
			
	def _check(doc, if_then):
		return check_filters(doc.get(_fvalue(if_then, "field")), 
			_fvalue(if_then, "condition"), _fvalue(if_then, "value"))
	
	def _fvalue(if_then, fname):
		return condition.get(if_then + "_" + fname)
		
	# filter records from doclist
	if_doclist = _get_doclist('if')
	then_doclist = _get_doclist('then')
	
	# convert type if Int, Float, Currency
	from webnotes.utils import convert_type
	if_field = _get_field("if")
	condition.if_value = convert_type(if_field, condition.if_value)
	
	then_field = _get_field("then")
	condition.then_value = convert_type(then_field, condition.then_value)
		
	# for each, check if "if" condition is true
	for if_doc in if_doclist:
		if _check(if_doc, 'if'):
			
			# for each, check if "then" condition is false
			for then_doc in then_doclist:
				if not _check(then_doc, 'then'):
					
					# get labels for displaying error message
					condition.update({
						"if_label": if_field.label,
						"then_label": then_field.label
					})
					
					webnotes.msgprint("""If "%(if_label)s" %(if_condition)s "%(if_value)s", 
						then "%(then_label)s" should be %(then_condition)s "%(then_value)s" """ \
						% condition, raise_exception=webnotes.ConditionalPropertyError)

class DocTypeValidator(DocListController):
	pass
	