# Test Cases
import unittest, webnotes

import webnotes.model.doctype 

class DocTypeTest(unittest.TestCase):
	def setUp(self):
		webnotes.conn.begin()
		webnotes.conn.sql("""delete from __CacheItem""")
		
	def tearDown(self):
		webnotes.conn.rollback()

	def test_profile(self):
		doclist = webnotes.model.doctype.get('Profile', processed=True)
		self.assertEquals(len(filter(lambda d: d.fieldname=='first_name' and d.doctype=='DocField', 
			doclist)), 1)
		self.assertEquals(len(filter(lambda d: d.name=='DefaultValue' and d.doctype=='DocType', 
			doclist)), 1)
		self.assertEquals(len(filter(lambda d: d.parent=='DefaultValue' and d.doctype=='DocField'
			and d.fieldname=='defkey', doclist)), 1)
		
		# js code added
		self.assertTrue(doclist[0].get('__js'))
		self.assertTrue(doclist[0].get('__listjs'))
		self.assertTrue(doclist[0].get('__css'))
		
		# test embedded js code
		self.assertTrue('wn.RoleEditor = Class.extend({' in doclist[0].get('__js'))
		
		# check if exists in cache
		self.assertTrue(webnotes.conn.sql("""select `key` from __CacheItem 
			where `key`='Profile'"""))
		return doclist
		
	def test_select_options(self):
		doctypelist = webnotes.model.doctype.get('Role', processed=True)
		self.assertTrue('System' in doctypelist.getone({"fieldname":"module"}).options.split())
		
	def test_print_format(self):
		doctypelist = webnotes.model.doctype.get("Sales Order", processed=True)
		count_print_formats = webnotes.conn.sql("""select count(name) from `tabPrint Format`
			where doc_type=%s""", "Sales Order")[0][0]
		self.assertEquals(len(doctypelist.get({"doctype":"Print Format"})),
			count_print_formats)

	def test_with_cache(self):
		self.assertFalse(getattr(self.test_profile()[0], '__from_cache', False))
		
		# second time with cache
		self.assertTrue(getattr(self.test_profile()[0], '__from_cache', False))

	def test_doctype_doctype(self):
		doclist = webnotes.model.doctype.get('DocType')
		
		self.assertEquals(len(doclist.get({"fieldname":'issingle', "doctype":'DocField'})), 1) 
		self.assertEquals(len(doclist.get({"name":'DocField', "doctype":'DocType'})), 1) 
		self.assertEquals(len(doclist.get({"parent":'DocField', "doctype":'DocField', 
			"fieldname":"fieldname"})), 1) 

		# test raw cache
		self.assertTrue(webnotes.conn.sql("""select `key` from __CacheItem 
			where `key`='DocType:Raw'"""))
			
	def test_property_setter(self):
		doclist = webnotes.model.doctype.get('Profile')
		self.assertEquals(len(filter(lambda d: d.fieldname=='first_name' 
			and (d.hidden or 0)==0, doclist)), 1)

		webnotes.conn.sql("""delete from __CacheItem""")
				
		from webnotes.model.doc import Document
		ps = Document("Property Setter")
		ps.update({
			'name': 'test',
			'doc_type': "Profile",
			'field_name': 'first_name',
			'doctype_or_field': 'DocField',
			'property': 'hidden',
			'value': 1
		})
		ps.save()
		
		webnotes.model.doctype.clear_cache('Profile')

		doclist = webnotes.model.doctype.get('Profile')
		self.assertEquals(len(filter(lambda d: d.fieldname=='first_name' 
			and (d.hidden or 0)==1, doclist)), 1)

	def test_previous_field(self):
		doclist = webnotes.model.doctype.get('Profile')
		first_name_idx = doclist.getone({"fieldname":"first_name"}).idx
		last_name_idx = doclist.getone({"fieldname":"last_name"}).idx
		
		self.assertTrue(first_name_idx < last_name_idx)

		webnotes.conn.sql("""delete from __CacheItem""")
				
		from webnotes.model.doc import Document
		ps = Document("Property Setter")
		ps.update({
			'name': 'test',
			'doc_type': "Profile",
			'field_name': 'first_name',
			'doctype_or_field': 'DocField',
			'property': 'previous_field',
			'value': 'last_name'
		})
		ps.save()
		
		webnotes.model.doctype.clear_cache('Profile')

		doclist = webnotes.model.doctype.get('Profile')
		first_name_idx = doclist.getone({"fieldname":"first_name"}).idx
		last_name_idx = doclist.getone({"fieldname":"last_name"}).idx
		self.assertEquals(last_name_idx+1, first_name_idx)
		
	def test_get_link_fields(self):
		# link type
		doctypelist = webnotes.model.doctype.get_link_fields("DocType")
		self.assertTrue(len(doctypelist.get({"fieldname":"module", "fieldtype":"Link"})), 1)

		# link: type selects
		doctypelist = webnotes.model.doctype.get_link_fields("Role")
		self.assertTrue(len(doctypelist.get({"fieldname":"module", "fieldtype":"Select"})), 1)
		
	def test_search_fields_of_link_fields(self):
		doctypelist = webnotes.model.get_doctype("DocType Validator", processed=True)
		self.assertEqual(doctypelist.get_field("for_doctype").search_fields, ["autoname"])
