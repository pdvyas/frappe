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
Contains the Document class representing an object / record
"""

import webnotes
import webnotes.model
import webnotes.model.doclist
from webnotes.utils import cint, cstr, now, now_datetime

valid_fields = {}

class Document(dict):
	"""
	   The wn(meta-data)framework equivalent of a Database Record.
	   Stores,Retrieves,Updates the record in the corresponding table.
	   Runs the triggers required.

	   The `Document` class represents the basic Object-Relational Mapper (ORM). The object type is defined by
	   `DocType` and the object ID is represented by `name`:: 
	   
	      Please note the anamoly in the Web Notes Framework that `ID` is always called as `name`

	   If both `doctype` and `name` are specified in the constructor, then the object is loaded from the database.
	   If only `doctype` is given, then the object is not loaded
	   If `fielddata` is specfied, then the object is created from the given dictionary.
	       
	      **Note 1:**
	      
		 The getter and setter of the object are overloaded to map to the fields of the object that
		 are loaded when it is instantiated.
	       
		 For example: doc.name will be the `name` field and doc.owner will be the `owner` field

	      **Note 2 - Standard Fields:**
	      
		 * `name`: ID / primary key
		 * `owner`: creator of the record
		 * `creation`: datetime of creation
		 * `modified`: datetime of last modification
		 * `modified_by` : last updating user
		 * `docstatus` : Status 0 - Saved, 1 - Submitted, 2- Cancelled
		 * `parent` : if child (table) record, this represents the parent record
		 * `parenttype` : type of parent record (if any)
		 * `parentfield` : table fieldname of parent record (if any)
		 * `idx` : Index (sequence) of the child record	
	"""
	
	def __init__(self, doctype=None, name=None, fielddata=None):
		self.doctype = doctype
		self.name = name
		if fielddata:
			self.update(fielddata)
		else:
			self.__islocal = 1

	def __getattr__(self, key):
		return self.get(key)

	def __setattr__(self, key, value):
		self[key] = value

	def save(self, new=False, doctypelist=None):
		if not doctypelist:
			doctypelist = webnotes.model.get_doctype(self.doctype)

		fields_to_save = self.get_valid_fields(doctypelist)
		
		# set None if field does not exist
		for f in fields_to_save:
			if f not in self:
				self[f] = None
		
		if cint(doctypelist[0].issingle):
			self.insert_single(fields_to_save)
		elif new or self.__islocal:
			self.insert(fields_to_save, doctypelist[0].autoname)
		else:
			self._update(fields_to_save)
		
		# clear temp fields
		for k in self.keys():
			if k.startswith("__"):
				del self[k]

	def insert_single(self, fields_to_insert):
		# delete existing records
		webnotes.conn.sql("""delete from tabSingles where doctype=%s""", self.doctype)
		
		for f in fields_to_insert:
			if f in self:
				webnotes.conn.sql("""insert into tabSingles (doctype, field, value)
					values (%s, %s, %s)""", (self.doctype, f, self.get(f)))

	def insert(self, fields_to_insert, autoname):
		"""insert a non-single doc"""
		self.set_name(autoname)
		self.validate_name()
		self.validate_default_fields()
		
		column_place_holders = ", ".join(["`%s`" % f for f in fields_to_insert])
		value_place_holders = ", ".join(["%%(%s)s" % f for f in fields_to_insert])
	
		webnotes.conn.sql("""insert into `tab%s` (%s) values (%s)""" % \
			(self.doctype, column_place_holders, value_place_holders), self)
	
	def _update(self, fields_to_update):
		self.validate_default_fields()
		
		# exclude name, creation, owner from fields to update
		fields_to_update = filter(lambda f: f not in ("name", "creation", "owner"),
			fields_to_update)
		set_fields = map(lambda f: "`%s` = %%(%s)s" % (f, f), fields_to_update)
				
		webnotes.conn.sql("""update `tab%s` set %s where name = %s""" % \
			(self.doctype, ", ".join(set_fields), "%(name)s"), self)
			
	def set_name(self, autoname=None):
		self.localname = self.name
		if self.name and not self.name.startswith("New %s" % self.doctype):
			return

		# determine amended name
		if self.amended_from:
			self.name = self.get_amended_name()
			return

		# call autoname method of controller
		controller = webnotes.model.get_controller([self], module=self.module or None)
		if hasattr(controller, "autoname"):
			name = controller.autoname()
			if name:
				self.name = name
			elif not self.name:
				webnotes.msgprint("""Error in autoname method of "%s" """ % self.doctype,
					raise_exception=webnotes.ProgrammingError)
		
		elif autoname == "naming_series":
			self.name = make_autoname("%s.#####" % self.naming_series)
		elif autoname and autoname.startswith("field:"):
			self.name = self.get(autoname[6:]) or ""
		elif self.__newname:
			# via prompt
			self.name = self.__newname
		else:
			self.name = make_autoname(autoname or "#########")
			
	def get_amended_name(self):
		if "-" not in self.amended_from:
			amend_prefix = self.amended_from
			amend_id = 1
		else:
			amend_prefix = self.amended_from.split("-")[:-1]
			amend_id = cint(self.amended_from.split("-")[-1]) + 1
		return "%s-%d" % (amend_prefix, amend_id)
		
	def validate_name(self):
		# name missing
		if not self.name:
			webnotes.msgprint("""No Name specified for "%s" """ % self.doctype,
				raise_exception=webnotes.NameError)
		
		self.name = self.name.strip()

		# illegal characters - [TODO: should allow single quote]
		for ch in ('%', "'", '"', '#', '*', '?', '`'):
			if ch in self.name:
				webnotes.msgprint("""(%s) is not allowed in Name (%s)""" % \
					(ch, self.name), raise_exception=webnotes.NameError)

		# not able to name
		if self.name.startswith("New %s" % self.doctype):
			webnotes.msgprint("""Error: cannot set Name. Please contact your System Manager""",
				raise_exception=webnotes.NameError)

		# already exists
		if webnotes.conn.exists(self.doctype, self.name):
			webnotes.msgprint(""" "%s": "%s" already exists""" % \
				(self.doctype, self.name), raise_exception=webnotes.NameError)
	
	def validate_default_fields(self):
		# set idx
		if self.parent and not self.idx:
			self.idx = cint(webnotes.conn.sql("""select max(idx) from `tab%s`
				where parent=%s and parenttype=%s and parentfield=%s""" % \
				(self.doctype, "%s", "%s", "%s"), (self.parent, self.parenttype,
				self.parentfield))[0][0])

		# set info
		self.owner = self.owner or webnotes.session["user"]
		self.modified_by = webnotes.session["user"]
		self.creation = self.creation or now()
		self.modifed = now()

	def get_valid_fields(self, doctypelist):
		global valid_fields
		if valid_fields.get(self.doctype):
			return valid_fields.get(self.doctype)

		if cint(doctypelist[0].issingle):
			doctype_fieldnames = map(lambda f: f.fieldname, doctypelist.get({"doctype": "DocField", 
				"fieldtype": "![%s]" % ",".join(webnotes.model.no_value_fields)}))
			valid_fields[self.doctype] = filter(lambda f: f in doctype_fieldnames, self.keys())
		else:
			valid_fields[self.doctype] = webnotes.conn.get_table_columns(self.doctype)

		return valid_fields.get(self.doctype)

	def encode(self, encoding='utf-8'):
		"""convert all unicode values to utf-8"""
		for key in self:
			if isinstance(self[key], unicode):
				self[key] = self[key].encode(encoding)

def make_autoname(key):
	"""
		Creates an autoname from the given key:

		**Autoname rules:**

		* The key is separated by '.'
		* '####' represents a series. The string before this part becomes the prefix:
		   Example: ABC.#### creates a series ABC0001, ABC0002 etc
		* 'MM' represents the current month
		* 'YY' and 'YYYY' represent the current year


		*Example:*

		* DE/.YY./.MM./.##### will create a series like
		  DE/09/01/0001 where 09 is the year, 01 is the month and 0001 is the series
	"""
	name = ""
	today = now_datetime().date()

	key_parts = key.split(".")
	for part in key_parts:
		if part.startswith("#"):
			name += get_next_in_series(name, len(part))
		elif part == "YY":
			name += today.strftime("%y")
		elif part == "YYYY":
			name += today.strftime("%Y")
		elif part == "MM":
			name += today.strftime("%m")
		else:
			name += part

	return name
	
def get_next_in_series(name, length):
	if webnotes.conn.exists("Series", name):
		webnotes.conn.sql("""update tabSeries set current = ifnull(current, 0) + 1 where name = %s""", name)
		next = webnotes.conn.get_value("Series", name, "current")
	else:
		webnotes.conn.sql("""insert into tabSeries (name, current) values (%s, 1)""", name)
		next = 1

	# returns a number like 00001 as a string
	return ("%%0%dd" % length) % next

# bc
def get(doctype, name=None):
	"""
	Returns a doclist containing the main record and all child records
	"""
	return webnotes.model.doclist.load_doclist(doctype, name or doctype)

def getsingle(doctype):
	"""get single doc as dict"""
	return webnotes.model.doclist.load_main(doctype, doctype)