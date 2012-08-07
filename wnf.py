#!/usr/bin/python

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
import os, sys

def replace_code(start, txt1, txt2, extn, search=None):
	"""replace all txt1 by txt2 in files with extension (extn)"""
	import webnotes.utils
	import os, re
	esc = webnotes.utils.make_esc('[]')
	if not search: search = esc(txt1)
	for wt in os.walk(start, followlinks=1):
		for fn in wt[2]:
			if fn.split('.')[-1]==extn:
				fpath = os.path.join(wt[0], fn)
				with open(fpath, 'r') as f:
					content = f.read()
			
				if re.search(search, content):
					res = search_replace_with_prompt(fpath, txt1, txt2)
					if res == 'skip':
						return 'skip'



def search_replace_with_prompt(fpath, txt1, txt2):
	""" Search and replace all txt1 by txt2 in the file with confirmation"""
	import re

	from termcolor import colored
	with open(fpath, 'r') as f:
		content = f.readlines()

	tmp = []
	changed = False
	for c in content:
		match = re.search(txt1, c)
		if match:
			print fpath
			print colored(match.group(), 'red').join(c[:-1].split(match.group()))
			a = ''
			while a.lower() not in ['y', 'n', 'skip']:
				a = raw_input('Do you want to Change [y/n/skip]?')
			if a.lower() == 'y':
				c = re.sub(txt1, txt2, c)
				changed = True
			elif a.lower() == 'skip':
				return 'skip'
			else:
				continue
		tmp.append(c)

	if changed:
		with open(fpath, 'w') as f:
			f.write(''.join(tmp))
		print colored('Updated', 'green')
	
def pull(remote, branch):
	os.system('git pull %s %s' % (remote, branch))
	os.system('cd lib && git pull %s %s' % (remote, branch))
	
def apply_latest_patches():
	import webnotes.modules.patch_handler
	webnotes.modules.patch_handler.run_all()
	print '\n'.join(webnotes.modules.patch_handler.log_list)
	
def sync_all(force=0):
	import webnotes.model.sync
	webnotes.model.sync.sync_all(force)

def update_erpnext(remote='origin', branch='master'):
	# do a pull
	pull(remote, branch)
	
	# apply latest patches
	apply_latest_patches()
	
	import webnotes.modules.patch_handler
	for l in webnotes.modules.patch_handler.log_list:
		if "failed: STOPPED" in l:
			return
	
	# sync all
	sync_all()
	
def append_future_import():
	"""appends from __future__ import unicode_literals to py files if necessary"""
	import os
	import conf
	conf_path = os.path.abspath(conf.__file__)
	if conf_path.endswith("pyc"):
		conf_path = conf_path[:-1]
	
	base_path = os.path.dirname(conf_path)
	
	for path, folders, files in os.walk(base_path):
		for f in files:
			if f.endswith('.py'):
				file_path = os.path.join(path, f)
				with open(file_path, 'r') as pyfile:
					content = pyfile.read()
				future_import = 'from __future__ import unicode_literals'

				if future_import in content: continue

				content = content.split('\n')
				idx = -1
				for c in content:
					idx += 1
					if c and not c.startswith('#'):
						break
				content.insert(idx, future_import)
				content = "\n".join(content)
				with open(file_path, 'w') as pyfile:
					pyfile.write(content)

