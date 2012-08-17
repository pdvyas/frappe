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
import webnotes

@webnotes.whitelist()
def remove_attach():
	"""remove attachment"""
	import webnotes.utils.file_manager
	
	fid = webnotes.form.get('fid')
		
	# remove from dt dn
	return str(webnotes.utils.file_manager.remove_file(webnotes.form.get('dt'), webnotes.form.get('dn'), fid))

@webnotes.whitelist()
def get_fields():
	"""get fields"""
	r = {}
	args = {
		'select':webnotes.form.get('select')
		,'from':webnotes.form.get('from')
		,'where':webnotes.form.get('where')
	}
	ret = webnotes.conn.sql("select %(select)s from `%(from)s` where %(where)s limit 1" % args)
	if ret:
		fl, i = webnotes.form.get('fields').split(','), 0
		for f in fl:
			r[f], i = ret[0][i], i+1
	webnotes.response['message']=r

@webnotes.whitelist()
def validate_link():
	"""validate link when updated by user"""
	import webnotes
	import webnotes.utils
	
	value, options, fetch = webnotes.form.get('value'), webnotes.form.get('options'), webnotes.form.get('fetch')

	# no options, don't validate
	if not options or options=='null' or options=='undefined':
		webnotes.response['message'] = 'Ok'
		return
		
	if webnotes.conn.sql("select name from `tab%s` where name=%s" % (options, '%s'), value):
	
		# get fetch values
		if fetch:
			webnotes.response['fetch_values'] = [c for c in \
				webnotes.conn.sql("select %s from `tab%s` where name=%s" % \
				(fetch, options, '%s'), value)[0]]
	
		webnotes.response['message'] = 'Ok'
		
@webnotes.whitelist()
def rename():
	"""rename item"""
	from webnotes.model.rename_doc import rename_doc
	rename_doc(webnotes.form['doctype'], webnotes.form['old_name'], 
		webnotes.form['new_name'])
		
	return webnotes.form['new_name']
