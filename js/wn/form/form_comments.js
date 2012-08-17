// comments
wn.ui.Comments = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_body();
		// render existing
		var me = this;
		$.each(this.form_page.doclist.doc.get('__comments'), function(i, v) {
			me.render_comment(v);
		})
	},
	make_body: function() {
		var me = this;
		this.$w = $('<div class="comments-area"><br>\
			<b>Comments:</b><br>\
			<textarea style="width: 190px; height: 36px;" \
				class="comment comment-text"></textarea>\
			<button class="btn btn-small">Add Comment</button>\
			<div class="comment-list" style="margin-top: 17px;"></div>\
			</div>').appendTo(this.form_page.$sidebar);
		this.$w.find('.btn').click(function() {
			me.add_comment(me.$w.find('textarea').val());
		})
	},
	add_comment: function(comment) {
		var me = this;
		
		wn.model.insert({
			doctype: 'Comment',
			comment: comment,
			parenttype: this.form_page.doclist.doc.get('doctype'),
			parent: this.form_page.doclist.doc.get('name'),
			parentfield: 'comments',
			comment_by: user,
		}, function(r) {
			me.$w.find('textarea').val('');
			me.render_comment(r.docs[0]);
		}, this.$w.find('.btn'))

	},
	render_comment: function(comment) {
		comment.date = prettyDate(comment.creation);
		comment.comment_by_fullname = wn.boot.user_info[comment.comment_by].fullname;
		$(repl('<div style="margin-bottom: 7px; border-bottom: 1px dashed #888; \
			padding-bottom: 7px;">\
				<div class="comment">%(comment)s</div>\
				<div style="font-size: 80%">\
					<span style="color: #888;">%(date)s</span>\
					<span style="float: right; color: #888;">- %(comment_by_fullname)s</span>\
				</div>\
			</div>', comment))
				.prependTo(this.$w.find('.comment-list'));
	}
})

