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
# 1. in doctype / page - walk modules (core / modules_path)- js, controllers [x]
# 2. in database [x]
# 3. framework - one common locale folder for all framework code [x]

# translation files:
# 1. put in locale folder in doctype/locale, page/locale, py/webnotes/locale, js/wn/locale [x]
# 2. one json file for each language [x]

# when loading
# 1. doctype (attach language files) [x]
# 2. page [x]
# 3. boot (framework js)
# 4. add while loading controller [x]
# 5. start of request (framework py)

# methods
# 1. _ in webnotes [x]
# 2. _ in wn [x]

from __future__ import unicode_literals

import webnotes, conf
import os
import codecs
import json
import requests

messages = {}

def build_message_files():
	"""build from doctypes, pages, database and framework"""
	build_from_doctypes('lib/py/core')
	build_from_doctypes(conf.modules_path)
	build_from_database()
	build_for_framework('lib/py/webnotes', 'py')
	build_for_framework('lib/js/wn', 'js')
	build_for_framework(os.path.join(conf.modules_path, 'startup'), 'js')
	
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
	for (basepath, folders, files) in os.walk(path):
		for fname in files:
			if fname.endswith('.' + mtype):
				messages += get_message_list(os.path.join(basepath, fname))
				
				
	# append module names
	messages += [m.name for m in webnotes.conn.sql("""select name from `tabModule Def`""")]
	
	if messages:
		write_locale_file(path, messages, mtype)
	
def build_from_doctypes(path):
	"""walk and make locale files in all folders"""
	for (basepath, folders, files) in os.walk(path):
		messagespy = []
		messagesjs = []
		for fname in files:
			if fname.endswith('py'):
				messagespy += get_message_list(os.path.join(basepath, fname))
			if fname.endswith('js'):
				messagesjs += get_message_list(os.path.join(basepath, fname))

		if messagespy:
			write_locale_file(basepath, messagespy, 'py')

		if messagespy:
			write_locale_file(basepath, messagesjs, 'js')

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
		
	#print fname

def export_messages(lang, outfile):
	"""get list of all messages"""
	messages = {}
	# extract messages
	for (basepath, folders, files) in os.walk('.'):
		def _get_messages(messages, basepath, mtype):
			mlist = get_messages(basepath, mtype)
			if not mlist:
				return
								
			# update messages with already existing translations
			langdata = get_lang_data(basepath, lang, mtype)
			for m in mlist:
				if not messages.get(m):
					messages[m] = langdata.get(m, "")
		
		if os.path.basename(basepath)=='locale':
			_get_messages(messages, basepath, 'doc')
			_get_messages(messages, basepath, 'py')
			_get_messages(messages, basepath, 'js')
				
	# remove duplicates
	if outfile:
		from csv import writer
		with open(outfile, 'w') as msgfile:
			w = writer(msgfile)
			keys = messages.keys()
			keys.sort()
			for m in keys:
				w.writerow([m.encode('utf-8'), messages.get(m, '').encode('utf-8')])
	
def import_messages(lang, infile):
	"""make individual message files for each language"""
	data = dict(get_all_messages_from_file(infile))
		
	for (basepath, folders, files) in os.walk('.'):
		def _update_lang_file(mtype):
			"""create a langauge file for the given message type"""
			messages = get_messages(basepath, mtype)
			if not messages: return

			# read existing
			langdata = get_lang_data(basepath, lang, mtype)
							
			# update fresh
			for m in messages:
				if data.get(m):
					langdata[m] = data.get(m)
			
			if langdata:
				# write new langfile
				langfilename = os.path.join(basepath, lang + '-' + mtype + '.json')
				with open(langfilename, 'w') as langfile:
					langfile.write(json.dumps(langdata, indent=1, sort_keys=True).encode('utf-8'))
				#print 'wrote ' + langfilename
				
		if os.path.basename(basepath)=='locale':
			# make / update lang files for each type of message file (doc, js, py)
			# example: hi-doc.json, hi-js.json, hi-py.json
			_update_lang_file('doc')
			_update_lang_file('js')
			_update_lang_file('py')

def get_messages(basepath, mtype):
	"""load list of messages from _message files"""
	# get message list
	path = os.path.join(basepath, '_messages_' + mtype + '.json')
	messages = []
	if os.path.exists(path):
		with open(path, 'r') as msgfile:
			messages = json.loads(msgfile.read())
			
	return messages

def get_lang_data(basepath, lang, mtype):
	"""get language dict from langfile"""

	# add "locale" folder if reqd
	if os.path.basename(basepath) != 'locale':
		basepath = os.path.join(basepath, 'locale')
	
	if not lang: lang = webnotes.lang
	
	path = os.path.join(basepath, lang + '-' + mtype + '.json')
	
	langdata = {}
	if os.path.exists(path):
		with codecs.open(path, 'r', 'utf-8') as langfile:
			langdata = json.loads(langfile.read())

	return langdata

def update_lang_js(jscode, path):
	return jscode + "\n\n$.extend(wn._messages, %s)" % \
		json.dumps(get_lang_data(path, webnotes.lang, 'js'))
		
def get_all_messages_from_file(path):
	with codecs.open(path, 'r', 'utf-8') as msgfile:
		from csv import reader
		data = msgfile.read()
		data = reader([r.encode('utf-8') for r in data.splitlines()])
		newdata = []
		for row in data:
			newrow = []
			for val in row:
				newrow.append(unicode(val, 'utf-8'))
			newdata.append(newrow)

	return newdata

def google_translate(lang, infile, outfile):
	"""translate objects using Google API. Add you own API key for translation"""
	
	data = get_all_messages_from_file(infile)
	
	with open(outfile, 'w') as msgfile:
		from csv import writer
		w = writer(msgfile)
		for row in data:
			if not row[1]:
				print 'translating: ' + row[0]
				response = requests.get("""https://www.googleapis.com/language/translate/v2""",
					params = {
						"key": conf.google_api_key,
						"source": "en",
						"target": lang,
						"q": row[0]
					})
			
				row[1] = response.json["data"]["translations"][0]["translatedText"]
				if not row[1]:
					row[1] = row[0] # google unable to translate!
			
			row[0] = row[0].encode('utf-8')
			row[1] = row[1].encode('utf-8')
			w.writerow(row)

