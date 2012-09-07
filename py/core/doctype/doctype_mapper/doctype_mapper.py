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
import webnotes, webnotes.model
from webnotes.utils import cint, cstr
from webnotes import _, msgprint
from webnotes.model.controller import DocListController

class DocTypeMapperController(DocListController):
	def autoname(self):
		if not self.doc.name:
			# TODO: check if already exists, then increase count by 1
			self.doc.name = "%s-%s" % (self.doc.from_doctype,
				self.doc.to_doctype)

	def validate(self):
		if not getattr(webnotes, 'syncing', False):
			self.check_fields()
		
	def on_update(self):
		self.export()
		if self.doc.is_custom:
			self.set_as_default({"from_doctype": self.doc.from_doctype,
				"to_doctype": self.doc.to_doctype, "is_custom[0]": 1})
		
	def check_fields(self):
		def _warn(fieldname, doctype):
			webnotes.msgprint("""Field: "%s" does not exist in DocType: "%s"
				""" % (fieldname, doctype))
				
		def _validate(from_table, to_table, match_id):
			from_fields = self.get_fieldnames(from_table)
			to_fields = self.get_fieldnames(to_table)

			for field_map in self.doclist.get({"parentfield": "field_mapper_details"}):
				if field_map.match_id == match_id:
					if field_map.from_field not in from_fields:
						_warn(field_map.from_field, from_table)
					elif field_map.to_field not in to_fields:
						_warn(field_map.to_field, to_table)
		
		# validate parent
		_validate(self.doc.from_doctype, self.doc.to_doctype, 0)
		
		# validate children
		for table_map in self.doclist.get({"parentfield": "table_mapper_details"}):
			_validate(table_map.from_table, table_map.to_table, table_map.match_id)
	
	def get_fieldnames(self, doctype, filters=None):
		"""get fieldnames excluding default fields and no value fields"""
		doctypelist = webnotes.model.get_doctype(doctype)
		
		if not filters: filters = {}
		filters.update({
			"fieldtype": ["not in", webnotes.model.no_value_fields],
			"fieldname": ["not in", webnotes.model.default_fields],
		})
		
		return doctypelist.get_fieldnames(filters)
		
	def map(self, from_doclist, newcon=None):
		if isinstance(from_doclist, basestring):
			from_doclist = webnotes.model.get(self.doc.from_doctype, from_doclist)
		
		# check if submitted
		self.is_submitted(from_doclist)
		
		# get controller with new doclist
		if not newcon:
			newcon = webnotes.model.get_controller([{"doctype": self.doc.to_doctype}])
		
		# map parent
		newcon.doc.update(self._map_fields(0, from_doclist[0], self.doc.to_doctype))
		
		# map children
		for tab in self.doclist.get({"parentfield": "table_mapper_details"}):
			if not tab.to_field: continue
			for doc in from_doclist.get({"parentfield": tab.from_field}):
				newcon.add_child(self._map_fields(tab.match_id, doc, 
					tab.to_table, tab.to_field))
		
		return from_doclist, newcon
			
	def _map_fields(self, match_id, from_doc, to_doctype, parentfield=None):
		# fields except no copy fields
		to_fieldnames = self.get_fieldnames(to_doctype, {"no_copy": ["!=", 1]})
		
		# map matching fields
		new_doc = dict([[key, from_doc[key]] for key in from_doc
			if key in to_fieldnames])
			
		# map specified fields
		field_mappings = map(lambda d: [d.from_field, d.to_field, d.map], 
			self.doclist.get({"parentfield": "field_mapper_details",
			"match_id": match_id}))
		for src, dest, to_map in field_mappings:
			if to_map and to_map == "No" and dest in new_doc:
				del new_doc[dest]
			elif src.startswith("eval:"):
				# this is evil
				doc = from_doc
				new_doc[dest] = eval(src[5:])
			else:
				new_doc[dest] = from_doc[src]
		
		# default properties
		new_doc["__islocal"] = 1
		new_doc["doctype"] = to_doctype
		if parentfield:
			new_doc["parentfield"] = parentfield
			
			# save previous doc link
			from webnotes.modules import scrub
			new_doc[scrub(self.doc.from_doctype)] = from_doc.parent
			new_doc[scrub(from_doc.doctype)] = from_doc.name
		
		return new_doc
	
	def is_submitted(self, from_doclist):
		if cint(self.doc.ref_doc_submitted) and from_doclist[0].docstatus != 1:
			webnotes.msgprint("""%s: %s has not been submitted. 
				Cannot create a new %s""" % (self.doc.from_doctype,
				from_doclist[0].name, self.doc.to_doctype),
				raise_exception=webnotes.DocStatusError)

def get_mapper(from_doctype, to_doctype):
	mapper = webnotes.conn.sql("""select name from `tabDocType Mapper`
		where from_doctype=%s and to_doctype=%s and 
		(ifnull(is_custom, 0) = 0 or ifnull(is_default, 0) = 1)
		order by is_custom asc, is_default desc""", (from_doctype, to_doctype))
	if not mapper:
		webnotes.msgprint("""DocType Mapper not found for mapping 
			"%s" to "%s" """ % (from_doctype, to_doctype), raise_exception=NameError)
	return mapper

def map_doc(from_doctype, to_doctype, from_docname):
	mapper = get_mapper(from_doctype, to_doctype)
	from_doclist, newcon = from_docname, None
	for mapping in mapper:
		from_doclist, newcon = webnotes.model.get_controller("DocType Mapper",
			mapping["name"]).map(from_doclist, newcon)
	return newcon.doclist

def get_conditions(mapper):
	condition_dict = {}
	
	for mapping in mapper:
		mapper_doclist = webnotes.model.get("DocType Mapper", mapping["name"])
		
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
	from core.doctype.doctype_validator.doctype_validator import check
	from webnotes.modules import scrub
	
	mapper = get_mapper(from_doctype, to_doctype)
	condition_dict = get_conditions(mapper)
	mapper_doclist = webnotes.model.get("DocType Mapper", mapper[0]["name"])
	
	prev_doclist_cache = {}
	def get_prev_doclist(name):
		return prev_doclist_cache.setdefault(name,
			webnotes.model.get(mapper_doclist[0].from_doctype, name))
	
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
		prev_child = prev_children.get({"name": child.get(ref_detail_field)})
		if not prev_child:
			msgprint(_("""Equivalent entry of row # %(row)s does not exist in
				%(prev_parenttype)s: "%(prev_parent)s" """) % {
					"row": child.idx,
					"prev_parenttype": _(prev_children[0].parenttype),
					"prev_parent": prev_children[0].parent
				}, raise_exception=NameError)

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
	
	