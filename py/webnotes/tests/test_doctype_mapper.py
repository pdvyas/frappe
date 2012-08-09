from __future__ import unicode_literals
import unittest
import webnotes, webnotes.model

base_doctype_mapper = {
	"doctype": "DocType Mapper",
	"name": "Quotation-Sales Order2",
	"module": "Selling",
	"from_doctype": "Quotation",
	"to_doctype": "Sales Order",
	"ref_doc_submitted": 1,
	"__islocal": 1,
}

base_table_mapper_detail = 	{
	"doctype": "Table Mapper Detail",
	"match_id": 0,
	"from_table": "Quotation",
	"to_table": "Sales Order",
	"validation_logic": "docstatus = 1",
	"parenttype": "DocType Mapper",
	"parentfield": "table_mapper_details",
	"parent": "Quotation-Sales Order2",
	"__islocal": 1,
}

base_field_mapper_detail = {
	"doctype": "Field Mapper Detail",
	"match_id": 0,
	"from_field": "name",
	"to_field": "quotation_nos",
	"map": "Yes",
	"parenttype": "DocType Mapper",
	"parentfield": "field_mapper_details",
	"parent": "Quotation-Sales Order2",
	"__islocal": 1,
}

class DocTypeMapperTest(unittest.TestCase):
	def setUp(self):
		webnotes.conn.begin()
	
	def tearDown(self):
		webnotes.conn.rollback()
		
	def test_create_mapper(self):
		# check valid mapper
		webnotes.model.insert([base_doctype_mapper, base_table_mapper_detail,
			base_field_mapper_detail])
		self.assertTrue(webnotes.conn.exists("DocType Mapper", "Quotation-Sales Order2"))

	def test_link_validation(self):
		# check if link validations for tables occur
		doctype_mapper = base_doctype_mapper.copy()
		doctype_mapper.update({"from_table": "Quotation2"})
		
		self.assertRaises(webnotes.ValidationError, webnotes.model.insert,
			[doctype_mapper, base_table_mapper_detail, base_field_mapper_detail])
		
	def test_default_values(self):
		"""match id and map field should be saved with default values"""
		# check if default values are taken
		doctype_mapper = base_doctype_mapper.copy()
		doctype_mapper.update({"name": "Quotation-Sales Order3"})
		
		table_mapper_detail = base_table_mapper_detail.copy()
		table_mapper_detail.update({"parent": "Quotation-Sales Order3"})
		del table_mapper_detail["match_id"]
		
		field_mapper_detail = base_field_mapper_detail.copy()
		field_mapper_detail.update({"parent": "Quotation-Sales Order3"})
		del field_mapper_detail["map"]
		
		webnotes.model.insert([doctype_mapper, table_mapper_detail, field_mapper_detail])
		self.assertTrue(webnotes.conn.exists("DocType Mapper", "Quotation-Sales Order3"))
		
		doctype_mapper_doclist = webnotes.model.get("DocType Mapper", "Quotation-Sales Order3")
		self.assertEqual(doctype_mapper_doclist.getone(
			{"doctype":"Table Mapper Detail"}).match_id, 0)
		self.assertEqual(doctype_mapper_doclist.getone(
			{"doctype":"Field Mapper Detail"}).fields['map'], "Yes")
		
		