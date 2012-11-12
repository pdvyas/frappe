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
import os, json

from webnotes.utils import now, cint
msgprint = webnotes.msgprint

class DocType:
	def __init__(self, doc=None, doclist=[]):
		self.doc = doc
		self.doclist = doclist

	def change_modified_of_parent(self):
		sql = webnotes.conn.sql
		parent_list = sql('SELECT parent from tabDocField where fieldtype="Table" and options="%s"' % self.doc.name)
		for p in parent_list:
			sql('UPDATE tabDocType SET modified="%s" WHERE `name`="%s"' % (now(), p[0]))

	def scrub_field_names(self):
		restricted = ('name','parent','idx','owner','creation','modified',
			'modified_by','parentfield','parenttype','localname','doctype')
		for d in self.doclist:
			if d.parent and d.fieldtype:
				if (not d.fieldname):
					if not d.label:
						webnotes.msgprint("Either Fieldname or Label is mandatory (row %s)" % d.idx, 
							raise_exception=1)
						
					d.fieldname = d.label.strip().lower().replace(' ','_')
					if d.fieldname in restricted:
						webnotes.msgprint("%s is a restricted fieldname, please rename" % d.fieldname,
							raise_exception=1)
	
	def set_version(self):
		self.doc.version = cint(self.doc.version) + 1
	
	def validate_series(self, autoname=None, name=None):
		"""check series is unique"""
		sql = webnotes.conn.sql
		if not autoname: autoname = self.doc.autoname
		if not name: name = self.doc.name
		
		if autoname and (not autoname.startswith('field:')) and (not autoname.startswith('eval:')) and (not autoname=='Prompt'):
			prefix = autoname.split('.')[0]
			used_in = sql('select name from tabDocType where substring_index(autoname, ".", 1) = %s and name!=%s', (prefix, name))
			if used_in:
				msgprint('<b>Series already in use:</b> The series "%s" is already used in "%s"' % (prefix, used_in[0][0]), raise_exception=1)

	def validate_fields(self):
		"validates fields for incorrect properties and double entries"
		fieldnames = {}
		illegal = ['.', ',', ' ', '-', '&', '%', '=', '"', "'", '*', '$']
		for d in self.doclist.get({"parentfield":"fields"}):
			if not d.permlevel: d.permlevel = 0
			if d.parent and d.fieldtype and d.parent == self.doc.name:
				# check if not double
				if d.fieldname:
					if fieldnames.get(d.fieldname):
						webnotes.msgprint('Fieldname <b>%s</b> appears twice (rows %s and %s). Please rectify' \
						 	% (d.fieldname, str(d.idx + 1), str(fieldnames[d.fieldname] + 1)), raise_exception=1)
					fieldnames[d.fieldname] = d.idx
					
					# check bad characters
					for c in illegal:
						if c in d.fieldname:
							webnotes.msgprint('"%s" not allowed in fieldname' % c)
				
				else:
					webnotes.msgprint("Fieldname is mandatory in row %s" % str(d.idx+1), raise_exception=1)
				
				# check illegal mandatory
				if d.fieldtype in ('HTML', 'Button', 'Section Break', 'Column Break') and d.reqd:
					webnotes.msgprint('%(lable)s [%(fieldtype)s] cannot be mandatory', raise_exception=1)
		
		
	def validate(self):
		self.validate_series()
		self.scrub_field_names()
		self.validate_fields()
		self.set_version()

	def on_update(self):
		self.make_amendable()
		self.make_file_list()
		
		sql = webnotes.conn.sql
		# make schma changes
		from webnotes.model.db_schema import updatedb
		updatedb(self.doc.name)

		self.change_modified_of_parent()
		
		import conf
		from webnotes.modules.import_merge import in_transfer

		if (not in_transfer) and getattr(conf,'developer_mode', 0):
			self.export_doc()

		from webnotes.model.doctype import clear_cache
		clear_cache(self.doc.name)
		
	def export_doc(self):
		from webnotes.modules.export_file import export_to_files
		export_to_files(record_list=[['DocType', self.doc.name]])
		self.make_controller_template()
		self.export_permissions()

	@property
	def permpath(self):
		from webnotes.modules import get_doc_path
		return os.path.join(get_doc_path(self.doc.module,
			self.doc.doctype, self.doc.name), 'permissions.json')
		
	def export_permissions(self):
		"""export permissions file"""
		permissions = webnotes.conn.sql("""select * from tabDocPerm 
			where document_type=%s""", self.doc.name, as_dict=True, no_system_fields=True)
		if permissions:
			with open(self.permpath, 'w') as permfile:
				permfile.write(json.dumps(permissions, indent=1))
			
	def reset_permissions(self):
		from webnotes.model.doc import Document
		
		webnotes.conn.sql("""delete from tabDocPerm where document_type=%s""", self.doc.name)
		with open(self.permpath, 'r') as permfile:
			for perm in json.loads(permfile.read()):
				permdoc = Document(fielddata = perm)
				permdoc.doctype = "DocPerm"
				permdoc.name = None
				permdoc.save(new=True)
	
	def make_controller_template(self):
		from webnotes.modules import get_doc_path, get_module_path, scrub
		
		pypath = os.path.join(get_doc_path(self.doc.module, 
			self.doc.doctype, self.doc.name), scrub(self.doc.name) + '.py')

		if not os.path.exists(pypath):
			with open(pypath, 'w') as pyfile:
				with open(os.path.join(get_module_path("core"), "doctype", "doctype", 
					"doctype_template.py"), 'r') as srcfile:
					pyfile.write(srcfile.read())
		
		
	def import_doc(self):
		from webnotes.modules.import_module import import_from_files
		import_from_files(record_list=[[self.doc.module, 'doctype', self.doc.name]])		
	
	def make_file_list(self):
		"""
			if allow_attach is checked and the column file_list doesn't exist,
			create a new field 'file_list'
		"""
		if self.doc.allow_attach:
			import webnotes.model.doctype
			temp_doclist = webnotes.model.doctype.get(self.doc.name)
			if 'file_list' not in [d.fieldname for d in temp_doclist if \
					d.doctype=='DocField']:
				new = self.doc.addchild('fields', 'DocField', 1, self.doclist)
				new.label = 'File List'
				new.fieldtype = 'Text'
				new.fieldname = 'file_list'
				new.hidden = 1
				new.permlevel = 0
				new.print_hide = 1
				new.no_copy = 1
				idx_list = [d.idx for d in temp_doclist if d.idx]
				max_idx = idx_list and max(idx_list) or 0
				new.idx = max_idx + 1
				new.save()

	def make_amendable(self):
		"""
			if is_submittable is set, add amendment_date and amended_from
			docfields
		"""
		if self.doc.is_submittable:
			import webnotes.model.doctype
			temp_doclist = webnotes.model.doctype.get(self.doc.name)
			max_idx = max([d.idx for d in temp_doclist if d.idx])
			max_idx = max_idx and max_idx or 0
			if 'amendment_date' not in [d.fieldname for d in temp_doclist if \
					d.doctype=='DocField']:
				new = self.doc.addchild('fields', 'DocField', 1, self.doclist)
				new.label = 'Amendment Date'
				new.fieldtype = 'Date'
				new.fieldname = 'amendment_date'
				new.permlevel = 0
				new.print_hide = 1
				new.no_copy = 1
				new.idx = max_idx + 1
				new.description = "The date at which current entry is corrected in the system."
				new.depends_on = "eval:doc.amended_from"
				new.save()
				max_idx += 1
			if 'amended_from' not in [d.fieldname for d in temp_doclist if \
					d.doctype=='DocField']:
				new = self.doc.addchild('fields', 'DocField', 1, self.doclist)
				new.label = 'Amended From'
				new.fieldtype = 'Link'
				new.fieldname = 'amended_from'
				new.options = "Sales Invoice"
				new.permlevel = 1
				new.print_hide = 1
				new.no_copy = 1
				new.idx = max_idx + 1
				new.save()
				max_idx += 1

	def on_trash(self):
		import webnotes.model
		
		# delete docPerms
		for name in webnotes.conn.sql("""select name from `tabDocPerm`
				where document_type=%s""", self.doc.name):
			webnotes.model.delete_doc("DocPerm", name[0])
		
		# delete property setters
		for name in webnotes.conn.sql("""select name from `tabProperty Setter`
				where doc_type=%s""", self.doc.name):
			webnotes.model.delete_doc("Property Setter", name[0])
		
