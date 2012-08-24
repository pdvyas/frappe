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
from webnotes.model.controller import DocListController

@webnotes.whitelist()
def get_items():
	"""get module doctypes (master, transaction, setup, tool), pages and reports"""
	
	out = webnotes.DictObj({
		'master': [],
		'transaction': [],
		'setup': [],
		'tool': [],
		'other': [],
		'report': []
	})
	
	# doctypes
	for dt in webnotes.conn.sql("""select name, document_type from tabDocType where module=%s""",
		webnotes.form.module):
		if dt.document_type:
			out[dt.document_type.lower()].append(["DocType", dt.name])
	
	# pages
	for page in webnotes.conn.sql("""select name from tabPage where module=%s""", webnotes.form.module):
		out.tool.append(["Page", page.name])
		
	# reports
	for report in webnotes.conn.sql("""select tabReport.name from tabReport, tabDocType
		where tabReport.ref_doctype = tabDocType.name and tabDocType.module = %s""",
			webnotes.form.module):
		
		out.report.append(['Report', report.name])
		
	return out
	