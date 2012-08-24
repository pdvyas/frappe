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
	Export files to modules
"""

from webnotes.modules import scrub, get_module_path

def export_to_files(record_list=[], record_module=None, verbose=0):
	"""
		Export record_list to files. record_list is a list of lists ([doctype],[docname] )  ,
	"""
	import webnotes.model.doc
	module_doclist =[]
	if record_list:
		for record in record_list:
			doclist = webnotes.model.doc.get(record[0], record[1])
			write_document_file(doclist, record_module)

def create_init_py(modules_path, dt, dn):
	"""
		Creates __init__.py in the module directory structure
	"""
	import os

	def create_if_not_exists(path):
		initpy = os.path.join(path, '__init__.py')
		if not os.path.exists(initpy):
			open(initpy, 'w').close()
	
	create_if_not_exists(os.path.join(modules_path))
	create_if_not_exists(os.path.join(modules_path, dt))
	create_if_not_exists(os.path.join(modules_path, dt, dn))
	
def create_folder(module, dt, dn):
	"""
		Creates directories for module and their __init__.py
	"""
	import webnotes, os
	
	# get module path by importing the module
	modules_path = get_module_path(module)
			
	# create folder
	folder = os.path.join(modules_path, scrub(dt), scrub(dn))
	
	webnotes.create_folder(folder)
	
	# create init_py_files
	if scrub(dt) in ('doctype', 'page'):
		create_init_py(modules_path, scrub(dt), scrub(dn))
	
	return folder

def get_module_name(doclist, record_module=None):
	"""Returns the module-name of a doclist"""
	# module name
	if doclist[0]['doctype'] == 'Module Def':
		module = doclist[0]['name']
	elif doclist[0]['doctype']=='Control Panel':
		module = 'Core'
	elif record_module:
		module = record_module
	else:
		module = doclist[0]['module']
	return module
	
def write_document_file(doclist, record_module=None):
	"""Write a doclist to file, at [module]/[doctype]/[name]/[name.txt]"""

	module = get_module_name(doclist, record_module)
	
	# create folder
	folder = create_folder(module, doclist[0]['doctype'], doclist[0]['name'])
	
	# separate code files
	clear_code_fields(doclist, folder)
	
	write_txt(doclist, folder)
	
def write_txt(doclist, path):
	"""write pretty txt at the given path"""
	from webnotes.model.utils import pprint_doclist
	import os

	fname = scrub(doclist[0]['name'])
	with open(os.path.join(path, fname +'.txt'),'w+') as txtfile:
		txtfile.write(pprint_doclist(doclist))

def clear_code_fields(doclist, folder):
	"""Removes code from the doc"""
	import os
	import webnotes
	# code will be in the parent only
	code_fields = webnotes.code_fields_dict.get(doclist[0]['doctype'], [])
	
	for code_field in code_fields:
		if doclist[0].get(code_field[0]):

			doclist[0][code_field[0]] = None

def export_for_test(doclist):
	"""create a folder for the doctype if exists and write txt"""
	import os, conf, webnotes
		
	# convert to dicts if passed as Document objects
	if hasattr(doclist[0], 'fields'):
		doclist = [d for d in doclist]

	doctype = scrub(doclist[0]['doctype'])
	doctype_path = os.path.join(conf.test_data_path, doctype)
	if not os.path.exists(doctype_path):
		webnotes.create_folder(doctype_path)
	
	write_txt(doclist, doctype_path)
	
def get_test_doclist(doctype, name=None):
	"""get test doclist, collection of doclists"""
	import os, conf, webnotes
	from webnotes.model.utils import peval_doclist

	doctype = scrub(doctype)
	doctype_path = os.path.join(conf.test_data_path, doctype)
	
	if name:
		with open(os.path.join(doctype_path, scrub(name) + '.txt'), 'r') as txtfile:
			doclist = peval_doclist(txtfile.read())

		return doclist
		
	else:
		all_doclists = []
		for fname in filter(lambda n: n.endswith('.txt'), os.listdir(doctype_path)):
			with open(os.path.join(doctype_path, scrub(fname)), 'r') as txtfile:
				all_doclists.append(peval_doclist(txtfile.read()))
		
		return all_doclists
