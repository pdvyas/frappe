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
"""
Transactions are defined as collection of classes, a DocList represents collection of Document
objects for a transaction with main and children.

Group actions like save, etc are performed on doclists
"""

import webnotes
import webnotes.model
import webnotes.model.doc
import webnotes.model.doclist

from webnotes.utils import cint, cstr, now

class DocListController(object):
	"""
	Collection of Documents with one parent and multiple children
	"""
	def __init__(self, doctype=None, name=None):
		self.to_docstatus = 0
		self.doctype = doctype
		self.name = name
		if doctype:
			self.load(doctype, name)
	
	def load(self, doctype, name=None):
		if isinstance(doctype, list):
			self.set_doclist(doctype)
			return
			
		if not name: name = doctype
		
		self.set_doclist(webnotes.model.doclist.load_doclist(doctype, name))
	
	def set_doclist(self, doclist):
		if not isinstance(doclist, webnotes.model.doclist.DocList):
			self.doclist = webnotes.model.doclist.objectify_doclist(doclist)
		else:
			self.doclist = doclist
		self.doc = self.doclist[0]

	def from_compressed(self, data):
		"""Expand called from client"""
		from webnotes.model.utils import expand
		self.set_doclist(expand(data))

	def save(self):
		"""Save the doclist"""
		self.prepare_for_save()
		self.run('validate')
		self.doctype_validate()
		self.save_main()
		self.save_children()
		self.run('on_update')

	def submit(self):
		"""
			Save & Submit - set docstatus = 1, run "on_submit"
		"""
		if self.doc.docstatus != 0:
			msgprint("Only draft can be submitted", raise_exception=1)
		self.to_docstatus = 1
		self.save()
		self.run('on_submit')

	def cancel(self):
		"""
			Cancel - set docstatus 2, run "on_cancel"
		"""
		if self.doc.docstatus != 1:
			msgprint("Only submitted can be cancelled", raise_exception=1)
		self.to_docstatus = 2
		self.prepare_for_save()
		self.save_main()
		self.save_children()
		self.run('on_cancel')

	def update_after_submit(self):
		"""
			Update after submit - some values changed after submit
		"""
		if self.doc.docstatus != 1:
			msgprint("Only to called after submit", raise_exception=1)
		self.to_docstatus = 1
		self.prepare_for_save()
		self.save_main()
		self.save_children()
		self.run('on_update_after_submit')

	def prepare_for_save(self):
		"""Set owner, modified etc before saving"""
		self.check_if_latest()
		self.check_permission()
		self.check_links()
		self.update_timestamps_and_docstatus()

	def save_main(self):
		"""Save the main doc"""
		self.doc.save(cint(self.doc.get('__islocal')))

	def save_children(self):
		"""Save Children, with the new parent name"""
		child_map = {}
		
		for d in self.doclist[1:]:
			if d.has_key('parent'):
				if d.parent and (not d.parent.startswith('old_parent:')):
					d.parent = self.doc.name # rename if reqd
					d.parenttype = self.doc.doctype

				d.save(new = cint(d.get('__islocal')))
			
			child_map.setdefault(d.doctype, []).append(d.name)
		
		# delete all children in database that are not in the child_map
		self.remove_children(child_map)

	def remove_children(self, child_map):
		"""delete children from database if they do not exist in the doclist"""
		# get all children types
		tablefields = webnotes.model.get_table_fields(self.doc.doctype)
				
		for dt in tablefields:
			cnames = child_map.get(dt['options']) or []
			if cnames:
				webnotes.conn.sql("""delete from `tab%s` where parent=%s
					and parenttype=%s and name not in (%s)""" % \
					(dt['options'], '%s', '%s', ','.join(['%s'] * len(cnames))), 
					tuple([self.doc.name, self.doc.doctype] + cnames))
			else:
				webnotes.conn.sql("""delete from `tab%s` where parent=%s 
					and parenttype=%s""" % (dt['options'], '%s', '%s'),
					(self.doc.name, self.doc.doctype))

	def check_if_latest(self):
		"""Raises exception if the modified time is not the same as in the database"""
		if not (webnotes.model.is_single(self.doc.doctype) or cint(self.doc.get('__islocal'))):
			modified = webnotes.conn.sql("""select modified from `tab%s`
				where name=%s for update""" % (self.doc.doctype, "%s"), self.doc.name)
			
			if modified and unicode(modified[0][0]) != unicode(self.doc.modified):
				webnotes.msgprint("""\
				Document has been modified after you have opened it.
				To maintain the integrity of the data, you will not be able to save your changes.
				Please refresh this document.
				FYI: [%s / %s]""" % \
				(modified[0][0], self.doc.modified), raise_exception=webnotes.IntegrityError)

	def check_permission(self):
		"""Raises exception if permission is not valid"""
		# hail the administrator - nothing can stop you!
		if webnotes.session["user"] == "Administrator":
			return
		
		doctypelist = webnotes.model.get_doctype("DocType", self.doc.doctype)
		if not hasattr(self, "user_roles"):
			self.user_roles = webnotes.user and webnotes.user.get_roles() or ["Guest"]
		if not hasattr(self, "user_defaults"):
			self.user_defaults = webnotes.user and webnotes.user.get_defaults() or {}
			
		has_perm = False
		match = []
		
		# check if permission exists and if there is any match condition
		for perm in doctypelist.get({"doctype": "DocPerm"}):
			if cint(perm.permlevel) == 0 and cint(perm.read) == 1 and perm.role in self.user_roles:
				has_perm = True
				if perm.match and match != -1:
					match.append(perm.match)
				else:
					# this indicates that there exists atleast one permission
					# where match is not specified
					match = -1
		
		# check match conditions
		if has_perm and match and match != -1:
			for match_field in match:
				if self.doc.get(match_field, "no_value") in self.user_defaults.get(match_field, []):
					# field value matches with user's credentials
					has_perm = True
					break
				else:
					# oops, illegal value
					has_perm = False
					webnotes.msgprint("""Value: "%s" is not allowed for field "%s" """ % \
						(self.doc.get(match_field, "no_value"),
						doctypelist.get_field(match_field).label))

		if not has_perm:
			webnotes.msgprint("""Not enough permissions to save %s: "%s" """ % \
				(self.doc.doctype, self.doc.name), raise_exception=webnotes.PermissionError)

	def check_links(self):
		"""Checks integrity of links (throws exception if links are invalid)"""
		from webnotes.model.doctype import get_link_fields
		link_fields = {}
		error_list = []
		for doc in self.doclist:
			for lf in link_fields.setdefault(doc.doctype, get_link_fields(doc.doctype)):
				options = (lf.options or "").split("\n")[0].strip()
				options = options.startswith("link:") and options[5:] or options
				if doc.get(lf.fieldname) and not webnotes.conn.exists(options, doc[lf.fieldname]):
					error_list.append((options, doc[lf.fieldname], lf.label))

		if error_list:
			webnotes.msgprint("""The following values do not exist in the database: %s.
				Please correct these values and try to save again.""" % \
				webnotes.comma_and(["%s: \"%s\" (specified in field: %s)" % err for err in error_list]),
				raise_exception=webnotes.InvalidLinkError)

	def update_timestamps_and_docstatus(self):
		"""Update owner, creation, modified_by, modified, docstatus"""
		ts = now()

		for d in self.doclist:
			if self.doc.get('__islocal'):
				d.owner = webnotes.session["user"]
				d.creation = ts

			d.modified_by = webnotes.session["user"]
			d.modified = ts
			
			# doubt: why do this?
			if d.docstatus != 2: # don't update cancelled
				d.docstatus = self.to_docstatus

	def doctype_validate(self):
		"""run DocType Validator"""
		from core.doctype.doctype_validator.doctype_validator import validate
		validate(self)

	def run(self, method, args=None):

		# TODO: deprecate these conditions and replace obj with self
		if getattr(self, 'new_style', None):
			obj = self
		else:
			if hasattr(self, 'obj'):
				obj = self.obj
			else:
				from webnotes.model.code import get_obj
				obj = self.obj = get_obj(doclist = self.doclist)

		if hasattr(obj, method):
			if args:
				getattr(obj, method)(args)
			else:
				getattr(obj, method)()

		if hasattr(obj, "custom_%s" % method):
			getattr(obj, "custom_%s" % method)()

		trigger(method, self.doclist[0])
		
	def clear_table(self, table_field):
		self.doclist = filter(lambda d: d.parentfield != table_field, self.doclist)
	
	def add_child(self, doc):
		"""add a child doc to doclist"""
		if not isinstance(doc, webnotes.model.doc.Document):
			doc = webnotes.model.doc.Document(fielddata = doc)
		doc.__islocal = 1
		doc.parent = self.doc.name
		self.doclist.append(doc)
	
	# TODO: should this method be here?
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

