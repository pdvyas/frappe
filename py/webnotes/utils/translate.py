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

# source:
# 1. in doctype / page - walk modules (core / modules_path)- js, controllers
# 2. in database
# 3. framework - one common locale folder for all framework code

# translation files:
# 1. put in locale folder in doctype/locale, page/locale, py/webnotes/locale, js/wn/locale
# 2. one json file for each language

# when loading
# 1. doctype (attach language files)
# 2. page
# 3. boot (attach language files for js)

# methods
# 1. _ in webnotes
# 2. _ in wn

from __future__ import unicode_literals

import webnotes, conf
import os
import json

messages = {}

def build_message_files():
	"""build from doctypes, pages, database and framework"""
	build_from_doctypes('lib/py/core')
	build_from_doctypes(conf.modules_path)
	build_from_database()
	build_for_framework('lib/py/webnotes', 'py')
	build_for_framework('lib/js/wn', 'js')
	
def build_from_database():
	"""make doctype labels, names, options, descriptions"""
	from webnotes.modules import get_doc_path
	
	for doctype in webnotes.conn.sql("""select name, description, module from tabDocType"""):
		doctype_path = get_doc_path(doctype.module, 'DocType', doctype.name)
		
		# if module and doctype folder exists
		if doctype.module and os.path.exists(doctype_path):
			messages = [doctype.name, doctype.description]
				
			for docfield in webnotes.conn.sql("""select label, description, options, fieldtype 
				from tabDocField where parent=%s""", doctype.name):
				messages += [docfield.label, docfield.description]
				if docfield.fieldtype=='Select' and docfield.options \
					and not docfield.options.startswith("link:") \
					and not docfield.options.startswith("attach_files:"):
					messages += docfield.options.split('\n')
				
			write_locale_file(doctype_path, messages, 'doc')

def build_for_framework(path, mtype):
	"""make locale files for framework py and js (all)"""
	messages = []
	for (base_path, folders, files) in os.walk(path):
		for fname in files:
			if fname.endswith('.' + mtype):
				messages += get_message_list(os.path.join(base_path, fname))
				
	if messages:
		write_locale_file(path, messages, mtype)
	
	
def build_from_doctypes(path):
	"""walk and make locale files in all folders"""
	for (base_path, folders, files) in os.walk(path):
		messagespy = []
		messagesjs = []
		for fname in files:
			if fname.endswith('py'):
				messagespy += get_message_list(os.path.join(base_path, fname))
			if fname.endswith('js'):
				messagesjs += get_message_list(os.path.join(base_path, fname))

		if messagespy:
			write_locale_file(base_path, messagespy, 'py')

		if messagespy:
			write_locale_file(base_path, messagesjs, 'js')

def get_message_list(path):
	"""get list of messages from a code file"""
	import re
	messages = []
	with open(path, 'r') as sourcefile:
		txt = sourcefile.read()
		messages += re.findall('_\("([^"]*)"\)', txt)
		messages += re.findall('_\("{3}([^"]*)"{3}\)', txt, re.S)	
		
	return messages
	
def write_locale_file(path, messages, mtype):
	"""write messages to translation file"""
	if not os.path.exists(os.path.join(path, 'locale')):
		os.makedirs(os.path.join(path, 'locale'))
	
	fname = os.path.join(path, 'locale', '_messages_' + mtype + '.json')
	with open(fname, 'w') as msgfile:
		msgfile.write(json.dumps(filter(None, messages), indent=1))
		
	print fname

def all_messages(outfile):
	"""get list of all messages"""
	messages = []
	for (base_path, folders, files) in os.walk('.'):
		for fname in files:
			if fname.startswith('_messages_'):
				with open(os.path.join(base_path, fname), 'r') as msgfile:
					messages += json.loads(msgfile.read())
					
	messages = list(set(messages))
	messages.sort()
	if outfile:
		from csv import writer
		with open(outfile, 'w') as msgfile:
			w = writer(msgfile)
			for m in messages:
				w.writerow([m.encode('utf-8')])
	
def load_messages(messages, lang):
	"""make individual message files for each language"""