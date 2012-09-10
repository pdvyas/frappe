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

from webnotes.model.controller import DocListController

def validate(controller):
	"""validate doctype based on DocType Validator"""

	session = controller.session

	# load validators
	doctypelist = session.get_doctype(controller.doclist[0].doctype)
	
	# link field validators
	for d in doctypelist.get({"doctype":"DocType Link Filter"}):
		filter_link(session, controller.doclist, d, doctypelist)
	
	# if-then validators
	for d in doctypelist.get({"doctype":"DocType Conditional Property"}):
		check_condition(session, controller.doclist, d, doctypelist)
	
	# duplicate validators
	for d in doctypelist.get({"doctype":"DocType Unique Row"}):
		no_duplicate(session, controller.doclist, d.unique_table_field, d['keys'].split('\n'))

_cached_link_docs = {}
def filter_link(session, doclist, link_filter, doctypelist):
	"""check if all the rules are valid"""
	import webnotes
	from webnotes.utils import cast
	
	def _get(doctype, name):
		global _cached_link_docs
		return _cached_link_docs.setdefault("%s:%s" % (doctype, name), 
			session.db.sql("""select * from `tab%s` 
				where name=%s""" % (doctype, '%s'), name, as_dict=1))
			
	def _check(doc):
		# docfield object of the link_field so we know the doctype
		link_df = doctypelist.get_field(link_filter.link_field, parentfield=link_filter.table_field or None)

		link_filter.value = link_filter.value.startswith('field:') \
			and doc.fields.get(link_filter.value[6:].strip()) or link_filter.value

		link_filter.value = cast(link_df, link_filter.value)
		
		if link_df.fieldtype == 'Int':
			link_filter.value = cint(link_filter.value)
		elif link_df.fieldtype in ('Float', 'Currency'):
			link_filter.value = flt(link_filter.value)
			

		# value set
		val = doc.get(link_filter.link_field)
		if val:
			valdoc = _get(link_df.options, val)
			
			if not valdoc:
				session.msgprint("""%s: "%s" is not a valid "%s" """ % (link_df.label, val, 
					link_df.options), raise_exception=webnotes.InvalidLinkError)
					
			if not check(valdoc[0].get(link_filter.fieldname), link_filter.condition, 
					link_filter.value):
					
				# need this meta for the label
				linkdoctypelist = session.get_doctype(link_df.options)
				
				session.msgprint("""%s: "%s" must have "%s" %s "%s" """ % \
					(link_df.label, val, linkdoctypelist.get_label(link_filter.fieldname), 
						link_filter.condition, link_filter.value),
					raise_exception = webnotes.LinkFilterError) 
	
	if link_filter.table_field:
		for d in doclist.get({"parentfield":link_filter.table_field}):
			_check(d)
	else:
		_check(doclist[0])

def check(val1, condition, val2):
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
	

def no_duplicate(session, doclist, parentfield, keys):
	"""raise exception if duplicate entries are found"""
	import webnotes
	from webnotes.utils import comma_and
	
	all_values = []
	for d in doclist.get({"parentfield":parentfield}):
		values = []
		for key in keys:
			values.append(d.get(key))
				
		if values in all_values:
			doctypelist = session.get_doctype(d.doctype)
			labels = map(doctypelist.get_label, keys)
			session.msgprint("""Duplicate rows found in table %s 
				having same values for colums %s""" % (d.doctype, comma_and(labels)),
				raise_exception=webnotes.DuplicateEntryError)
				
		all_values.append(values)

