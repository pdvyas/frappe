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

custom_class = '''
import webnotes

from webnotes.utils import add_days, add_months, add_years, cint, cstr, date_diff, default_fields, flt, fmt_money, formatdate, getTraceback, get_defaults, get_first_day, get_last_day, getdate, has_common, now, nowdate, replace_newlines, sendmail, set_default, str_esc_quote, user_format, validate_email_add

from webnotes.model.doc import Document, addchild, getchildren
from webnotes.model.utils import getlist
from webnotes.model.controller import get_obj
from webnotes import session, form, msgprint, errprint

sql = webnotes.conn.sql

class CustomDocType(DocType):
  def __init__(self, doc, doclist):
    DocType.__init__(self, doc, doclist)
'''
def get_obj(dt = None, dn = None, doc=None, doclist=None, with_children = 0):
	"""
	   Returns the instantiated `DocType` object. Here you can pass the DocType and name (ID) to get the object.
	   If with_children is true, then all child records will be laoded and added in the doclist.
	"""	
	from webnotes.model.doclist import DocList
	if isinstance(dt, list):
		doclist = dt
	
	if doc and doclist:
		return get_doctype_class(doc.doctype)(doc, DocList(doclist))
	elif doclist:
		return get_doctype_class(doclist[0].doctype)(doclist[0], DocList(doclist))
	elif doc:
		return get_doctype_class(doc.doctype)(doc.doctype, DocList([doc]))
	elif dt:
		import webnotes.model.doc
		if not dn:
			dn = dt
		if with_children:
			doclist = webnotes.model.doc.get(dt, dn, from_get_obj=1)
		else:
			doclist = webnotes.model.doc.get(dt, dn, with_children = 0, from_get_obj=1)
		
		return get_doctype_class(dt)(doclist[0], DocList(doclist))

doctype_classes = {}
def get_doctype_class(doctype):
	global doctype_classes
	if not doctype in doctype_classes:
		import webnotes
		from webnotes.modules import scrub
		from webnotes.model.doctype import get

		module = webnotes.conn.get_value("DocType", doctype, "module")
	
		if not module:
			return
		
		module, dt = scrub(module), scrub(doctype)
		try:
			module = __import__('%s.doctype.%s.%s' % (module, dt, dt), fromlist=[''])
			DocType = getattr(module, 'DocType')
		except ImportError, e:
			from webnotes.utils import cint
			if not cint(webnotes.conn.get_value("DocType", doctype, "custom")):
				raise e
		
			class DocType:
				def __init__(self, d, dl):
					self.doc, self.doclist = d, dl
			
			if webnotes.lang != 'en':
				# load translations that might be used in
				# msgprints, labels etc.
				from webnotes.utils.translate import update_lang_js
				from webnotes.modules import get_doc_path
				webnotes._messages.update(get_lang_data(get_doc_path(module,
					"DocType", doctype), None, 'py'))

		custom_script = get_custom_script(doctype, 'Server')
		if custom_script:
			global custom_class
			exec custom_class + custom_script.replace('\t','  ') in locals()
			doctype_classes[doctype] = CustomDocType
		else:
			doctype_classes[doctype] = DocType
			
	return doctype_classes[doctype]

def get_custom_script(doctype, script_type):
	import webnotes
	custom_script = webnotes.conn.sql("""select script from `tabCustom Script` 
		where dt=%s and script_type=%s""", (doctype, script_type))

	if custom_script and custom_script[0][0]:
		return custom_script[0][0]

class DocListController(object):
	def __init__(self, doc, doclist):
		self.doc, self.doclist = doc, doclist
		if hasattr(self, "setup"):
			self.setup()
		if hasattr(self, "load_precision_maps"):
			self.load_precision_maps()
	
	@property
	def meta(self):
		if not hasattr(self, "_meta"):
			self._meta = webnotes.get_doctype(self.doc.doctype)
		return self._meta
			
def get_code(module, dt, dn, extn, fieldname=None):
	"""DEPRECATED: Used in Report Builder"""
	from webnotes.modules import scrub, get_module_path
	import os, webnotes
	
	# get module (if required)
	if not module:
		module = webnotes.conn.get_value(dt, dn, 'module')

	# no module, quit
	if not module:
		return ''
	
	# file names
	if scrub(dt) in ('page','doctype','search_criteria'):
		dt, dn = scrub(dt), scrub(dn)

	# get file name
	fname = dn + '.' + extn

	# code
	code = ''
	try:
		file = open(os.path.join(get_module_path(scrub(module)), dt, dn, fname), 'r')
		code = file.read()
		file.close()	
	except IOError, e:
		# no file, try from db
		if fieldname:
			code = webnotes.conn.get_value(dt, dn, fieldname)

	return code
	
	