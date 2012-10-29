wn.dom.set_style(".user-role {\
	padding: 5px; width: 45%; float: left;\
}\
.user-role input[type='checkbox'] {\
	margin-top: 0px;\
}\
table.user-perm {\
	border-collapse: collapse;\
}\
table.user-perm td, table.user-perm th {\
	padding: 5px; text-align: center;\
	border-bottom: 1px solid #aaa; min-width: 30px;\
}");

// get roles (permissions)

wn.RoleEditor = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_body();
	},
	
	make_body: function() {
		var me = this;

		$(this.wrapper).html('<div class="help">Loading...</div>');
		wn.call({
			method:'webnotes.widgets.role_editor.get_all_roles',
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
			me.change();
		});
		$(this.wrapper).find('.user-role a').click(function() {
			me.show_permissions($(this).parent().attr('data-user-role'))
			return false;
		})
	},
	
	refresh: function() {
		var me = this;
		// set user roles
		
		this.get_selected_roles(function(roles) {
			$(me.wrapper).find('input[type="checkbox"]').attr('checked', false);
			for(var i in roles) {
				$(me.wrapper)
					.find('[data-user-role="'+roles[i]
						+'"] input[type="checkbox"]').attr('checked',true);
			}
		});
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
			method:'webnotes.widgets.role_editor.get_perm_info',
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
		this.perm_dialog = new wn.ui.Dialog({
			title:'Role Permissions',
			width: 500
		});
	}
});