def setup_options():
	from optparse import OptionParser
	parser = OptionParser()

	parser.add_option("-d", "--db",
						dest="db_name",
						help="Apply the patches on given db")
	parser.add_option("--password",
						help="Password for given db", nargs=1)

	# build
	parser.add_option("-b", "--build", default=False, action="store_true",
						help="minify + concat js files")
						
	parser.add_option("--build_web_cache", default=False, action="store_true",
						help="build web cache")

	parser.add_option("--domain", metavar="DOMAIN",
						help="store domain in Website Settings", nargs=1)

	# git
	parser.add_option("--status", default=False, action="store_true",
						help="git status")
	parser.add_option("--pull", nargs=2, default=False,
						metavar = "remote branch",
						help="git pull (both repos)")
	parser.add_option("--push", nargs=3, default=False, 
						metavar = "remote branch comment",
						help="git commit + push (both repos) [remote] [branch] [comment]")
	parser.add_option("--checkout", nargs=1, default=False, 
						metavar = "branch",
						help="git checkout [branch]")						
						
	parser.add_option("-l", "--latest",
						action="store_true", dest="run_latest", default=False,
						help="Apply the latest patches")

	# patch
	parser.add_option("-p", "--patch", nargs=1, dest="patch_list", metavar='patch_module',
						action="append",
						help="Apply patch")
	parser.add_option("-f", "--force",
						action="store_true", dest="force", default=False,
						help="Force Apply all patches specified using option -p or --patch")
	parser.add_option('--reload_doc', nargs=3, metavar = "module doctype docname",
						help="reload doc")
	parser.add_option('--export_doc', nargs=2, metavar = "doctype docname",
						help="export doc")

	# install
	parser.add_option('--install', nargs=2, metavar = "dbname source",
						help="install fresh db")
	
	# diff
	parser.add_option('--diff_ref_file', nargs=0, \
						help="Get missing database records and mismatch properties, with file as reference")
	parser.add_option('--diff_ref_db', nargs=0, \
						help="Get missing .txt files and mismatch properties, with database as reference")

	# scheduler
	parser.add_option('--run_scheduler', default=False, action="store_true",
						help="Trigger scheduler")
	parser.add_option('--run_scheduler_event', nargs=1, metavar="[all|daily|weekly|monthly]",
						help="Run scheduler event")

	# misc
	parser.add_option("--replace", nargs=4, default=False, 
						metavar = "start_path search_txt replace_by_txt extension",
						help="file search-replace")
	
	parser.add_option("--sync_all", help="Synchronize all DocTypes using txt files",
			nargs=0)
	
	parser.add_option("--sync", help="Synchronize given DocType using txt file",
			nargs=2, metavar="module doctype (use their folder names)")
			
	parser.add_option("--update", help="Pull, run latest patches and sync all",
			nargs=2, metavar="ORIGIN BRANCH")
			
	parser.add_option("--cleanup_data", help="Cleanup test data", default=False, 	
			action="store_true")
			
	parser.add_option("--append_future_import", default=False, action="store_true", 
			help="append from __future__ import unicode literals to py files")

	# testing
	parser.add_option("--test", help="Run test", metavar="MODULE", 	
			nargs=1)

	parser.add_option("--setup_test_stage", help="""Reset test database and commit data 
		upto a stage. See tests/stages.py for list of stages""", 
		metavar="STAGE", nargs=1)

	parser.add_option("--test_stage", help="""Run test modules specified in the stage. 
		See tests/stages.py for list of stages""", 
		metavar="STAGE", nargs=1)

	parser.add_option("--test_export", help="""Export data for tests at conf.test_data_path
		If name is *, all records are exported""", 
		metavar="DOCTYPE NAME", nargs=2)

	return parser.parse_args()
	
