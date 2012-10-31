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
from webnotes.utils import comma_and

def get_mapper_list(from_doctype, to_doctype=None):
	if to_doctype:
		condition = "from_doctype=%s and to_doctype=%s"
	else:
		condition = "from_doctype=%s"

	mapper_list = webnotes.conn.sql("""select name from `tabDocType Mapper`
		where %s and (ifnull(is_custom, 0) = 0 or ifnull(is_default, 0) = 1)
		order by is_custom asc, is_default desc""" % condition, 
		to_doctype and (from_doctype, to_doctype) or (from_doctype, ), as_dict=True)

	return mapper_list
	
def is_next_submitted(from_doctype, from_docname):
	"""for given doctype and docname, check if there exists a submitted record of a 
		mapped doctype"""
	from webnotes.modules import scrub
	mapper_list = get_mapper_list(from_doctype)
	if not mapper_list: return

	checked = []
	msg_list = []

	for mapper in mapper_list:
		mapper_doclist = webnotes.get_doclist("DocType Mapper", mapper.name)
		to_doctype = mapper_doclist[0].to_doctype
		to_doctypelist = webnotes.get_doctype(to_doctype)
		for mapping in mapper_doclist.get({"parentfield": "table_mapper_details"}):
			if mapping.to_table not in checked and mapping.to_field and \
					to_doctypelist.get({"doctype": "DocField", "parent": mapping.to_table,
					"fieldname": scrub(from_doctype)}):
				exists = webnotes.conn.sql("""select distinct parent from `tab%s` 
					where docstatus=1 and `%s`=%s""" % (mapping.to_table,
					scrub(from_doctype), "%s"), (from_docname, ))
				if exists:
					# store a message for given to doc
					msg_list.append(_("""Submitted %(to_doctype)s: "%(to_docname)s" 
						exists against %(from_doctype)s: "%(from_docname)s" """) % \
						{
							"to_doctype": _(to_doctype),
							"to_docname": comma_and([e["parent"] for e in exists]),
							"from_doctype": from_doctype,
							"from_docname": from_docname,
						})

					# since we have custom mappers, we don't want to check twice
					checked.append(mapping.to_table)

					# found - so just break
					break

	if msg_list:
		msgprint("""%s""" % "<br>".join(msg_list),
			raise_exception=webnotes.IntegrityError)
			
def get_conditions(mapper_list):
	condition_dict = {}

	for mapper in mapper_list:
		mapper_doclist = webnotes.get_doclist("DocType Mapper", mapper.name)

		# insert submit condition check
		if mapper_doclist[0].ref_doc_submitted:
			condition_dict["0-docstatus-docstatus"] = {
				"match_id": 0,
				"from_field": "docstatus",
				"to_field": "docstatus",
				"condition": "="
			}

		for field_map in mapper_doclist.get({"parentfield": "field_mapper_details"}):
			if field_map.condition:
				key = "%s-%s-%s" % (field_map.match_id, field_map.from_field,
					field_map.to_field)
				val = {
					"match_id": field_map.match_id,
					"from_field": field_map.from_field,
					"to_field": field_map.to_field,
					"condition": field_map.condition
				}
				condition_dict[key] = val
	
	return condition_dict

def validate_prev_doclist(from_doctype, to_doctype, to_doclist):
	from webnotes.model.utils import check
	from webnotes.modules import scrub

	mapper_list = get_mapper_list(from_doctype, to_doctype)
	if not mapper_list:
		webnotes.msgprint("""DocType Mapper not found for mapping 
			"%s" to "%s" """ % (from_doctype, to_doctype), raise_exception=NameError)

	condition_dict = get_conditions(mapper_list)
	mapper_doclist = webnotes.get_doclist("DocType Mapper", mapper_list[0]["name"])

	prev_doclist_cache = {}
	def get_prev_doclist(name):
		return prev_doclist_cache.setdefault(name, 
			webnotes.get_doclist(from_doctype, name))

	parent_validated = []
	def validate_prev_parent(prev_parent, parent):
		# validate a particular parent only once
		if prev_parent.name not in parent_validated:
			for condition in condition_dict.values():
				if condition.get("match_id") == 0:
					if not check(parent.get(condition.get("to_field")),
							condition.get("condition"),
							prev_parent.get(condition.get("from_field"))):
						msgprint(_("""%(to_field)s should be "%(condition)s"
							%(from_field)s of %(prev_doctype)s: "%(prev_docname)s" """) \
							% {
								"to_field": condition.get("to_field"),
								"condition": condition.get("condition"),
								"from_field": condition.get("from_field"),
								"prev_doctype": _(prev_parent.doctype),
								"prev_docname": prev_parent.name
							}, raise_exception=webnotes.IntegrityError)
			parent_validated.append(prev_parent.name)

	def validate_prev_children(prev_children, child, match_id):
		ref_detail_field = scrub(prev_children[0].doctype)
		prev_child = prev_children.get({"name": child.get(ref_detail_field)}, limit=1)
		if not prev_child:
			msgprint(_("""Equivalent entry of row # %(row)s does not exist in
				%(prev_parenttype)s: "%(prev_parent)s" """) % {
					"row": child.idx,
					"prev_parenttype": _(prev_children[0].parenttype),
					"prev_parent": prev_children[0].parent
				}, raise_exception=NameError)

		prev_child = prev_child[0]
		for condition in condition_dict.values():
			if condition.get("match_id") == match_id:
				if not check(child.get(condition.get("to_field")),
						condition.get("condition"),
						prev_child.get(condition.get("from_field"))):
					msgprint(_("""%(to_field)s of row # %(child_row)s 
						should be "%(condition)s" %(from_field)s in row #
						%(prev_child_row)s in %(prev_parenttype)s: "%(prev_parent)s" 
						""")  % {
							"to_field": _(webnotes.model.get_label(child.parent,
								condition.get("to_field"),
								parentfield=child.parentfield)),
							"child_row": child.idx,
							"condition": condition.get("condition"),
							"from_field": _(webnotes.model.get_label(
								prev_child.parent, condition.get("from_field"),
								parentfield=prev_child.parentfield)),
							"prev_child_row": prev_child.idx,
							"prev_parenttype": _(prev_child.parenttype),
							"prev_parent": prev_child.parent
						}, raise_exception=webnotes.IntegrityError)

	# for example: in purchase request items, sales_order is the ref_field
	ref_field = scrub(mapper_doclist[0].from_doctype)
	for mapping in mapper_doclist.get({"parentfield": "table_mapper_details"}):
		if mapping.from_field and mapping.to_field:
			# if condition exists for given match id
			if any((c.startswith(cstr(mapping.match_id)) for c in condition_dict)):
				# loop through children and check parent and child values
				for child in to_doclist.get({"parentfield": mapping.to_field}):
					if child.get(ref_field):
						prev_doclist = get_prev_doclist(child.get(ref_field))

						validate_prev_parent(prev_doclist[0], to_doclist[0])

						validate_prev_children(prev_doclist.get({
							"parentfield": mapping.from_field}), child, mapping.match_id)
