"""
	Sync's doctype and docfields from txt files to database
	perms will get synced only if none exist
"""
import webnotes
import webnotes.model

# used during sync_install
doctypelist = {}

def sync_all(session, force=0):
	modules = []
	modules += sync_core_module(session, force)
	modules += sync_modules(session, force)
	try:
		session.db.begin()
		session.db.sql("DELETE FROM __CacheItem")
		session.db.commit()
	except Exception, e:
		if e[0]!=1146: raise e
	return modules

def sync_core_module(session, force=0):
	import os
	import core
	# doctypes

	sync_core(session)
	
	return walk_and_sync(session, os.path.abspath(os.path.dirname(core.__file__)), force)

def sync_modules(session, force=0):
	import conf
	return walk_and_sync(session, conf.modules_path, force)

def walk_and_sync(session, start_path, force=0):
	"""walk and sync all doctypes and pages"""
	import os
	from webnotes.modules import reload_doc

	session.syncing = True
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
					if not session.db.exists("Module Def", module_name):
						session.insert({"doctype": "Module Def",
							"module_name": module_name})
				
				# grand parent folder is doctype
				doctype = path.split(os.sep)[-2]
				
				# parent folder is the name
				name = path.split(os.sep)[-1]
				
				if doctype == 'doctype':
					sync_doctype(session, module_name, name, force)
				else:
					sync_doc(session, module_name, doctype, name, force)

	session.syncing = False
	
	return modules

def sync_doc(session, module_name, doctype, docname, force=0):
	"""reload doc from file, if modified"""
	doclist = load_doctypelist(module_name, doctype, docname)
	if is_unchanged(session, doclist, force):
		return
	
	orig_modified = doclist[0]['modified']

	session.db.begin()

	# delete doc and all children
	session.db.sql("""delete from `tab%s` where name=%s""" % (doclist[0]['doctype'], '%s'),
		doclist[0]['name'])
		
	for tf in session.db.get_table_fields(doclist[0]['doctype']):
		session.db.sql("""delete from `tab%s` where parent=%s""" % (tf.options, '%s'),
			doclist[0]['name'])
			
	session.insert(doclist)
	update_modified(session, orig_modified, doclist)
	
	session.db.commit()
	print module_name, '|', doctype, '|', docname


# docname in small letters with underscores
def sync_doctype(session, module_name, docname, force=0):
	"""sync doctype from file if modified"""
	doclist = load_doctypelist(module_name, 'doctype', docname)
		
	if is_unchanged(session, doclist, force):
		return
	
	orig_modified = doclist[0]['modified']
		
	session.db.begin()
	
	delete_doctype_docfields(session, doclist)
	save_doctype_docfields(session, doclist)
	save_perms_if_none_exist(session, doclist)
	update_modified(session, orig_modified, doclist)
	
	session.db.commit()
	print module_name, '|', docname

def update_modified(session, orig_modified, doclist):
	session.db.sql("""UPDATE `tab{doctype}` 
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

def is_unchanged(session, doclist, force):
	if not doclist:
		print doclist
		raise Exception('DocList could not be evaluated')
		
	modified = doclist[0]['modified']
	if not force and modified == str(session.db.get_value(doclist[0].get('doctype'), 
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

def delete_doctype_docfields(session, doclist):
	parent = doclist[0].get('name')
	if not parent: raise Exception('Could not determine parent')
	session.db.sql("DELETE FROM `tabDocType` WHERE name=%s", parent)
	session.db.sql("DELETE FROM `tabDocField` WHERE parent=%s", parent)

def save_doctype_docfields(session, doclist):
	global doctypelist
	from webnotes.model.doc import Document
	from webnotes.modules import scrub
	parent_doc = Document(fielddata=doclist[0])
	parent_doc.save(session, 1, doctypelist=doctypelist.get("doctype"))
	idx = 1
	for d in doclist:
		if d.get('doctype') != 'DocField': continue
		d['idx'] = idx
		Document(fielddata=d).save(session, 1, doctypelist.get("docfield"))
		idx += 1
	
	update_schema(session, parent_doc.name)

def update_schema(session, docname):
	from webnotes.model.db_schema import updatedb
	updatedb(session, docname)
	
	from webnotes.model.doctype import clear_cache
	clear_cache(session, docname)

def save_perms_if_none_exist(session, doclist):
	global doctypelist
	res = session.db.sql("""SELECT name FROM `tabDocPerm`
			WHERE parent=%s""", doclist[0].get('name'))
	if res and res[0].name: return

	from webnotes.model.doc import Document
	from webnotes.modules import scrub
	for d in doclist:
		if d.get('doctype') != 'DocPerm': continue
		Document(fielddata=d).save(session, 1, doctypelist=doctypelist.get("docperm"))

def sync_core(session):
	global doctypelist
	from webnotes.model.doclist import objectify
	doctypelist["doctype"] = objectify(session, load_doctypelist("core", "doctype", "doctype"))
	doctypelist["docfield"] = objectify(session, load_doctypelist("core", "doctype", "docfield"))
	doctypelist["docperm"] = objectify(session, load_doctypelist("core", "doctype", "docperm"))
		
	# sync required doctypes first
	sync_doctype(session, "core", "docperm")
	sync_doctype(session, "core", "docfield")
	sync_doctype(session, "core", "custom_field")
	sync_doctype(session, "core", "property_setter")
	sync_doctype(session, "core", "doctype_validator")
	sync_doctype(session, "core", "doctype")
	sync_doctype(session, "core", "role")
	sync_doctype(session, "core", "defaultvalue")
	sync_doctype(session, "core", "module_def")
	sync_doctype(session, "core", "profile")
	sync_doctype(session, "core", "userrole")
	
def sync_install(session, force=1):
	# load required doctypes' doclist
	sync_core(session)
	
	# install default core records
	load_install_docs(session, ["core"])
	run_startup_install(session, "execute_core")
	
	# sync all doctypes
	modules = sync_all(session, force)
	
	# load install docs
	if "core" in modules: del modules[modules.index("core")]
	load_install_docs(session, modules)
	
	# run startup install
	run_startup_install(session)
	
def run_startup_install(session, method="execute"):
	print "executing startup install"
	from startup import install
	if hasattr(install, method):
		session.db.begin()
		getattr(install, method)(session)
		session.db.commit()
	

def load_install_docs(session, modules):
	import os
	if isinstance(modules, basestring): modules = [modules]
	
	for module_name in modules:
		module = __import__(module_name)
		if hasattr(module, 'install_docs'):
			session.db.begin()

			for data in module.install_docs:
				if data.get('name'):
					if not session.db.exists(data['doctype'], data.get('name')):
						create_doc(session, data)
				elif not session.db.exists(data):
					create_doc(session, data)
			
			session.db.commit()
			
		if hasattr(module, 'module_init'):
			module.module_init(session)

def create_doc(session, data):
	from webnotes.model.doc import Document
	d = Document(fielddata = data)
	d.save(session, 1)
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


