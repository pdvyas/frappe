from __future__ import unicode_literals
import unittest, webnotes

import webnotes.model.doctype
import webnotes.model

class DocUtilsTest(unittest.TestCase):
	def setUp(self):
		webnotes.conn.begin()
	
	def tearDown(self):
		webnotes.conn.rollback()
		
	def test_rename(self):
		import webnotes.model.utils
		
		webnotes.model.insert([{
			'doctype':'Role',
			'name': 'Test',
			'role_name': 'Test'
		}])
		
		webnotes.model.insert_child({
			'parenttype': 'Profile',
			'parent': 'Administrator',
			'doctype':'UserRole',
			'parentfield': 'userroles',
			'role':'Test',
		})

		self.assertEquals(len(webnotes.model.get('Profile', 'Administrator').get({"role":"Test"})), 1)
		
		webnotes.model.utils.rename('Role', 'Test', 'Next')
		
		self.assertEquals(webnotes.conn.exists('Role', 'Next'))
		
		admin = webnotes.model.get('Profile', 'Administrator')
		self.assertEquals(len(admin.get({"role":"Next"})), 1)
		self.assertEquals(len(admin.get({"role":"Test"})), 0)
		
		