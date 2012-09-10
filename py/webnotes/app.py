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


from webob import Request, Response
from webnotes.sessions import Session
import webnotes
import webnotes.model
from webnotes import whitelist
import json

redirect_to_home = """<html><head>
	<script>window.location.href='index.html';</script></head></html>"""
paused = """<html><body style="background-color: #EEE;">
		<h3 style="width: 900px; background-color: #FFF; border: 2px solid #AAA; padding: 20px; font-family: Arial; margin: 20px auto">
			Updating.<br><br>We will be back in a few moments...</h3></body></html>"""

def application(environ, start_response):
	"""wsgi application method"""
	request = Request(environ)
	response = Response()
	try:
		session = Session(request, response)
		if session.memc.get_value("_paused"):
			response.text = unicode(paused)
		elif 'cmd' in request.params:
			run_command(session, request)
			response.text = unicode(session.get_json())
		elif 'page' in request.params:
			import website.utils
			response.text = unicode(website.utils.render(session, request.params.get('page')))
		else:
			response.text = unicode(redirect_to_home)
	except Exception, e:
		response.text = webnotes.traceback()

	return response(environ, start_response)

def get_method(session, request):
	"""get execution method"""
	if not 'cmd' in request.params:
		session.error('no method')
		return
	
	# import module
	if '.' in request.params.get('cmd'):
		m = request.params.get('cmd').split('.')
		module_name = '.'.join(m[:-1])
		try:
			module = __import__(module_name, fromlist=True)
		except Exception,e:
			session.error('unable to import %s' % module_name)
			return
	
		# get method
		method_name = m[-1]
		method = getattr(module, m[-1], None)
	else:
		method_name = request.params.get('cmd')
		method = globals()[method_name]
				
	if not method:
		session.error('no method %s' % method_name)
		return
	
	# check if its whitelisted
	method_ref = filter(lambda x: x.function==method, webnotes.whitelisted)
	
	if not method_ref:
		session.error('method not allowed')
		return
		
	method_ref = method_ref[0]
	
	if session.user=='Guest' and not method_ref.allow_guest:
		session.error('guest not allowed')
		return
		
	if method_ref.allow_roles and not set(method_ref.allow_roles).intersection(session.bootinfo.profile.roles):
		session.error('role not allowed')
		return
			
	# check if guest

	return method
			
def run_command(session, request):
	"""process the response, call the specified method"""
	method = get_method(session, request)
	if method:
		# execute
		try:
			request.method=='POST' and session.db.begin()
			ret = method(session)
			if ret: session.json["message"] = ret
			request.method=='POST' and session.db.commit()
		except webnotes.PermissionError, e:
			request.method=='POST' and session.db.rollback()
			session.error(str(e))
		except Exception, e:
			request.method=='POST' and session.db.rollback()
			session.error(webnotes.traceback())


@whitelist(allow_guest=True)
def login(session):
	"""placeholder for login method, session will login"""
	pass

@whitelist()
def startup(session):
	"""startup"""
	session.json['boot'] = session.bootinfo

@whitelist()
def logout(request, response, session):
	"""clear session"""
	session.memc.delete_value('bootinfo:' + session.sid)	
	response.write('Logged Out')
