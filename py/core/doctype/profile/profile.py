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

import webnotes, json

from webnotes.model.controller import DocListController
from webnotes.utils import cint

class ProfileController(DocListController):
	def autoname(self):
		"""set name as email id"""
		import re
		from webnotes.utils import validate_email_add

		if self.doc.name not in ('Guest','Administrator'):
			self.doc.email = self.doc.email.strip()
			if not validate_email_add(self.doc.email):
				msgprint("%s is not a valid email id" % self.doc.email)
				raise Exception
		
			self.doc.name = self.doc.email

	def authenticate(self, password):
		return self.session.db.sql("""select name from tabProfile where
			name=%s and `password` = password(%s)""", (self.doc.name, password))

	def _load_roles(self):
		self.roles = self.session.db.get_roles(self.doc.name)
		return self.roles

	def get_roles(self):
		"""get list of roles"""
		if getattr(self, 'roles', None):
			return self.roles
			
		return self._load_roles()

	def get_home_page(self):
		"""get home page for user"""
		hpl = self.session.db.sql("""select home_page 
			from `tabDefault Home Page` 
			where parent='Control Panel' 
			and role in ('%s') order by idx asc limit 1""" % "', '".join(self.get_roles()))
		
		if hpl:
			return hpl[0].home_page
		else:
			return self.session.db.get_value('Control Panel',None,'home_page') or 'Login Page'

	def validate(self):
		self.temp = {}
		if self.doc.get('__temp'):
			self.temp = json.loads(self.doc['__temp'])
			del self.doc['__temp']

		self.validate_max_users()
		self.update_roles()
		self.logout_if_disabled()
		
		if self.doc.get('__islocal') and not self.doc.new_password:
			self.session.response.info("Password required while creating new doc")
		
	def logout_if_disabled(self):
		"""logout if disabled"""
		if cint(self.doc.disabled):
			import webnotes.login_manager
			webnotes.login_manager.logout(self.doc.name)
	
	def validate_max_users(self):
		"""don't allow more than max users if set in conf"""
		import conf
		if hasattr(conf, 'max_users'):
			active_users = self.session.db.sql("""select count(*) from tabProfile
				where ifnull(enabled, 0)=1 and docstatus<2
				and name not in ('Administrator', 'Guest')""")[0][0]
			if active_users >= conf.max_users and conf.max_users:
				webnotes.msgprint("""
					You already have <b>%(active_users)s</b> active users, \
					which is the maximum number that you are currently allowed to add. <br /><br /> \
					So, to add more users, you can:<br /> \
					1. <b>Upgrade to the unlimited users plan</b>, or<br /> \
					2. <b>Disable one or more of your existing users and try again</b>""" \
					% {'active_users': active_users}, raise_exception=1)
	
	def update_roles(self):
		"""update roles if set"""		

		if self.temp.get('roles'):
			from webnotes.model.doc import Document

			# remove roles
			self.session.db.sql("""delete from tabUserRole where parent='%s' 
				and role in ('%s')""" % (self.doc.name, "','".join(self.temp['roles']['unset_roles'])))

			self.check_one_system_manager()

			# add roles
			user_roles = webnotes.get_roles(self.doc.name)
			for role in self.temp['roles']['set_roles']:
				if not role in user_roles:
					d = Document('UserRole')
					d.role = role
					d.parenttype = 'Profile'
					d.parentfield = 'user_roles'
					d.parent = self.doc.name
					d.save()
			
	def check_one_system_manager(self):
		if not self.session.db.sql("""select parent from tabUserRole where role='System Manager'
			and docstatus<2"""):
			webnotes.msgprint("""Cannot un-select as System Manager as there must 
				be atleast one 'System Manager'""", raise_exception=1)
				
	def on_update(self):
		# owner is always name
		self.session.db.set(self.doc, 'owner' ,self.doc.name)
		self.update_new_password()

	def set_password(self, new_password):
		"""set password in __Auth table"""
		self.session.db.sql("""insert into __Auth (user, `password`) values (%s, password(%s)) 
			on duplicate key update `password`=password(%s)""", (self.doc.name, 
			new_password, new_password))

	def update_new_password(self):
		"""update new password if set"""	
		if self.doc.localname and self.doc.new_password:
			self.set_password(self.doc.new_password)
			if self.doc.send_welcome_mail:
				self.send_welcome_mail(self.doc.new_password)
				self.session.db.set(self.doc, 'new_password', '')
				webnotes.msgprint("Welcome Email Sent")

	def get_fullname(self):
		"""get first_name space last_name"""
		return (self.doc.first_name or '') + \
			(self.doc.first_name and " " or '') + (self.doc.last_name or '')

	def password_reset_mail(self, password):
		"""reset password"""
		txt = """
## Password Reset

Dear %(first_name)s %(last_name)s,

Your password has been reset. Your new password is:

password: %(password)s

To login to %(product)s, please go to:

%(login_url)s

Thank you,<br>
%(user_fullname)s
		"""
		self.send_login_mail(txt, password)
		
	def send_welcome_mail(self, password):
		"""send welcome mail to user with password and login url"""
		txt = """
## %(company)s

Dear %(first_name)s %(last_name)s,

A new account has been created for you, here are your details:

login-id: %(user)s<br>
password: %(password)s

To login to your new %(product)s account, please go to:

%(login_url)s

Thank you,<br>
%(user_fullname)s
		"""
		self.send_login_mail(txt, password)

	def send_login_mail(self, txt, password):
		"""send mail with login details"""
		import startup
		import os
	
		from webnotes.utils.email_lib import sendmail_md
		from webnotes.profile import get_user_fullname
		from webnotes.utils import get_request_site_address
	
		args = {
			'first_name': self.doc.first_name,
			'last_name': self.doc.last_name or '',
			'user': self.doc.name,
			'password': password,
			'company': self.session.db.get_default('company') or startup.product_name,
			'login_url': get_request_site_address(),
			'product': startup.product_name,
			'user_fullname': get_user_fullname(webnotes.session['user'])
		}
		sendmail_md(self.doc.email, subject="Welcome to " + startup.product_name, msg=txt % args)
	
	def on_rename(self, new_name, old_name):
		from webnotes.utils import validate_email_add
		if not validate_email_add(new_name):
			webnotes.msgprint("New name must be a valid email id", raise_exception=1)
		
		tables = self.session.db.sql("show tables")
		for tab in tables:
			desc = self.session.db.sql("desc `%s`" % tab[0], as_dict=1)
			has_fields = []
			for d in desc:
				if d.get('Field') in ['owner', 'modified_by']:
					has_fields.append(d.get('Field'))
			for field in has_fields:
				self.session.db.sql("""\
					update `%s` set `%s`=%s
					where `%s`=%s""" % \
					(tab[0], field, '%s', field, '%s'), (new_name, old_name))
		self.session.db.sql("""\
			update `tabProfile` set email=%s
			where name=%s""", (new_name, new_name))
			
	def on_trash(self):
		"""do not delete standard users, delete from auth"""
		if self.doc.name in ('Administrator', 'Guest'):
			webnotes.msgprint("Cannot delete system user '%s'" % self.doc.name, 
				raise_exception=1)
				
		# delete from auth table
		self.session.db.sql("""delete from __Auth where user=%s""", self.doc.name)

		t = webnotes.conn.sql("""select email, first_name, last_name, 
			recent_documents from tabProfile where name = %s""", self.doc.name)[0]

	def load_profile(self):
		t = self.session.db.sql("""select email, first_name, last_name, 
			recent_documents from tabProfile where name = %s""", self.doc.name)[0]
			
		self.build_permissions()
		
		d = {}
		d['name'] = self.doc.name
		d['email'] = t.email or ''
		d['first_name'] = t.first_name or ''
		d['last_name'] = t.last_name or ''
		d['recent'] = t.recent_documents or ''
				
		d['roles'] = self.get_roles()
		d['defaults'] = self.get_defaults()
				
		d['can_create'] = self.can_create
		d['can_search'] = list(set(self.can_search))
		d['can_get_report'] = list(set(self.can_get_report))
		d['allow_modules'] = self.allow_modules

		return d

	def build_permissions(self):
		"""build lists of what the user can read / write / create
		quirks:
			read_only => Not in Search
			in_create => Not in create
		"""
		self.can_create = []
		self.can_search = []
		self.can_get_report = []
		self.allow_modules = []
	
		self.build_doctype_map()
		self.build_perm_map()
		
		for dt in self.doctype_map:
			dtp = self.doctype_map[dt]
			p = self.perm_map.get(dt, {})

			if not dtp.get('istable'):
				if p.get('create') and not dtp.get('in_create') and \
						not dtp.get('issingle'):
					self.can_create.append(dt)

			if (p.get('read') or p.get('write') or p.get('create')):
				self.can_get_report.append(dt)
				self.can_get_report += dtp['child_tables']
				if not dtp.get('istable'):
					if not dtp.get('issingle') and not dtp.get('read_only'):
						self.can_search.append(dt)
					if not dtp.get('module') in self.allow_modules:
						self.allow_modules.append(dtp.get('module'))
						
	def build_doctype_map(self):
		"""build map of special doctype properties"""

		self.doctype_map = {}
		for r in self.session.db.sql("""select name, in_create, issingle, istable, 
			read_only, module from tabDocType"""):
			r['child_tables'] = []
			self.doctype_map[r['name']] = r

		for r in self.session.db.sql("""select parent, options from tabDocField 
			where fieldtype="Table"
			and parent not like "old_parent:%%" 
			and ifnull(docstatus,0)=0
			"""):
			if r.parent in self.doctype_map:
				self.doctype_map[r.parent]['child_tables'].append(r.options)

	def build_perm_map(self):
		"""build map of permissions at level 0"""
		
		self.perm_map = {}
		for r in self.session.db.sql("""select parent, `read`, `write`, `create`, `submit`, `cancel` 
			from tabDocPerm where docstatus=0 
			and ifnull(permlevel,0)=0
			and parent not like "old_parent:%%" 
			and role in ('%s')""" % "','".join(self.get_roles()), as_dict=1):
			
			dt = r['parent']
			
			if not dt in  self.perm_map:
				self.perm_map[dt] = {}
				
			for k in ('read', 'write', 'create', 'submit', 'cancel'):
				if not self.perm_map[dt].get(k):
					self.perm_map[dt][k] = r.get(k)

	def update_recent(self, dt, dn):
		"""Update the user's `Recent` list with the given `dt` and `dn`"""
		import json

		# get list of child tables, so we know what not to add in the recent list
		child_tables = [t.name for t in self.session.db.sql('select name from tabDocType where ifnull(istable,0) = 1')]
		
		if not (dt in ['Print Format', 'Start Page', 'Event', 'ToDo', 'Search Criteria']) \
			and not (dt in child_tables):
			r = self.session.db.sql("select recent_documents from tabProfile where name=%s", \
				self.doc.name)[0].recent_documents or ''

			if '~~~' in r:
				r = '[]'
			
			rdl = json.loads(r or '[]')
			new_rd = [dt, dn]
			
			# clear if exists
			for i in range(len(rdl)):
				rd = rdl[i]
				if rd==new_rd:
					del rdl[i]
					break

			if len(rdl) > 19:
				rdl = rdl[:19]
			
			rdl = [new_rd] + rdl
			
			self.recent = json.dumps(rdl)
			self.session.db.sql("""update tabProfile set 
				recent_documents=%s where name=%s""", (self.recent, self.doc.name))

	def get_defaults(self):
		"""
		Get the user's default values based on user and role profile
		"""
		roles = self.get_roles() + [self.doc.name]
		res = self.session.db.sql("""select defkey, defvalue 
		from `tabDefaultValue` where parent in ("%s") order by idx""" % '", "'.join(roles))
	
		self.defaults = {'owner': [self.doc.name,]}

		for rec in res: 
			if not self.defaults.has_key(rec.defkey): 
				self.defaults[rec.defkey] = []
			self.defaults[rec.defkey].append(rec.defvalue or '')

		return self.defaults



