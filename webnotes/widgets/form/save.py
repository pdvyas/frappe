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
from webnotes import _, msgprint, errprint

@webnotes.whitelist()
def savedocs():
	"""save / submit / update doclist"""
	try:
		form = webnotes.form_dict

		doclist = webnotes.model_wrapper()
		doclist.from_compressed(form.get('docs'))
		doclist.save()
		
		# update recent documents
		webnotes.user.update_recent(doclist.doc.doctype, doclist.doc.name)

		send_updated_docs(doclist)

	except Exception, e:
		msgprint(_('Did not save'))
		errprint(webnotes.utils.getTraceback())
		raise e

@webnotes.whitelist()
def cancel(doctype=None, name=None):
	"""cancel a doclist"""
	try:
		doclist = webnotes.model_wrapper(doctype, name)
		doclist.cancel()
		
		send_updated_docs(doclist)
		
	except Exception, e:
		errprint(webnotes.utils.getTraceback())
		msgprint(_("Did not cancel"))
		raise e
		
def send_updated_docs(doclist):
	webnotes.response['main_doc_name'] = doclist.doc.name
	webnotes.response['doctype'] = doclist.doc.doctype
	webnotes.response['docname'] = doclist.doc.name
	webnotes.response['docs'] = doclist.doclist