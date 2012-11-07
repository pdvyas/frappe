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
def runserverobj():
	"""
		Run server objects
	"""
	import webnotes.model.controller
	import webnotes.handler
	from webnotes.utils import cint

	process_args()
	
	if webnotes.form_dict.get('doctype'):
		# not called from a doctype (from a page)
		doctype = webnotes.form_dict.get('doctype')
		docname = webnotes.form_dict.get('docname')
		if not docname: docname = doctype # single
		so = webnotes.model.controller.get_obj(doctype, docname)
		
	else:
		doclist = webnotes.model_wrapper()
		doclist.from_compressed(webnotes.form_dict.get('docs'))
		so = doclist.make_obj()
		doclist.check_if_latest()

	check_guest_access(so.doc)
	
	if so:
		method = webnotes.form_dict.get('method')
		if hasattr(so, method):
			r = webnotes.handler.call(getattr(so, method), webnotes.form_dict)
			if r:
				#build output as csv
				if cint(webnotes.form_dict.get('as_csv')):
					make_csv_output(r, so.doc.doctype)
				else:
					webnotes.response['message'] = r
					
		# QUESTION / TODO: throw error that method not found?

		webnotes.response.setdefault("docs", []).extend(so.doclist)

def check_guest_access(doc):
	if webnotes.session['user']=='Guest' and not \
		webnotes.conn.sql("""select name from tabDocPerm where role='Guest' 
			and document_type=%s and ifnull(`read`,0)=1""", doc.doctype):
		webnotes.msgprint("Guest not allowed to call this object")
		raise Exception
		
def process_args():
	args = webnotes.form_dict.get('arg') or webnotes.form_dict.get("args")
	if isinstance(args, basestring):
		try:
			import json
			args = json.loads(args)
		except ValueError, e:
			pass

	if webnotes.form_dict.get("arg"):
		webnotes.form_dict["arg"] = args
	elif webnotes.form_dict.get("args"):		
		webnotes.form_dict["args"] = args
		
def make_csv_output(res, dt):
	"""send method response as downloadable CSV file"""
	import webnotes
	
	from cStringIO import StringIO
	import csv
		
	f = StringIO()
	writer = csv.writer(f)
	for r in res:
		row = []
		for v in r:
			if isinstance(v, basestring):
				v = v.encode("utf-8")
			row.append(v)
		writer.writerow(row)
	
	f.seek(0)
						
	webnotes.response['result'] = unicode(f.read(), 'utf-8')
	webnotes.response['type'] = 'csv'
	webnotes.response['doctype'] = dt.replace(' ','')		