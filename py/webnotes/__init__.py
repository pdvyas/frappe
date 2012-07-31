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

code_fields_dict = {
	'Page':[('script', 'js'), ('content', 'html'), ('style', 'css'), ('static_content', 'html'), ('server_code', 'py')],
	'DocType':[('server_code_core', 'py'), ('client_script_core', 'js')],
	'Search Criteria':[('report_script', 'js'), ('server_script', 'py'), ('custom_query', 'sql')],
	'Patch':[('patch_code', 'py')],
	'Stylesheet':['stylesheet', 'css'],
	'Page Template':['template', 'html'],
	'Control Panel':[('startup_code', 'js'), ('startup_css', 'css')]
}

auto_cache_clear = False
form_dict = {}
auth_obj = None
conn = None
form = None
session = None
user = None
catch_warning = False
incoming_cookies = {}
add_cookies = {} # append these to outgoing request
cookies = {}
response = {'message':'', 'exc':''}
debug_log = []
message_log = []


class ValidationError(Exception): pass
class AuthenticationError(Exception): pass
class PermissionError(Exception): pass
class OutgoingEmailError(ValidationError): pass
class UnknownDomainError(Exception): pass
class SessionStopped(Exception): pass
class DuplicateEntryError(ValidationError): pass
class InvalidLinkError(ValidationError): pass
class LinkFilterError(ValidationError): pass
class ConditionalPropertyError(ValidationError): pass

def getTraceback():
	import utils
	return utils.getTraceback()

def errprint(msg):
	"""
	   Append to the :data:`debug log`
	"""
	from utils import cstr
	debug_log.append(cstr(msg or ''))

def msgprint(msg, small=0, raise_exception=0, as_table=False, debug=0):
	"""
	   Append to the :data:`message_log`
	"""	
	from utils import cstr
	import inspect
	if as_table and type(msg) in (list, tuple):
		msg = '<table border="1px" style="border-collapse: collapse" cellpadding="2px">' + ''.join(['<tr>'+''.join(['<td>%s</td>' % c for c in r])+'</tr>' for r in msg]) + '</table>'
	
	message_log.append((small and '__small:' or '')+cstr(msg or ''))
	
	if debug:
		print msg
	
	if raise_exception:
		if inspect.isclass(raise_exception) and issubclass(raise_exception, Exception):
			raise raise_exception, msg
		else:
			raise ValidationError, msg

def get_index_path():
	import os
	return os.sep.join(os.path.dirname(os.path.abspath(__file__)).split(os.sep)[:-2])

def get_files_path():
	import conf
	return conf.files_path
	
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
	if conn:
		conn.close()
	conn = webnotes.db.Database(user=db_name, password=password)
	
	global session
	session = {'user':'Administrator'}
	
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


# this will be updated when the related module is imported
# and will be used by handler to allow
whitelisted = []

def whitelist(allow_guest=False, allow_roles=[]):
	"""
	decorator for whitelisting a function
	
	Note: if the function is allowed to be accessed by a guest user,
	it must explicitly be marked as allow_guest=True
	
	for specific roles, set allow_roles = ['Administrator'] etc.
	"""
	def innerfn(fn):
		global whitelisted
		import webnotes
				
		if webnotes.session:
		 	if webnotes.session['user']=='Guest':
				# only methods explicitly flagged as "allow_guest"
				# to be added if user is "Guest"
				if allow_guest:
					whitelisted.append(fn)		
			else:
				if allow_roles:
					# if specific roles are mentioned,
					# add to whitelist only if user has that role
					roles = get_roles()
					for role in allow_roles:
						if role in roles:
							whitelisted.append(fn)
							break
				else:
					whitelisted.append(fn)

		return fn

	return innerfn
	
def clear_cache(user=None):
	"""clear boot cache"""
	from webnotes.session_cache import clear
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

def get_cgi_fields():
	"""make webnotes.form_dict from cgi field storage"""
	global auto_cache_clear, form, form_dict

	import conf
	auto_cache_clear = getattr(conf, 'auto_cache_clear', False)
	
	# make the form_dict
	import cgi
	form = cgi.FieldStorage(keep_blank_values=True)
	
	from webnotes.utils import cstr
	for key in form.keys():
		form_dict[key] = cstr(form.getvalue(key))

def comma_and(lst):
	if len(lst)==1: return lst[0]
	return ', '.join(lst[:-1]) + ' and ' + lst[-1]
	