def check_condition(session, doclist, condition, doctypelist):
	"""check if-then type of conditions"""
	import webnotes
	from webnotes.utils import cast
	def _getval1(_type, doc):
		# compare with the value in linked document's field
		field = condition.get(_type+"_field")
		parentfield = condition.get(_type+"_table_field") or None
		ref_field = condition.get(_type+"_reference_field")
		if ref_field:
			link_field_dt = doctypelist.get_options(field, parentfield=parentfield)
			val1 = session.get_doclist(link_field_dt, doc.get(field))[0].get(ref_field)
		else:
			val1 = doc.get(field)
		df = doctypelist.get_field(field, parentfield=parentfield)
		return cast(df, val1)
			
	
	def _getval2(_type, idoc, tdoc=None):
		parentfield = condition.get(_type+"_table_field") or None
		field = condition.get(_type+"_field")
		val2 = condition.get(_type+"_value")
		
		# if the value is specified as field:if/then:fieldname
		if (val2 or "").startswith("field:"):
			try:
				ref, ref_field = val2[6:].split(".")
				if ref == "if":
					return cast(doctypelist.get_field(ref_field,
						parentfield=idoc.parentfield or None), idoc.get(ref_field))
				elif ref == "then":
					return cast(doctypelist.get_field(ref_field,
						parentfield=tdoc.parentfield or None), tdoc.get(ref_field))
				else:
					raise ValueError
			except ValueError, e:
				# for development
				# looks like the if or then part is missing!
				session.msgprint("""Invalid field specified in 
					Conditional Property # %d of DocType Validator: %s""" % \
					(condition.idx, doclist[0].doctype),
					raise_exception=webnotes.ConditionalPropertyError)
		else:
			return cast(doctypelist.get_field(field, parentfield=parentfield), val2)
	
	def _raise_error(idoc, tdoc):
		ifield = doctypelist.get_label(condition.if_field, 
			parentfield=condition.if_table_field or None)
		tfield = doctypelist.get_label(condition.then_field,
			parentfield=condition.then_table_field or None)
		ival = condition.get("if_value")
		tval = condition.get("then_value")
			
		def _get_ref_msg(_type):
			doc = _type=="if" and idoc or tdoc
			field = condition.get(_type+"_field")
			parentfield = condition.get(_type+"_table_field") or None
			field_label = doctypelist.get_label(condition.if_field,
				parentfield=condition.if_table_field or None)
			ref_field_label = webnotes.model.get_doctype(doctypelist.get_options(field,
				parentfield=parentfield)).get_label(condition.if_reference_field)
			return """%s [%s], %s""" % (field_label, doc.get(condition.if_field),
				ref_field_label)
				
		def _get_field_msg(_type):
			condition_type, field = condition.get(_type+"_value")[6:].split(".")
			parentfield = condition.get(_type+"_table_field") or None
			field_label = doctypelist.get_label(field, parentfield=parentfield)
			doc = condition_type=="if" and idoc or tdoc
			return """%s [%s]""" % (field_label, doc.get(field))
			
		if condition.if_reference_field:
			ifield = _get_ref_msg("if")
		if (condition.if_value or "").startswith("field:"):
			ival = _get_field_msg("if")
		if condition.then_reference_field:
			tfield = _get_ref_msg("then")
		if (condition.then_value or "").startswith("field:"):
			tval = _get_field_msg("then")
		
		# hopefully, an elaborate message!
		session.msgprint("""%(if)s %(ifield)s %(icond)s%(ival)s,
			%(then)s %(tfield)s %(should_be)s %(tcond)s%(tval)s""" % {
				"if": webnotes._("if"),
				"ifield": ifield,
				"icond": condition.if_condition,
				"ival": ival and " "+ival or "",
				"then": webnotes._("then"),
				"tfield": tfield,
				"should_be": webnotes._("should be"),
				"tcond": condition.then_condition,
				"tval": tval and " "+tval or "",
			}, raise_exception=webnotes.ConditionalPropertyError)
	
	if_doclist = doclist.get({"parentfield": condition.if_table_field or None})
	then_doclist = doclist.get({"parentfield": condition.then_table_field or None})

	for idoc in if_doclist:
		# check if "if" part of the condition is true
		ival1 = _getval1("if", idoc)
		ival2 = _getval2("if", idoc)
		if check(ival1, condition.if_condition, ival2):
			for tdoc in then_doclist:
				# check if "then" part of the condition is false
				tval1 = _getval1("then", tdoc)
				tval2 = _getval2("then", idoc, tdoc)
				if not check(tval1, condition.then_condition, tval2):
					_raise_error(idoc, tdoc)

class DocTypeValidator(DocListController):
	pass
	