@webnotes.whitelist()
def get_all_roles(arg=None):
	"""return all roles"""
	return [r[0] for r in self.session.db.sql("""select name from tabRole
		where name not in ('Administrator', 'Guest', 'All') order by name""")]
		
@webnotes.whitelist()
def get_user_roles(arg=None):
	"""get roles for a user"""
	return webnotes.get_roles(webnotes.form['uid'])

@webnotes.whitelist()
def get_perm_info(session):
	"""get permission info"""
	return session.db.sql("""select parent, permlevel, `read`, `write`, submit,
		cancel, amend from tabDocPerm where role=%s 
		and docstatus<2 order by parent, permlevel""", 
			session.request.form.role, as_dict=1)

@webnotes.whitelist()
def get_defaults(session):
	return self.session.db.sql("""select defkey, defvalue from tabDefaultValue where 
		parent=%s and parenttype = 'Profile'""", session.request.form.profile)

@webnotes.whitelist(allow_roles=['System Manager', 'Administrator'])
def update_password(session):
	"""update password"""
	from webnotes.model.code import get_obj
	profile = get_obj('Profile', webnotes.form['user'])
	profile.set_password(webnotes.form["new_password"])
	if webnotes.form.get('send_mail'):
		profile.password_reset_mail(webnotes.form["new_password"])
		
	return 'Password Updated'
	
@webnotes.whitelist()
def delete(session):
	"""delete user"""
	self.session.db.sql("update tabProfile set enabled=0, docstatus=2 where name=%s", 
		webnotes.form['uid'])
	webnotes.login_manager.logout(user=webnotes.form['uid'])
	
@webnotes.whitelist()
def get_permissions(session):
	session.json.read = session.db.sql("""select tabDocType.name from
		tabDocType, tabDocPerm where
		tabDocPerm.parent = tabDocType.name
		and tabDocPerm.role in (%(roles)s)""")
	
	