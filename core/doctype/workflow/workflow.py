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

from __future__ import unicode_literals
import webnotes

class DocType:
	def __init__(self, d, dl):
		self.doc, self.doclist = d, dl
	
	def autoname(self):
		if webnotes.session['user']=="Administrator":
			self.doc.name = self.doc.document_type
		else:
			# add a numeric suffix to the custom name
			from webnotes.model.doc import make_autoname
			self.doc.name = make_autoname(self.doc.document_type + "-.##", self.doc.doctype)
	
	def validate(self):
		self.set_custom()
		self.set_active()
		
	def set_custom(self):
		if not self.doc.is_custom:
			if webnotes.session.user=="Administrator":
				self.doc.is_custom = "No"
			else:
				self.doc.is_custom = "Yes"
				
	def set_active(self):
		if int(self.doc.is_active or 0):
			# clear all other
			webnotes.conn.sql("""update tabWorkflow set is_active=0 
				where document_type=%s""",
				self.doc.document_type)
				
	def on_update(self):
		if self.doc.is_custom=="No":
			from webnotes.modules.export_file import export_to_files
			export_to_files(record_list=[['Workflow', self.doc.name]])
		
	