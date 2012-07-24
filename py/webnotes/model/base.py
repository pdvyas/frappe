import webnotes

class BaseDocType:
	"""Base doctype, common functions can be added here"""
	def __init__(self, doc, doclist):
		self.doc, self.doclist = doc, doclist
		
	def get(self, filters={}):
		"""get list of records by filter from doclist"""
		pass
		
	def get_csv_from_attachment(self):
		"""get csv from attachment"""
		if not self.doc.file_list:
		  msgprint("File not attached!")
		  raise Exception

		# get file_id
		fid = self.doc.file_list.split(',')[1]
		  
		# get file from file_manager
		try:
			from webnotes.utils import file_manager
			fn, content = file_manager.get_file(fid)
		except Exception, e:
			webnotes.msgprint("Unable to open attached file. Please try again.")
			raise e
	
		# convert char to string (?)
		if not isinstance(content, basestring) and hasattr(content, 'tostring'):
		  content = content.tostring()

		import csv
		return csv.reader(content.splitlines())
		