def trigger(method, doc):
	"""trigger doctype events"""
	try:
		import startup.event_handlers
	except ImportError:
		return
		
	if hasattr(startup.event_handlers, method):
		getattr(startup.event_handlers, method)(doc)
		
	if hasattr(startup.event_handlers, 'doclist_all'):
		startup.event_handlers.doclist_all(doc, method)



# for bc
def getlist(doclist, parentfield):
	"""
		Return child records of a particular type
	"""
	import webnotes.model.utils
	return webnotes.model.utils.getlist(doclist, parentfield)

		
# clone - To deprecate

def clone(source_doclist):
	"""make a copy of the doclist"""
	from webnotes.model.doc import Document
	new_doclist = []
	new_parent = Document(fielddata = source_doclist.doc.copy())
	new_parent.name = 'Temp/001'
	new_parent['__islocal'] = 1
	new_parent['docstatus'] = 0

	if new_parent.has_key('amended_from'):
		new_parent['amended_from'] = None
		new_parent['amendment_date'] = None

	new_parent.save(1)

	new_doclist.append(new_parent)

	for d in source_doclist.doclist[1:]:
		newd = Document(fielddata = d.copy())
		newd.name = None
		newd['__islocal'] = 1
		newd['docstatus'] = 0
		newd.parent = new_parent.name
		new_doclist.append(newd)

	doclistobj = DocListController()
	doclistobj.docs = new_doclist
	doclistobj.doc = new_doclist[0]
	doclistobj.doclist = new_doclist
	doclistobj.save()
	return doclistobj