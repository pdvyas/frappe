wn.provide('wn.views');
wn.views.breadcrumbs = function(appframe, module, doctype, name) {
	appframe.clear_breadcrumbs();

	if(name) {
		appframe.add_breadcrumb(name);
	} else if(doctype) {
		appframe.add_breadcrumb(doctype + ' List');
	} else if(module) {
		appframe.add_breadcrumb(module);
	}
}