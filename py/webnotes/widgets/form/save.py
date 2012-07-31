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
def savedocs():
	"""save / submit / cancel / update doclist"""
	try:
		import webnotes.model
		form = webnotes.form_dict

		from webnotes.model.utils import expand
		controller = webnotes.model.controller(expand(form.get('docs')))

		# action
		action = form.get('action')

		if action=='Update': action='update_after_submit'

		getattr(controller, action.lower())()

		# update recent documents
		webnotes.user.update_recent(controller.doc.doctype, controller.doc.name)

		# send updated docs
		webnotes.response['saved'] = '1'
		webnotes.response['main_doc_name'] = controller.doc.name
		webnotes.response['doctype'] = controller.doc.doctype
		webnotes.response['docname'] = controller.doc.name
		webnotes.response['docs'] = controller.doclist

	except Exception, e:
		webnotes.msgprint('Did not save')
		webnotes.errprint(webnotes.utils.getTraceback())
		raise e
