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

@webnotes.whitelist()
def runserverobj():
	"""
		Run server objects
	"""
	import webnotes.model.code
	from webnotes.model.controller import DocListController
	from webnotes.utils import cint

	doclist = None
	method = webnotes.form.get('method')
	arg = webnotes.form.get('arg')
	dt = webnotes.form.get('doctype')
	dn = webnotes.form.get('docname')

	if dt: # not called from a doctype (from a page)
		if not dn: dn = dt # single
		controller = webnotes.model.code.get_obj(dt, dn)

	else:
		import webnotes.model
		from webnotes.model.utils import expand
		
		controller = webnotes.model.get_controller(expand(webnotes.form.get('docs')))
		controller.check_if_latest()

	check_guest_access(controller.doc)
	
	if controller:
		r = controller.run_method(method, arg)
		if r:
			#build output as csv
			if cint(webnotes.form.get('as_csv')):
				make_csv_output(r, controller.doc.doctype)
			else:
				webnotes.response['message'] = r
		
		webnotes.response['docs'] = controller.doclist

def check_guest_access(doc):
	if webnotes.session['user']=='Guest' and not webnotes.conn.sql("select name from tabDocPerm where role='Guest' and parent=%s and ifnull(`read`,0)=1", doc.doctype):
		webnotes.msgprint("Guest not allowed to call this object")
		raise Exception

def make_csv_output(res, dt):
	"""send method response as downloadable CSV file"""
	import webnotes
	
	from cStringIO import StringIO
	import csv
		
	f = StringIO()
	writer = csv.writer(f)
	for r in res:
		writer.writerow([v.encode('utf-8') for v in r])
	
	f.seek(0)
						
	webnotes.response['result'] = unicode(f.read(), 'utf-8')
	webnotes.response['type'] = 'csv'
	webnotes.response['doctype'] = dt.replace(' ','')		