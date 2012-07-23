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

wn.RoleEditor = Class.extend({
	init: function(wrapper) {
		var me = this;
		this.wrapper = wrapper;
		$(wrapper).html('<div class="help">Loading...</div>')
		wn.call({
			method:'core.doctype.profile.profile.get_all_roles',
			callback: function(r) {
				me.roles = r.message;
				me.show_roles();
			}
		});
	},
	show_roles: function() {
		var me = this;
		$(this.wrapper).empty();
		for(var i in this.roles) {
			$(this.wrapper).append(repl('<div class="user-role" \
				data-user-role="%(role)s">\
				<input type="checkbox"> \
				<a href="#">%(role)s</a>\
			</div>', {role: this.roles[i]}));
		}
		$(this.wrapper).find('input[type="checkbox"]').change(function() {
			cur_frm.set_unsaved();
		});
		$(this.wrapper).find('.user-role a').click(function() {
			me.show_permissions($(this).parent().attr('data-user-role'))
			return false;
		})
	},
	show: function(uid) {
		var me = this;
		this.uid = uid;
		// set user roles
		wn.call({
			method:'core.doctype.profile.profile.get_user_roles',
			args: {uid:uid},
			callback: function(r, rt) {
				$(me.wrapper).find('input[type="checkbox"]').attr('checked', false);
				for(var i in r.message) {
					$(me.wrapper)
						.find('[data-user-role="'+r.message[i]
							+'"] input[type="checkbox"]').attr('checked',true);
				}
			}
		})
	},
	get_roles: function() {
		var set_roles = [];
		var unset_roles = [];
		$(this.wrapper).find('[data-user-role]').each(function() {
			var $check = $(this).find('input[type="checkbox"]');
			if($check.attr('checked')) {
				set_roles.push($(this).attr('data-user-role'));
			} else {
				unset_roles.push($(this).attr('data-user-role'));
			}
		});
		
		return {
			set_roles: set_roles,
			unset_roles: unset_roles
		}
	},
	show_permissions: function(role) {
		// show permissions for a role
		var me = this;
		if(!this.perm_dialog)
			this.make_perm_dialog()
		$(this.perm_dialog.body).empty();
		wn.call({
			method:'core.doctype.profile.profile.get_perm_info',
			args: {role: role},
			callback: function(r) {
				var $body = $(me.perm_dialog.body);
				$body.append('<table class="user-perm"><tbody><tr>\
					<th style="text-align: left">Document Type</th>\
					<th>Level</th>\
					<th>Read</th>\
					<th>Write</th>\
					<th>Submit</th>\
					<th>Cancel</th>\
					<th>Amend</th></tr></tbody></table>');
				for(var i in r.message) {
					var perm = r.message[i];
					
					// if permission -> icon
					for(key in perm) {
						if(key!='parent' && key!='permlevel') {
							if(perm[key]) {
								perm[key] = '<i class="icon-ok"></i>';
							} else {
								perm[key] = '';
							}							
						}
					}
					
					$body.find('tbody').append(repl('<tr>\
						<td style="text-align: left">%(parent)s</td>\
						<td>%(permlevel)s</td>\
						<td>%(read)s</td>\
						<td>%(write)s</td>\
						<td>%(submit)s</td>\
						<td>%(cancel)s</td>\
						<td>%(amend)s</td>\
						</tr>', perm))
				}
				
				me.perm_dialog.show();
			}
		});
		
	},
	make_perm_dialog: function() {
		this.perm_dialog = new wn.widgets.Dialog({
			title:'Role Permissions',
			width: 500
		});
	}
});


