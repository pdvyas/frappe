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
from webnotes.model.controller import DocListController

@webnotes.whitelist()
def get_items(session):
	"""get module doctypes (master, transaction, setup, tool), pages and reports"""
	
	out = webnotes.DictObj({
		'master': [],
		'transaction': [],
		'setup': [],
		'tool': [],
		'other': [],
		'report': [],
		'system': []
	})
	
	# doctypes
	for dt in session.db.sql("""select name, document_type, issingle	
		from tabDocType where module=%s""",
		session.request.params.get("module")):
		if dt.document_type:
			if dt.issingle:
				out[dt.document_type.lower()].append(["Single", dt.name])
			else:
				out[dt.document_type.lower()].append(["DocType", dt.name, get_data(session, dt.name)])
	
	# pages
	for page in session.db.sql("""select name from tabPage where module=%s""", 
		session.request.params.get("module")):
		if not 'home' in page.name:
			out.tool.append(["Page", page.name])
		
	# reports
	for report in session.db.sql("""select tabReport.name, tabReport.ref_doctype 
		from tabReport, tabDocType
		where tabReport.ref_doctype = tabDocType.name and tabDocType.module = %s""",
			session.request.params.get("module")):
		
		out.report.append(['Report', report.name, report.ref_doctype])
		
	return out
	
def get_data(session, dt):
	"""get docstatus numbers"""
	ret = []
	for i in xrange(3):
		ret.append(session.db.sql("""select count(*) from `tab%s` where 
			ifnull(docstatus,0) = %s""" % (dt, '%s'), i, as_list=1)[0][0])
	return ret