from webnotes.model.doclist import DocListController

class DocType:
	def __init__(self, d, dl):
		self.doc, self.doclist = d, dl

class DocTypeValidator(DocListController):
	pass
	