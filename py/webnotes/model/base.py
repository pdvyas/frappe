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

import webnotes

class BaseDocType:
	"""Base doctype, common functions can be added here"""
	def __init__(self, doc, doclist):
		self.doc, self.doclist = doc, doclist
		
	def get(self, filters={}):
		"""get list of records by filter from doclist"""
		out = []
		for d in self.doclist:
			add = True
			for f in filters:
				if d.fields.get(f) != filters[f]:
					add = False
					
			if add: out.append(d)
		return out
		
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
		