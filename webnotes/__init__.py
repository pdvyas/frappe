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
globals attached to webnotes module
+ some utility functions that should probably be moved
"""

class DictObj(dict):
	"""dict like object that exposes keys as attributes"""
	def __getattr__(self, key):
		return self.get(key)
	def __setattr__(self, key, value):
		self[key] = value
	def __getstate__(self): 
		return self
	def __setstate__(self, d): 
		self.update(d)

lang = 'en'
form_dict = DictObj()
conn = None
_memc = None
form = None
session = None
user = None
incoming_cookies = {}
add_cookies = {} # append these to outgoing request
cookies = {}
response = DictObj({'message':'', 'exc':''})
debug_log = []
message_log = []
_messages = {}

# memcache

def cache():
	global _memc
	if not _memc:
		from webnotes.memc import MClient
		_memc = MClient(['localhost:11211'])
	return _memc

# exceptions
class ValidationError(Exception): pass
class AuthenticationError(Exception): pass
class PermissionError(Exception): pass
class UnknownDomainError(Exception): pass
class SessionStopped(Exception): pass
class HandlerError(Exception): pass
class OutgoingEmailError(ValidationError): pass
class DuplicateEntryError(ValidationError): pass
class InvalidLinkError(ValidationError): pass
class LinkFilterError(ValidationError): pass
class ConditionalPropertyError(ValidationError): pass
class MandatoryError(ValidationError): pass
class NameError(ValidationError): pass
class DocStatusError(ValidationError): pass
class IntegrityError(ValidationError): pass
class CircularLinkError(ValidationError): pass
class DependencyError(ValidationError): pass
		
def getTraceback():
	import utils
	return utils.getTraceback()

def errprint(msg):
	"""
	   Append to the :data:`debug log`
	"""
	from utils import cstr
	debug_log.append(cstr(msg or ''))

def _(string):
	return string

def msgprint(msg, small=0, raise_exception=0, as_table=False):
	"""
	   Append to the :data:`message_log`
	"""	
	from utils import cstr
	if as_table and type(msg) in (list, tuple):
		msg = '<table border="1px" style="border-collapse: collapse" cellpadding="2px">' + ''.join(['<tr>'+''.join(['<td>%s</td>' % c for c in r])+'</tr>' for r in msg]) + '</table>'
	
	message_log.append((small and '__small:' or '')+cstr(msg or ''))
	if raise_exception:
		import inspect
		if inspect.isclass(raise_exception) and issubclass(raise_exception, Exception):
			raise raise_exception, msg
		else:
			raise ValidationError, msg
	
def create_folder(path):
	"""
	Wrapper function for os.makedirs (does not throw exception if directory exists)
	"""
	import os
	
	try:
		os.makedirs(path)
	except OSError, e:
		if e.args[0]!=17: 
			raise e

def create_symlink(source_path, link_path):
	"""
	Wrapper function for os.symlink (does not throw exception if directory exists)
	"""
	import os
	
	try:
		os.symlink(source_path, link_path)
	except OSError, e:
		if e.args[0]!=17: 
			raise e

def remove_file(path):
	"""
	Wrapper function for os.remove (does not throw exception if file/symlink does not exists)
	"""
	import os
	
	try:
		os.remove(path)
	except OSError, e:
		if e.args[0]!=2: 
			raise e
			
def connect(db_name=None, password=None):
	"""
		Connect to this db (or db), if called from command prompt
	"""
	import webnotes.db
	global conn
	conn = webnotes.db.Database(user=db_name, password=password)
	
	global session
	session = DictObj({'user':'Administrator'})
	
	import webnotes.profile
	global user
	user = webnotes.profile.Profile('Administrator')	

def get_env_vars(env_var):
	import os
	return os.environ.get(env_var,'None')

remote_ip = get_env_vars('REMOTE_ADDR')		#Required for login from python shell
logger = None
	
def get_db_password(db_name):
	"""get db password from conf"""
	import conf
	
	if hasattr(conf, 'get_db_password'):
		return conf.get_db_password(db_name)
		
	elif hasattr(conf, 'db_password'):
		return conf.db_password
		
	else:
		return db_name


whitelisted = []
guest_methods = []
def whitelist(allow_guest=False, allow_roles=[]):
	"""
	decorator for whitelisting a function
	
	Note: if the function is allowed to be accessed by a guest user,
	it must explicitly be marked as allow_guest=True
	
	for specific roles, set allow_roles = ['Administrator'] etc.
	"""
	def innerfn(fn):
		global whitelisted, guest_methods
		whitelisted.append(fn)

		if allow_guest:
			guest_methods.append(fn)

		if allow_roles:
			roles = get_roles()
			allowed = False
			for role in allow_roles:
				if role in roles:
					allowed = True
					break
			
			if not allowed:
				raise PermissionError, "Method not allowed"

		return fn

	return innerfn
	
def clear_cache(user=None):
	"""clear boot cache"""
	from webnotes.sessions import clear
	clear(user)
	
def get_roles(user=None, with_standard=True):
	"""get roles of current user"""
	if not user:
		user = session['user']

	if user=='Guest':
		return ['Guest']
		
	roles = [r[0] for r in conn.sql("""select role from tabUserRole 
		where parent=%s and role!='All'""", user)] + ['All']
		
	# filter standard if required
	if not with_standard:
		roles = filter(lambda x: x not in ['All', 'Guest', 'Administrator'], roles)
	
	return roles

def has_permission(doctype, ptype):
	"""check if user has permission"""
	return conn.sql("""select name from tabDocPerm p
		where p.document_type = %s
		and ifnull(p.`%s`,0) = 1
		and ifnull(p.permlevel,0) = 0
		and p.role in (select `role` from tabUserRole where `parent`=%s)
		""" % ("%s", ptype, "%s"), (doctype, session.user))

def generate_hash():
	"""Generates random hash for session id"""
	import hashlib, time
	return hashlib.sha224(str(time.time())).hexdigest()

def model_wrapper(doctype=None, name=None):
	from webnotes.model.wrapper import ModelWrapper
	return ModelWrapper(doctype, name)

def get_controller(doctype, name=None):
	from webnotes.model.controller import get_obj
	
	doclist = doctype
	if isinstance(doclist, list):
		from webnotes.model.doclist import objectify
		doclist = objectify(doclist)
		doctype = doclist[0].doctype
		doc = doclist[0]
		
		return get_obj(doc=doclist[0], doclist=doclist)
	else:
		return get_obj(doctype, name, with_children=1)
	

def get_doctype(doctype, processed=False):
	import webnotes.model.doctype
	return webnotes.model.doctype.get(doctype, processed)

def get_doclist(doctype, name=None):
	return get_controller(doctype, name).doclist
	
def insert(doclist):
	if not isinstance(doclist, list):
		doclist = [doclist]

	for d in doclist:
		d["__islocal"] = 1
		
	wrapper = model_wrapper(doclist)
	wrapper.save()
	
	return wrapper

def insert_variants(base, variants):
	for v in variants:
		base_copy = []
		if isinstance(base, list):
			for i, b in enumerate(base):
				new = b.copy()
				new.update(v[i])
				base_copy.append(new)
		else:
			new = base.copy()
			new.update(v)
			base_copy.append(new)
			
		insert(base_copy)
		
def get_label(doctype, fieldname, parent=None, parentfield=None):
	doctypelist = get_doctype(doctype)
	return doctypelist.get_label(fieldname, parent, parentfield)
	
def get_field(doctype, fieldname, parent=None, parentfield=None):
	doctypelist = get_doctype(doctype)
	return doctypelist.get_field(fieldname, parent, parentfield)
