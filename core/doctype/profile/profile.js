cur_frm.cscript.onload = function(doc) {
	if(!cur_frm.roles_editor) {
		var role_area = $('<div style="min-height: 300px">')
			.appendTo(cur_frm.fields_dict.roles_html.wrapper);
		
		wn.require("lib/public/js/wn/misc/role_editor.js");
		
		// make role editor
		cur_frm.roles_editor = new wn.RoleEditor({
			wrapper: role_area,
			get_selected_roles: function(callback) {
				wn.call({
					method:'webnotes.widgets.role_editor.get_user_roles',
					args: {uid: cur_frm.doc.name},
					callback: function(r) {
						callback(r.message);
					}
				});
			},
			change: function() {
				cur_frm.set_unsaved();
			}
		});
	}
}

cur_frm.cscript.refresh = function(doc) {
	cur_frm.toggle_reqd('new_password', doc.__islocal);

	if(doc.__islocal) {
		cur_frm.toggle_display(['sb1', 'sb2', 'sb3'], false);
	} else {
		cur_frm.cscript.enabled(doc);
		cur_frm.roles_editor.refresh()
	}
}

cur_frm.cscript.enabled = function(doc) {
	if(!doc.__islocal) {
		cur_frm.toggle_display(['sb1', 'sb2', 'sb3'], doc.enabled);	
		cur_frm.toggle_enable('*', doc.enabled);
		cur_frm.set_df_property('enabled', 'disabled', false);		
	}
	cur_frm.toggle_enable('email', doc.__islocal);
}

cur_frm.cscript.validate = function(doc) {
	doc.__temp = JSON.stringify({
		roles:cur_frm.roles_editor.get_roles()
	});
}
