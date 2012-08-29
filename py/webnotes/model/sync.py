from __future__ import unicode_literals
"""
	Sync's doctype and docfields from txt files to database
	perms will get synced only if none exist
"""
import webnotes
import webnotes.model

# used during sync_install
doctypelist = {}

def sync_all(force=0):
	modules = []
	modules += sync_core_module(force)
	modules += sync_modules(force)
	try:
		webnotes.conn.begin()
		webnotes.conn.sql("DELETE FROM __CacheItem")
		webnotes.conn.commit()
	except Exception, e:
		if e[0]!=1146: raise e
	return modules

def sync_core_module(force=0):
	import os
	import core
	# doctypes

	sync_core()
	
	return walk_and_sync(os.path.abspath(os.path.dirname(core.__file__)), force)

def sync_modules(force=0):
	import conf
	return walk_and_sync(conf.modules_path, force)

def walk_and_sync(start_path, force=0):
	"""walk and sync all doctypes and pages"""
	import os
	import webnotes
	from webnotes.modules import reload_doc

	webnotes.syncing = True
	modules = []

	for path, folders, files in os.walk(start_path):
		if 'tests' in folders:
			folders.remove('tests')
		
		for f in files:
			if f.endswith(".txt"):
				# great grand-parent folder is module_name
				module_name = path.split(os.sep)[-3]
				if not module_name in modules:
					modules.append(module_name)
				
				# grand parent folder is doctype
				doctype = path.split(os.sep)[-2]
				
				# parent folder is the name
				name = path.split(os.sep)[-1]
				
				if doctype == 'doctype':
					sync_doctype(module_name, name, force)
				else:
					sync_doc(module_name, doctype, name, force)

	for m in modules:
		if not webnotes.conn.exists("Module Def", m):
			webnotes.model.insert({"doctype": "Module Def", "module_name": m})
	
	webnotes.syncing = False
	
	return modules

def sync_doc(module_name, doctype, docname, force=0):
	"""reload doc from file, if modified"""
	doclist = load_doctypelist(module_name, doctype, docname)
	if is_unchanged(doclist, force):
		return
	
	orig_modified = doclist[0]['modified']

	webnotes.conn.begin()

	# delete doc and all children
	webnotes.conn.sql("""delete from `tab%s` where name=%s""" % (doclist[0]['doctype'], '%s'),
		doclist[0]['name'])
		
	for tf in webnotes.model.get_table_fields(doclist[0]['doctype']):
		webnotes.conn.sql("""delete from `tab%s` where parent=%s""" % (tf.options, '%s'),
			doclist[0]['name'])
			
	webnotes.model.insert(doclist)
	update_modified(orig_modified, doclist)
	
	webnotes.conn.commit()
	print module_name, '|', doctype, '|', docname


# docname in small letters with underscores
def sync_doctype(module_name, docname, force=0):
	"""sync doctype from file if modified"""
	doclist = load_doctypelist(module_name, 'doctype', docname)
		
	if is_unchanged(doclist, force):
		return
	
	orig_modified = doclist[0]['modified']
		
	webnotes.conn.begin()
	
	delete_doctype_docfields(doclist)
	save_doctype_docfields(doclist)
	save_perms_if_none_exist(doclist)
	update_modified(orig_modified, doclist)
	
	webnotes.conn.commit()
	print module_name, '|', docname

def update_modified(orig_modified, doclist):
	webnotes.conn.sql("""UPDATE `tab{doctype}` 
		SET modified=%s WHERE name=%s""".format(doctype=doclist[0]['doctype']),
			(orig_modified, doclist[0]['name']))

def load_doctypelist(module_name, doctype, docname):
	try:
		with open(get_file_path(module_name, doctype, docname), 'r') as f:
			from webnotes.model.utils import peval_doclist
			doclist = peval_doclist(f.read())
		return doclist
	except SyntaxError, e:
		print 'Bad txt file:' + get_file_path(module_name, doctype, docname)

def is_unchanged(doclist, force):
	modified = doclist[0]['modified']
	if not doclist:
		raise Exception('DocList could not be evaluated')
	if not force and modified == str(webnotes.conn.get_value(doclist[0].get('doctype'), 
		doclist[0].get('name'), 'modified')):
		return True
		
	return False
		
def get_file_path(module_name, doctype, docname):
	if not (module_name and docname):
		raise Exception('No Module Name or DocName specified')
	import os
	module = __import__(module_name)
	module_init_path = os.path.abspath(module.__file__)
	module_path = os.sep.join(module_init_path.split(os.sep)[:-1])
	return os.sep.join([module_path, doctype, docname, docname + '.txt'])

