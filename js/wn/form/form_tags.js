wn.ui.TagEditor = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this;
		this.$w = $('<div class="tag-line">').prependTo(this.form_page.$w)
		this.$tags = $('<ul>').prependTo(this.$w).tagit({
			placeholderText: 'Add Tag',
			onTagAdded: function(ev, tag) {
				if(me.initialized) {
					wn.call({
						method: 'webnotes.widgets.tags.add_tag',
						args: me.get_args(tag.find('.tagit-label').text())
					});					
				}
			},
			onTagRemoved: function(ev, tag) {
				wn.call({
					method: 'webnotes.widgets.tags.remove_tag',
					args: me.get_args(tag.find('.tagit-label').text())
				});
			}
		});	
		this.render();
		this.initialized = true;
	},
	get_args: function(tag) {
		return {
			tag: tag,
			dt: this.form_page.doclist.doc.get('doctype'),
			dn: this.form_page.doclist.doc.get('name'),
		}
	},
	render: function() {
		// render from user tags
		var me = this;
		var user_tags = this.form_page.doclist.doc.get('_user_tags');
		if(user_tags) {
			$.each(user_tags.split(','), function(i, v) {
				me.$tags.tagit("createTag", v);
			});
		}
	}
})