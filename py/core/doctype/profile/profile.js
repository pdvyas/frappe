cur_frm.cscript.onload = function(doc) {
	if(!cur_frm.roles_editor) {
		var role_area = $('<div style="min-height: 300px">')
			.appendTo(cur_frm.fields_dict.roles_html.wrapper);
		cur_frm.roles_editor = new wn.RoleEditor(role_area);
	}
}

cur_frm.cscript.refresh = function(doc) {
	cur_frm.toggle_display(['new_password', 'send_welcome_mail'], doc.__islocal);
	cur_frm.toggle_reqd('new_password', doc.__islocal);
	
	cur_frm.set_intro(doc.enabled ? '' : 'This user is diabled.');

	if(doc.__islocal) {
		cur_frm.toggle_display(['sb1', 'sb2', 'sb3'], false);
	} else {
		cur_frm.cscript.enabled(doc);
		cur_frm.roles_editor.show(doc.name);
		if(doc.enabled)
			cur_frm.show_update_password();
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

cur_frm.show_update_password = function() {
	if(!in_list(['Administrator', 'System Manager'], user)) return;
	cur_frm.add_custom_button('Set New Password', function() {
		var d = new wn.ui.Dialog({
			title: "Update Password",
			fields: [
				{label: "New Password", fieldname: "new_password", fieldtype:"Password",
					reqd: 1},
				{label: "Send email to the user with the new password", fieldtype:"Check",
					fieldname: "send_mail", "default": 1},
				{label: "Update", fieldtype: "Button", fieldname:"update"}
			]
		});
		d.show();
		$(d.fields_dict.update.input).click(function() {
			var v = d.get_values();
			if(!v) return;
			
			wn.call({
				method: 'core.doctype.profile.profile.update_password',
				args: {
					user: cur_frm.docname,
					new_password: v.new_password,
					send_mail: v.send_mail
				},
				callback: function(r) {
					if(r.message) msgprint(r.message);
					d.hide();
				},
				btn: this
			});
		});
		cur_frm.update_dialog = d;
	})
}

wn.require('lib/py/core/doctype/profile/role_editor.js');

