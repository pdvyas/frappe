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
import webnotes

@webnotes.whitelist()
def get_all_roles(arg=None):
	"""return all roles"""
	return [r[0] for r in webnotes.conn.sql("""select name from tabRole
		where name not in ('Administrator', 'Guest', 'All') order by name""")]
		
@webnotes.whitelist()
def get_user_roles(arg=None):
	"""get roles for a user"""
	return webnotes.get_roles(webnotes.form_dict['uid'])

@webnotes.whitelist()
def get_perm_info(arg=None):
	"""get permission info"""
	return webnotes.conn.sql("""select document_type, permlevel, `read`, `write`, submit,
		cancel, amend from tabDocPerm where role=%s 
		and docstatus<2 order by parent, permlevel""", 
			webnotes.form_dict['role'], as_dict=1)