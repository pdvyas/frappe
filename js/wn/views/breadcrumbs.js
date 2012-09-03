wn.provide('wn.views');
wn.views.breadcrumbs = function(appframe, module, doctype, name) {
	appframe.clear_breadcrumbs();

	if(name) {
		appframe.add_breadcrumb(name);
	} else if(doctype) {
		appframe.add_breadcrumb(wn._(doctype) + " " + wn._("List"));
	} else if(module) {
		appframe.add_breadcrumb(wn._(module));
	}

	if(name && doctype && (!wn.model.get('DocType', doctype).issingle)) {
		appframe.add_breadcrumb(repl(' in <a href="#!List/%(doctype)s">%(doctype_label)s</a>',
			{
				doctype: doctype,
				doctype_label: wn._(doctype) + " " + wn._("List")
			}))
	};
	
	if(doctype && module && wn.modules && wn.modules[module]) {
		appframe.add_breadcrumb(repl(' in <a href="#!%(module_page)s">%(module)s</a>',
			{module: wn._(module), module_page: wn.modules[module] }))
	}
}