def delete_doctype_docfields(doclist):
	parent = doclist[0].get('name')
	if not parent: raise Exception('Could not determine parent')
	webnotes.conn.sql("DELETE FROM `tabDocType` WHERE name=%s", parent)
	webnotes.conn.sql("DELETE FROM `tabDocField` WHERE parent=%s", parent)

def save_doctype_docfields(doclist):
	global doctypelist
	from webnotes.model.doc import Document
	from webnotes.modules import scrub
	parent_doc = Document(fielddata=doclist[0])
	parent_doc.save(1, doctypelist=doctypelist.get("doctype"))
	idx = 1
	for d in doclist:
		if d.get('doctype') != 'DocField': continue
		d['idx'] = idx
		Document(fielddata=d).save(1, doctypelist.get("docfield"))
		idx += 1
	
	update_schema(parent_doc.name)

def update_schema(docname):
	from webnotes.model.db_schema import updatedb
	updatedb(docname)

	from webnotes.model.doctype import clear_cache
	clear_cache(docname)

def save_perms_if_none_exist(doclist):
	global doctypelist
	res = webnotes.conn.sql("""SELECT name FROM `tabDocPerm`
			WHERE parent=%s""", doclist[0].get('name'))
	if res and res[0].name: return

	from webnotes.model.doc import Document
	from webnotes.modules import scrub
	for d in doclist:
		if d.get('doctype') != 'DocPerm': continue
		Document(fielddata=d).save(1, doctypelist=doctypelist.get("docperm"))

def sync_core():
	global doctypelist
	from webnotes.model.doclist import objectify
	doctypelist["doctype"] = objectify(load_doctypelist("core", "doctype", "doctype"))
	doctypelist["docfield"] = objectify(load_doctypelist("core", "doctype", "docfield"))
	doctypelist["docperm"] = objectify(load_doctypelist("core", "doctype", "docperm"))
		
	# sync required doctypes first
	sync_doctype("core", "docperm")
	sync_doctype("core", "docfield")
	sync_doctype("core", "custom_field")
	sync_doctype("core", "property_setter")
	sync_doctype("core", "doctype_validator")
	sync_doctype("core", "doctype")
	
def sync_install(force=1):
	# load required doctypes' doclist
	sync_core()
	
	# sync all doctypes
	modules = sync_all(force)
	
	# load install docs
	load_install_docs(modules)
	
	# run startup install
	run_startup_install()
	
def run_startup_install():
	print "executing startup install"
	from startup import install
	if hasattr(install, 'execute'):
		webnotes.conn.begin()
		install.execute()
		webnotes.conn.commit()
	

def load_install_docs(modules):
	import os
	if isinstance(modules, basestring): modules = [modules]
	
	for module_name in modules:
		module = __import__(module_name)
		if hasattr(module, 'install_docs'):
			webnotes.conn.begin()

			for data in module.install_docs:
				if data.get('name'):
					if not webnotes.conn.exists(data['doctype'], data.get('name')):
						create_doc(data)
				elif not webnotes.conn.exists(data):
					create_doc(data)
			
			webnotes.conn.commit()
			
		if hasattr(module, 'module_init'):
			module.module_init()

def create_doc(data):
	from webnotes.model.doc import Document
	d = Document(fielddata = data)
	d.save(1)
	print 'Created %(doctype)s %(name)s' % d

import unittest
class TestSync(unittest.TestCase):
	def setUp(self):
		self.test_case = {
			'module_name': 'selling',
			'docname': 'sales_order'
		}
		webnotes.conn.begin()

	def tearDown(self):
		pass
		#from webnotes.utils import cstr
		#webnotes.conn.rollback()

	def test_sync(self):
		#old_doctype, old_docfields = self.query('Profile')
		#self.parent = sync(self.test_case.get('module_name'), self.test_case.get('docname'))
		#new_doctype, new_docfields = self.query(self.parent)
		#self.assertNotEqual(old_doctype, new_doctype)
		#self.assertNotEqual(old_docfields, new_docfields)

		#from webnotes.utils import cstr
		#print new_doctype[0]
		#print
		#print "\n".join((cstr(d) for d in new_docfields))
		#print "\n\n"
		pass

	def test_sync_all(self):
		sync_all()

	def query(self, parent):
		doctype = webnotes.conn.sql("SELECT name FROM `tabDocType` \
			WHERE name=%s", parent)
		docfields = webnotes.conn.sql("SELECT idx, fieldname, label, fieldtype FROM `tabDocField` \
			WHERE parent=%s order by idx", parent)
		#doctype = webnotes.conn.sql("SELECT * FROM `tabDocType` \
		#	WHERE name=%s", parent)
		#docfields = webnotes.conn.sql("SELECT * FROM `tabDocField` \
		#	WHERE parent=%s order by idx", parent)
		return doctype, docfields


