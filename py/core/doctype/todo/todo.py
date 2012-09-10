# ERPNext - web based ERP (http://erpnext.com)
# Copyright (C) 2012 Web Notes Technologies Pvt Ltd
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


import webnotes
import webnotes.model
from webnotes.model.controller import DocListController

class ToDoController(DocListController):
	def validate(self):
		"""create comment if assignment"""
		if self.doc.assigned_by:
			remove(self.doc.parent, self.doc.reference_name)
			webnotes.model.insert({
				'doctype':'Comment',
				'comment':'<a href="#Form/%s/%s">%s</a> has been assigned to you.' % (
					self.doc.parent, self.doc.reference_name, self.doc.reference_name),
				'owner': self.doc.owner,
				'parenttype': 'Message',
				'comment_by': webnotes.session['user']
			})
			
	def on_trash(self):
		"""if assigned, notify assigner that task is closed"""
		if self.doc.assigned_by:
			webnotes.model.insert({
				'doctype':'Comment',
				'comment':'<a href="#Form/%s/%s">%s</a> you had assigned has been closed.' % (
					self.doc.parent, self.doc.reference_name, self.doc.reference_name),
				'owner': self.doc.assigned_by,
				'parenttype': 'Message',
				'comment_by': webnotes.session['user']
			})

@webnotes.whitelist()
def remove_todo():
	remove(webnotes.form.parent, webnotes.form.reference_name)
	
def remove(parent, reference_name):
	"""remove any other assignment related to this reference"""
	for name in webnotes.conn.sql("""select name from tabToDo where parent=%s and 
		reference_name=%s""", (parent, reference_name)):
		webnotes.model.delete_doc('ToDo', name[0])