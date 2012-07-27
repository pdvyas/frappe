from __future__ import unicode_literals
keywords = """add_days, add_months, add_years, cint, cstr, date_diff, default_fields, 
flt, fmt_money, formatdate, generate_hash, getTraceback, get_defaults, get_first_day, 
get_last_day, getdate, has_common, month_name, nowdate, now, replace_newlines, 
sendmail, set_default, str_esc_quote, user_format, validate_email_add, Document, addchild, 
getchildren, make_autoname, getlist, get_obj, get_server_obj, run_server_obj,
updatedb, check_syntax, session, form, msgprint, 
errprint""".replace(' ', '').replace('\n', '').split(',')

import os

def replace():
	cnt = 0
	for wt in os.walk('.'):
		if not wt[0].startswith('lib'):
			for fname in wt[2]:
				if fname.endswith('.py') and fname!='temp.py':
					with file(os.path.join(wt[0], fname),'r') as codefile:
						code = codefile.read()
						changed = False
						for kw in keywords:
							if code.count(kw)==1:
								for line in code.split('\n'):
									if line.strip().startswith('import') or line.strip().startswith('from'):
										if kw in line:
											if ', ' + kw in line:
												code = code.replace(', ' + kw, '')
											else:
												code = code.replace(kw, '')
											changed = True
								for line in code.split('\n'):
									if line.strip().startswith('from') and line.strip().endswith('import'):
										code = code.replace("\n" + line, "")
									if line.strip().startswith('from') and "import , " in line:
										code = code.replace("import , ", "import ")
								
						for kw in ["in_transaction = webnotes.conn.in_transaction",
							"convert_to_lists = webnotes.conn.convert_to_lists",
							"get_value = webnotes.conn.get_value",
							"set = webnotes.conn.set",
							"# Please edit this list and import only required elements",
							"# -----------------------------------------------------------------------------------------"]:
							if kw in code:
								code = code.replace("\n" + kw, "")
								changed = True
	
					if changed:
						with file(os.path.join(wt[0], fname),'w') as codefile:
							codefile.write(code)
							print 'changed ' + fname
						
replace()