def run():
	sys.path.append('.')
	sys.path.append('lib/py')
	import webnotes
	import conf
	sys.path.append(conf.modules_path)

	(options, args) = setup_options()


	from webnotes.db import Database
	import webnotes.modules.patch_handler

	# connect
	if options.db_name is not None:
		if options.password:
			webnotes.connect(options.db_name, options.password)
		else:
			webnotes.connect(options.db_name)
	elif not any([options.install, options.pull]):
		webnotes.connect(conf.db_name)

	# build
	if options.build:
		import build.project
		build.project.build()	

	# code replace
	elif options.replace:
		replace_code(options.replace[0], options.replace[1], options.replace[2], options.replace[3])
			
	# git
	elif options.status:
		os.system('git status')
		os.chdir('lib')
		os.system('git status')
	
	elif options.pull:
		pull(options.pull[0], options.pull[1])

	elif options.push:
		os.system('git commit -a -m "%s"' % options.push[2])
		os.system('git push %s %s' % (options.push[0], options.push[1]))
		os.chdir('lib')
		os.system('git commit -a -m "%s"' % options.push[2])
		os.system('git push %s %s' % (options.push[0], options.push[1]))
		
	elif options.checkout:
		os.system('git checkout %s' % options.checkout)
		os.chdir('lib')
		os.system('git checkout %s' % options.checkout)
			
	# patch
	elif options.patch_list:
		# clear log
		webnotes.modules.patch_handler.log_list = []
		
		# run individual patches
		for patch in options.patch_list:
			webnotes.modules.patch_handler.run_single(\
				patchmodule = patch, force = options.force)
		
		print '\n'.join(webnotes.modules.patch_handler.log_list)
	
		# reload
	elif options.reload_doc:
		webnotes.modules.patch_handler.reload_doc(\
			{"module":options.reload_doc[0], "dt":options.reload_doc[1], "dn":options.reload_doc[2]})		
		print '\n'.join(webnotes.modules.patch_handler.log_list)

	elif options.export_doc:
		from webnotes.modules import export_doc
		export_doc(options.export_doc[0], options.export_doc[1])

	# run all pending
	elif options.run_latest:
		apply_latest_patches()
	
	elif options.install:
		from webnotes.install_lib.install import Installer
		inst = Installer('root')
		inst.import_from_db(options.install[0], source_path=options.install[1], \
			password='admin', verbose = 1)
			
	
	elif options.diff_ref_file is not None:
		import webnotes.modules.diff
		webnotes.modules.diff.diff_ref_file()

	elif options.diff_ref_db is not None:
		import webnotes.modules.diff
		webnotes.modules.diff.diff_ref_db()
	
	elif options.run_scheduler:
		import webnotes.utils.scheduler
		print webnotes.utils.scheduler.execute()
	
	elif options.run_scheduler_event is not None:
		import webnotes.utils.scheduler
		print webnotes.utils.scheduler.trigger('execute_' + options.run_scheduler_event)
		
	elif options.sync_all is not None:
		sync_all(options.force or 0)

	elif options.sync is not None:
		import webnotes.model.sync
		webnotes.model.sync.sync(options.sync[0], options.sync[1], options.force or 0)
	
	elif options.update:
		update_erpnext(options.update[0], options.update[1])

	elif options.cleanup_data:
		from utilities import cleanup_data
		cleanup_data.run()
		
	elif options.domain:
		webnotes.conn.set_value('Website Settings', None, 'subdomain', options.domain)
		webnotes.conn.commit()
		print "Domain set to", options.domain
		
	elif options.build_web_cache:
		import website.web_cache
		website.web_cache.refresh_cache(True)
		
	elif options.append_future_import:
		append_future_import()

	# print messages
	if webnotes.message_log:
		print '\n'.join(webnotes.message_log)
		
	# we do not want to print message log [logged by webnotes.msgprint] for tests
	if options.test is not None:
		module_name = options.test
		import unittest
		
		del sys.argv[1:]
		# is there a better way?
		exec ('from %s import *' % module_name) in globals()		
		unittest.main()

	elif options.setup_test_stage is not None:
		import tests.stages
		tests.stages.upto(options.setup_test_stage)

	elif options.test_stage is not None:
		import tests.stages
		del sys.argv[1:]
		tests.stages.test_stage(options.test_stage)

	elif options.test_export is not None:
		from webnotes.modules.export import export_for_test
		import webnotes.model
				
		if options.test_export[1]=='*':
			for d in webnotes.conn.sql("""select name from `tab%s`""" % options.test_export[0]):
				export_for_test(webnotes.model.get(options.test_export[0], d[0]))
		else:
			export_for_test(webnotes.model.get(options.test_export[0], options.test_export[1]))

if __name__=='__main__':
	run()
