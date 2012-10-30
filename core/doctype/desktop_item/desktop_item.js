wn.provide("wn.core")

wn.core.DesktopItem = wn.ui.form.Controller.extend({
	onload: function() {
		var me = this;
		wn.require("lib/public/js/wn/misc/role_editor.js");
		
		// make role editor
		this.frm.roles_editor = new wn.RoleEditor({
			wrapper: this.frm.fields_dict.roles_html.$wrapper,
			get_selected_roles: function(callback) {
				wn.call({
					method:'core.doctype.desktop_item.desktop_item.get_roles',
					args: {desktop_item: me.frm.doc.name},
					callback: function(r) {
						callback(r.message);
					}
				});
			},
			change: function() {
				me.frm.set_unsaved();
			}
		});
				
	},
	refresh: function(doc) {
		this.frm.set_intro("");
		if(doc.is_custom=="No" && !in_list(user_roles, 'Administrator')) {
			// make the document read-only
			this.frm.perm[0][WRITE] = 0;
			this.frm.set_intro('Standard Desktop Item editable by Administrator only.');
		}
		if(this.frm.roles_editor)
			this.frm.roles_editor.refresh();
	},
	validate: function(doc) {
		this.frm.doc.__temp = JSON.stringify(
			this.frm.roles_editor.get_roles().set_roles || []);
	}
});

cur_frm.cscript = new wn.core.DesktopItem({frm:cur_frm});