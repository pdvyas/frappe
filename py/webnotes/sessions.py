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

import webnotes
import conf
import os
import json
from webnotes.utils import cint, remove_nulls
from webob import Request, Response

class Session:
	"""session object is created when a new request starts"""
	controllers = {}

	def __init__(self, request=None, response=None, user=None, db_name=None):
		self.request = request or Request.blank('/')
		self.response = response or Response()
		self.db_name = db_name
		self.user = user
		self.lang = 'en'

		self._db = None
		self._memc = None
		self.sid = self.request.cookies.get('sid') or self.request.params.get('sid') or 'Guest'
		self.json = {}
		
		self.messages, self.errors, self.logs, self.msgprints = [], [], [], []
		
		# for a local session, pass the user, there is no booting!
		if not user:
			self.start()
		
	def error(self, txt): self.errors.append(txt)
	def write(self, txt): self.messages.append(txt)
	def log(self, txt): self.logs.append(txt)
	def msgprint(self, txt, raise_exception=None): 
		self.msgprints.append(txt)
		import inspect
		if raise_exception:
			if inspect.isclass(raise_exception) and issubclass(raise_exception, Exception):
				raise raise_exception, txt
			else:
				raise webnotes.ValidationError, txt

	def start(self):
		if self.request.params.get("cmd")=="login":
			# login
			self.boot()
		else:
			self.user = self.memc.get_value("session:" + self.sid)
			if self.user:
				# resume
				self.bootinfo = self.memc.get_value("bootinfo:" + self.sid)
				if not bootinfo:
					# cache was cleared, rebuild
					self.boot()
			else:
				# guest
				self.boot()
					
	def boot(self):
		"""boot session"""
		if not self.user:
			self.set_user()
		self.load_bootinfo()
		self.memc.set_value("session:" + self.sid, self.user)
		self.memc.set_value("bootinfo:" + self.sid, self.bootinfo)

	def new_sid(self):
		"""create new sid"""
		import hashlib, datetime
		self.sid = hashlib.sha1(str(datetime.datetime.now())).hexdigest()
		
	def set_user(self):
		"""login or guest"""
		if self.request.params.get('cmd')=='login':
			try:
				profile = self.controller("Profile", self.request.params.get("user"))
				if profile.authenticate(self.request.params.get("password")):
					self.user = profile.doc.get('name')
					self.write('Logged In')
					self.new_sid()
					self.response.set_cookie('sid', self.sid, path='/')
				else:
					self.user = 'Guest'
					self.write("Wrong Password")
			except NameError, e:
				self.user = 'Guest'
				self.write("Invalid Login")				
		else:
			self.user = "Guest"

	@property
	def memc(self):
		"""memcache connection"""
		if not self._memc:
			from webnotes.memc import MClient
			self._memc = MClient(['localhost:11211'])
		return self._memc
		
	@property
	def db(self):
		"""database connection"""
		if not self._db:
			import webnotes.db
			self._db = webnotes.db.Database(user = self.db_name)
		return self._db

	def non_english(self):
		"""return True if translations apply"""
		if self.lang=='en': 
			return False
		if self.lang in getattr(conf, "accept_languages", []):
			return True
		else:
			return False
					
	def controller(self, doctype, name=None, module=None):
		import webnotes.model.controller
		return webnotes.model.controller.get(self, doctype, name, module)

	def get_doctype(self, doctype, processed=False, strip_nulls=False):
		from webnotes.model.doctype import get
		from webnotes.model.doclist import DocList
		
		doclist = get(self, doctype, processed)
		if strip_nulls:
			doclist = DocList([remove_nulls(d) for d in doclist])
		return doclist
		
	def get_doclist(self, doctype, name=None, strip_nulls=False):
		doclist = self.controller(doctype, name).doclist
		if strip_nulls:
			[remove_nulls(d) for d in doclist]
		return doclist

	def insert(self, doclist):
		"""insert a new doclist"""
		if doclist and isinstance(doclist, dict):
			doclist = [doclist]

		con = self.controller(doclist)
		for d in con.doclist:
			d["__islocal"] = 1
		con.save()

		# can be used to retrieve name or any value after save
		return con
		
	def update(self, doclist):
		"""update doclist"""
		if doclist and isinstance(doclist, dict):
			doclist = [doclist]

		con = self.controller(doclist[0]["doctype"], doclist[0]["name"])
		existing_names = map(lambda d: d.name, con.doclist)

		for d in doclist:
			if d.get("name") in existing_names:
				# update row
				con.doclist.getone({"name": d["name"]}).update(d)
			else:
				# add row
				d["__islocal"] = 1
				con.doclist.append(d)

		con.save()

		return con		
		
	def load_bootinfo(self):
		"""build and return boot info"""
		from webnotes.utils import remove_nulls

		self.bootinfo = webnotes.DictObj({})
		self.bootinfo.user = self.user
		self.doclist = []

		self.db.begin()
		# profile
		self.profile = self.controller('Profile', self.user)
		self.bootinfo.profile = self.profile.load_profile()
		self.load_control_panel()
		self.bootinfo.sysdefaults = self.db.get_defaults()

		if self.user != 'Guest':
			self.bootinfo.user_info = self.get_fullnames()
			self.bootinfo.sid = self.sid;
			self.load_home_page()
			
		self.load_translations()		
		self.bootinfo.docs = self.doclist
		self.update_from_startup()

		self.db.commit()

		self.bootinfo.docs = [remove_nulls(d) for d in self.bootinfo.docs]
		
	def load_control_panel(self):
		from webnotes.model.doclist import load_main
		self.bootinfo.control_panel = load_main(self, 'Control Panel', 'Control Panel').copy()		

	def update_from_startup(self):
		try:
			import startup.event_handlers
			if getattr(startup.event_handlers, 'boot_session', None):
				startup.event_handlers.boot_session(self, self.bootinfo)
		except ImportError:
			pass
			
	def load_translations(self):
		if webnotes.can_translate():
			from webnotes.utils.translate import get_lang_data
			self.bootinfo["__messages"] = get_lang_data("../lib/js/wn", None, "js")
			self.bootinfo["__messages"].update(get_lang_data(os.path.join(conf.modules_path, 'startup'), 
				None, "js"))

	def get_fullnames(self):
		"""map of user fullnames"""
		import webnotes
		ret = self.db.sql("""select name, 
			concat(ifnull(first_name, ''), 
				if(ifnull(last_name, '')!='', ' ', ''), ifnull(last_name, '')), 
				user_image, gender
			from tabProfile where ifnull(enabled, 0)=1""", as_list=True)
		d = {}
		for r in ret:
			if not r[2]:
				r[2] = 'images/lib/ui/no_img_m.gif'
			else:
				r[2] = 'files/' + r[2]

			d[r[0]]= {'fullname': r[1], 'image': r[2], 'gender': r[3]}

		return d
		
	def load_home_page(self):
		"""load home page"""
		import core.doctype.page.page
		home_page = self.profile.get_home_page() or 'login'

		try:
			page_doclist = core.doctype.page.page.get(self, home_page)
		except webnotes.PermissionError, e:
			page_doclist = core.doctype.page.page.get(self, 'login')

		self.bootinfo.home_page_html = page_doclist[0].content
		self.bootinfo.home_page = page_doclist[0].name
		self.doclist += page_doclist

	def get_json(self):
		"""make response body"""
		if self.messages:
			self.json['messages'] = self.messages
		if self.errors:
			self.json['errors'] = self.errors
		if self.logs:
			self.json['logs'] = self.logs
		if self.msgprints:
			self.json['msgprints'] = self.logs
		return json.dumps(self.json, default=webnotes.json_handler)

	def clear_cache(self):
		self.memc.flush_keys("bootinfo:")
		self.memc.flush_keys("doctype:")

@webnotes.whitelist()
def clear(session):
	"""clear all cache"""
	session.clear_cache(user)
	return "Cache Cleared"
