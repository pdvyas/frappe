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

@webnotes.whitelist()
def get_items():
	"""get module doctypes (master, transaction, setup, tool), pages and reports"""
	
	module = webnotes.form_dict.module
	
	out = []
	
	# doctypes
	for dt in webnotes.conn.sql("""select name, document_type, issingle, 
		open_count, ifnull(description, "") as description
		from tabDocType where module=%s""", module, as_dict=1):
		
		if dt.document_type:
			dt.item_type = dt.document_type.lower()
			if not dt.issingle:
				dt.count = webnotes.conn.sql("""select count(*) 
					from `tab%s`""" % dt.name)[0][0]
				if dt.open_count:
					dt.open_count = webnotes.conn.sql("""select count(*)
					from `tab%s` where %s""" % (dt.name, dt.open_count))[0][0]
					
			out.append(dt)
	
	# pages
	out += webnotes.conn.sql("""select name, title, description, 
		"tool" as item_type from tabPage where module=%s""", 
		module, as_dict=1)
		
	# reports
	out += webnotes.conn.sql("""select tabReport.name, 
		tabReport.ref_doctype, 
		if(ifnull(tabReport.query, "")="", "report", "query_report") as item_type
		from tabReport, tabDocType
		where tabReport.ref_doctype = tabDocType.name and tabDocType.module = %s""",
			module, as_dict=1)
	
	# search criteria
	out += webnotes.conn.sql("""
		select distinct criteria_name as name, 
		if(ifnull(parent_doc_type, "")="", doc_type, parent_doc_type) as doctype,
		"search_criteria" as item_type
		from `tabSearch Criteria` 
		where module=%s 
			and docstatus in (0, NULL)
			and ifnull(disabled, 0) = 0 
			order by criteria_name""", module, as_dict=1)
			
	return out
