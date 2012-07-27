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

class BaseDocType:
	"""Base doctype, common functions can be added here"""
	def __init__(self, doc, doclist):
		self.doc, self.doclist = doc, doclist
		
	def no_duplicate(self, parentfield, keys):
		"""raise exception if duplicate entries are found"""
		
		all_values = []
		for d in self.doclist.get({"parentfield":parentfield}):
			values = []
			for key in keys:
				values.append(d.fields.get(key))
			
			if values in all_values:
				doctypelist = webnotes.model.get_doctype(d.doctype)
				labels = map(lambda key: doctypelist.getone({"fieldname":key}).label, keys)
				webnotes.msgprint("""Duplicate rows found in table %s 
					having same values for colums %s""" % (d.doctype, webnotes.comma_and(labels)),
					raise_exception=webnotes.DuplicateEntryError)
			
			all_values.append(values)
		
	def get_csv_from_attachment(self):
		"""get csv from attachment"""
		if not self.doc.file_list:
		  msgprint("File not attached!")
		  raise Exception

		# get file_id
		fid = self.doc.file_list.split(',')[1]
		  
		# get file from file_manager
		try:
			from webnotes.utils import file_manager
			fn, content = file_manager.get_file(fid)
		except Exception, e:
			webnotes.msgprint("Unable to open attached file. Please try again.")
			raise e
	
		# convert char to string (?)
		if not isinstance(content, basestring) and hasattr(content, 'tostring'):
		  content = content.tostring()

		import csv
		return csv.reader(content.splitlines())
		