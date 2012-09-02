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
import webnotes.model
from webnotes.utils import cint
from webnotes.model.controller import DocListController
from webnotes import _

class DuplicateSeriesError(webnotes.ValidationError): pass

class DocTypeController(DocListController):
	def validate(self):
		self.validate_series()
		if self.doc.is_submittable:
			self.add_amend_fields()
		self.validate_fields()
		
	def on_update(self):
		# make schema changes
		from webnotes.model.db_schema import updatedb
		updatedb(self.doc.name)
		
		# export
		self.export()
		
		# clear cache
		from webnotes.model.doctype import clear_cache
		clear_cache(self.doc.name)
	
	def validate_series(self, autoname=None, doctype=None):
		if not autoname: autoname = self.doc.autoname
		if not doctype: doctype = self.doc.name
		
		if autoname and not (autoname == "naming_series" or autoname.startswith("field:")
			or autoname.lower() == "prompt"):
			prefix = autoname.split(".")[0]
			exists = webnotes.conn.sql("""select name from `tabDocType`
				where substring_index(autoname, ".", 1) = %s and name != %s""", 
				(prefix, doctype))
			if exists:
				webnotes.msgprint(_("""Series %s is already in use in DocType %s""") % \
					(autoname, exists[0]["name"]), raise_exception=DuplicateSeriesError)
		
	def validate_fields(self):
		def scrub(s):
			s = s.strip().lower().replace(" ", "_")
			# replace illegal characters with blank char
			for c in "'\".,-&%=*$":
				s.replace(c, "")
			return s
		
		# used for checking duplicate fieldname entries
		fieldnames = {}
		
		for doc in self.doclist.get({"doctype": "DocField"}):
			if not (doc.fieldname or doc.label):
				webnotes.msgprint(_("""Must specify Field Name or Label for row # %d""") % \
					doc.idx, raise_exception=True)
			doc.fieldname = scrub(doc.fieldname or doc.label)
			
			# validate if fieldname exists and is not one of reserved field names
			if not doc.fieldname or doc.fieldname in webnotes.model.default_fields:
				webnotes.msgprint(_("""Invalid Field Name "%s" for row # %d""") % \
					(doc.fieldname, doc.idx), raise_exception=True)
			
			# set permlevel
			doc.permlevel = cint(doc.permlevel)
			
			# fieldtypes [HTML, Button, Section Break] cannot be mandatory
			if cint(doc.reqd) and doc.fieldtype in ["HTML", "Button", "Section Break"]:
				webnotes.msgprint(_("""%s [%s] cannot be mandatory""") % \
					(doc.label, doc.fieldname), raise_exception=True)
			
			# validate if fieldname appears more than once
			if doc.fieldname in fieldnames:
				webnotes.msgprint(_("""Field Name "%s" appears twice (rows %d and %d).
					Please rectify.""") % (doc.fieldname, fieldnames[doc.fieldname],
						doc.idx), raise_exception=True)
				
			fieldnames[doc.fieldname] = doc.idx