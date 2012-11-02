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
bootstrap client session
"""

import webnotes
import webnotes.model.doc
import webnotes.cms

def get_bootinfo():
	"""build and return boot info"""
	bootinfo = webnotes.DictObj()
	doclist = []

	# profile
	get_profile(bootinfo)
		
	# control panel
	cp = webnotes.model.doc.getsingle('Control Panel')

	
	# system info
	bootinfo['control_panel'] = cp.copy()
	bootinfo['account_name'] = cp.get('account_id')
	bootinfo['sysdefaults'] = webnotes.utils.get_defaults()

	if webnotes.session['user'] != 'Guest':
		add_desktop_items(doclist, bootinfo.profile.roles)
		bootinfo['user_info'] = get_fullnames()
		bootinfo['sid'] = webnotes.session['sid'];
		
	# home page
	add_home_page(bootinfo, doclist)

	# ipinfo
	if webnotes.session['data'].get('ipinfo'):
		bootinfo['ipinfo'] = webnotes.session['data']['ipinfo']
	
	# add docs
	bootinfo['docs'] = doclist
	
	# plugins
	try:
		from startup import event_handlers
		if getattr(event_handlers, 'boot_session', None):
			event_handlers.boot_session(bootinfo)

	except ImportError:
		pass
	
	from webnotes.model.utils import compress
	bootinfo['metadata'] = compress(bootinfo['docs'])
	del bootinfo['docs']
	
	return bootinfo

def add_desktop_items(doclist, roles):
	doclist += webnotes.conn.sql("""select t1.name as name, label, gradient, 
		style, route, "Desktop Item" as `doctype` 
		from `tabDesktop Item` t1, `tabDesktop Item Role` t2
		where ifnull(disabled, "No")="No" 
		and t1.name = t2.parent
		and t2.role in ("%s")""" % '", "'.join(roles), as_dict=1)


def get_fullnames():
	"""map of user fullnames"""
	ret = webnotes.conn.sql("""select name, 
		concat(ifnull(first_name, ''), 
			if(ifnull(last_name, '')!='', ' ', ''), ifnull(last_name, '')), 
			user_image, gender
		from tabProfile where ifnull(enabled, 0)=1""", as_list=1)
	d = {}
	for r in ret:
		if not r[2]:
			r[2] = 'lib/images/ui/avatar.png'
		else:
			r[2] = 'files/' + r[2]
			
		d[r[0]]= {'fullname': r[1], 'image': r[2], 'gender': r[3]}

	return d
		
def get_profile(bootinfo):
	"""get profile info"""
	bootinfo['profile'] = webnotes.user.load_profile()
	webnotes.session['data']['profile'] = bootinfo['profile']
	
def add_home_page(bootinfo, doclist):
	"""load home page"""
	home_page = webnotes.cms.get_home_page(webnotes.session['user']) or 'Login Page'
	from core.doctype.page.page import get_page_doclist
	try:
		page_doclist = get_page_doclist(home_page)
	except webnotes.PermissionError, e:
		page_doclist = get_page_doclist('Login Page')
		
	bootinfo['home_page_html'] = page_doclist[0].content
	bootinfo['home_page'] = page_doclist[0].name
	doclist += page_doclist
