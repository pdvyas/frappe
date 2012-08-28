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
from webnotes.utils import cint
from webnotes.model.controller import DocListController

class DocTypeMapperController(DocListController):
	def autoname(self):
		if not self.doc.name:
			self.doc.name = "%s-%s" % (self.doc.from_doctype,
				self.doc.to_doctype)

	def validate(self):
		self.check_fields()
		
	def on_update(self):
		self.export()
		
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
			"fieldtype": """![%s]""" % ", ".join(webnotes.model.no_value_fields),
			"fieldname": """![%s]""" % ", ".join(webnotes.model.default_fields)
		})
		
		return doctypelist.get_fieldnames(filters)
		
	def map(self, from_docname):
		from_doclist = webnotes.model.get(self.doc.from_doctype, from_docname)
		
		# check if submitted
		self.is_submitted(from_doclist)
		
		# get controller with new doclist
		newcon = webnotes.model.get_controller([{"doctype": self.doc.to_doctype}])
		
		# map parent
		newcon.doc.update(self._map_fields(0, from_doclist[0], self.doc.to_doctype))
		
		# map children
		for tab in self.doclist.get({"parentfield": "table_mapper_details"}):
			if not tab.to_field: continue
			for doc in from_doclist.get({"parentfield": tab.from_field}):
				newcon.add_child(self._map_fields(tab.match_id, doc, 
					tab.to_table, tab.to_field))
		
		return newcon.doclist
			
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