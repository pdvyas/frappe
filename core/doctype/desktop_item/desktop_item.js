wn.provide("wn.core")

wn.core.DesktopItem = wn.ui.form.Controller.extend({
	refresh: function(doc) {
		this.frm.set_intro("");
		if(doc.is_custom=="No" && !in_list(user_roles, 'Administrator')) {
			// make the document read-only
			this.frm.perm[0][WRITE] = 0;
			this.frm.set_intro('Standard Desktop Item editable by Administrator only.');
		}
	}
});

cur_frm.cscript = new wn.core.DesktopItem({frm:cur_frm});