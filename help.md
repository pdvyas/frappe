## frequently used function / methods

### server-side

* `webnotes.model.get(doctype, name)` - returns DocList of given doctype and name

* `webnotes.model.get_doctype(doctype)` - returns DocType's DocList

* `webnotes.model.insert(doclist)` - inserts doclist and returns the corresponding controller

* `webnotes.model.update(doclist)` - in doclist, updates doc if exists, else appends as new

* `webnotes.model.insert_variants(base, variants)` - copies base doc, updates it with variant info and inserts it

* `webnotes.model.insert_child(fields)` - insert child to doclist specified by parenttype and parent and saves the doclist

* `webnotes.model.get_controller(doctype, name)` - gets the controller object for given doctype

* `{controller_obj}.save()` - save the doclist [need to specify __islocal for individual docs if new]

### client-side


### server-side testing

* `webnotes.model.insert_test_data(doctype, sort_fn)` - inserts test data in db
