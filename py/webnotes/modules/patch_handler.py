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
"""
	Execute Patch Files

	Patch files usually lie in the "patches" module specified by "modules_path" in defs.py

	To run directly
	
	python lib/wnf.py patch patch1, patch2 etc
	python lib/wnf.py patch -f patch1, patch2 etc
	
	where patch1, patch2 is module name
"""
import webnotes.utils

def run_all(session, patch_dict=None):
	"""run all pending patches"""
	import patches.patch_list
	patch_dict = patch_dict or patches.patch_list.patch_dict
	
	# special patch: version 00_00 executed first
	if patch_dict.get('00_00'):
		executed = get_executed_patches(session)
		run_single_version(session, '00_00', patch_dict['00_00'], executed)
		
	# execute pending patches
	executed = get_executed_patches(session)
	for version in sorted(patch_dict):
		if version >= session.db.get_default('patch_version'):
			ret = run_single_version(session, version, patch_dict[version], executed)
			if ret == 'error': return
			
	
def run_single_version(session, version, patch_list, executed):
	for p in patch_list:
		pn = 'patches.' + version + '.' + p
		if pn not in executed:
			if not run_single(session, patchmodule = pn):
				log(pn + ': failed: STOPPED')
				return 'error'
	if version != '00_00':
		session.db.set_default('patch_version', version)	
	
def reload_doc(session, args):
	"""relaod a doc args {module, doctype, docname}"""	
	import webnotes.modules
	run_single(session, method = webnotes.modules.reload_doc, methodargs = args)

def run_single(session, patchmodule=None, method=None, methodargs=None, force=False):
	"""run a single patch"""
	import conf
	
	# don't write txt files
	conf.developer_mode = 0
	
	if force or method or not get_executed_patches(session, patchmodule):
		return execute_patch(session, patchmodule, method, methodargs)
	else:
		return True
		
def execute_patch(session, patchmodule, method=None, methodargs=None):
	"""execute the patch"""
	success = False
	block_user(session, True)
	session.db.begin()
	log('Executing %s in %s' % (patchmodule or str(methodargs), session.db.cur_db_name))
	try:
		if patchmodule:
			patch = __import__(patchmodule, fromlist=[patchmodule.split(".")[-1]])
			getattr(patch, 'execute')()
			update_patch_log(session, patchmodule)
			log('Success')
		elif method:
			method(**methodargs)
			
		session.db.commit()
		success = True
	except Exception, e:
		session.db.rollback()
		global has_errors
		has_errors = True
		tb = webnotes.utils.getTraceback()
		log(tb)
		import os
		if os.environ.get('HTTP_HOST'):
			add_to_patch_log(tb)

	block_user(session, False)
	return success

def add_to_patch_log(tb):
	"""add error log to patches/patch.log"""
	import conf, os
	with open(os.path.join(conf.modules_path,'erpnext','patches','patch.log'),'a') as patchlog:
		patchlog.write('\n\n' + tb)
	
def update_patch_log(session, patchmodule):
	"""update patch_file in patch log"""
	session.db.sql("""INSERT INTO `__PatchLog` VALUES (%s, now())""", \
		patchmodule)

def get_executed_patches(session, patchmodule=None):
	"""return True if is executed"""
	if patchmodule:
		p = session.db.sql("""select patch from __PatchLog where patch=%s""", patchmodule)
		if p:
			print "Patch %s already executed in %s" % (patchmodule, session.db.cur_db_name)
		return p
	else:
		return [p.patch for p in session.db.sql("""select distinct patch from __PatchLog""")]
	
def block_user(session, block):
	"""stop/start execution till patch are run"""
	session.db.begin()
	msg = "Patches are being executed in the system. Please try again in a few moments."
	session.db.set_global('__session_status', block and 'stop' or None)
	session.db.set_global('__session_status_message', block and msg or None)
	session.db.commit()

log_list = []
has_errors = False
def log(msg):
	log_list.append(msg)
