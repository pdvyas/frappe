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
import webnotes, json

class DocType:
	def __init__(self, d, dl):
		self.doc, self.doclist = d, dl
		self.temp = []
		
	def autoname(self):
		self.doc.name = self.doc.label
		
	def validate(self):
		if self.doc.fields.get('__temp'):
			self.temp = json.loads(self.doc.fields['__temp'])
			del self.doc.fields['__temp']

		self.set_custom()
		
	def on_update(self):
		self.update_roles()

		if self.doc.is_custom=="No":
			from webnotes.modules.export_file import export_to_files
			export_to_files(record_list=[['Desktop Item', self.doc.name]])
		
	def update_roles(self):
		from webnotes.model.doc import Document
		if self.temp:
			# remove
			webnotes.conn.sql("""delete from `tabDesktop Item Role` 
				where parent=%s""", self.doc.name)
				
			# add
			for role in self.temp:
				Document(fielddata = {
					"doctype": "Desktop Item Role",
					"parent": self.doc.name,
					"parenttype": "Desktop Item",
					"parentfield": "desktop_item_roles",
					"role": role,
					"__islocal": 1
				}).save()
						
	def set_custom(self):
		if not self.doc.is_custom:
			if webnotes.session.user=="Administrator":
				self.doc.is_custom = "No"
			else:
				self.doc.is_custom = "Yes"
								
@webnotes.whitelist()
def get_roles():
	return [r[0] for r in webnotes.conn.sql("""select role from `tabDesktop Item Role`
		where parent=%s""", webnotes.form_dict.desktop_item)]