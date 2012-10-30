// Copyright (c) 2012 Web Notes Technologies Pvt Ltd (http://erpnext.com)
// 
// MIT License (MIT)
// 
// Permission is hereby granted, free of charge, to any person obtaining a 
// copy of this software and associated documentation files (the "Software"), 
// to deal in the Software without restriction, including without limitation 
// the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the 
// Software is furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in 
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// 

wn.provide("wn.ui");

wn.ui.TagEditor = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_body();
		this.make_tagit();
	},
	make_body: function() {
		this.$w = $('<div class="tag-line">')
			.appendTo(this.parent);
		$('<div class="clear">')
			.appendTo(this.parent);
	},
	make_tagit: function() {
		var me = this;
		this.$tags = $('<ul>').prependTo(this.$w).tagit({
			animate: false,
			placeholderText: 'Add Tag',
			onTagAdded: function(ev, tag) {
				if(!me.refreshing) {
					var tagtxt = tag.find('.tagit-label').text();
					wn.call({
						method: 'webnotes.widgets.tags.add_tag',
						args: me.get_args(tagtxt),
						callback: function(r) { me.callback(r); }
					});
				}
			},
			onTagRemoved: function(ev, tag) {
				if(!me.refreshing) {
					var tagtxt = tag.find('.tagit-label').text();
					wn.call({
						method: 'webnotes.widgets.tags.remove_tag',
						args: me.get_args(tagtxt),
						callback: function(r) { me.callback(r); }
					});
				}
			}
		});	
	},

	get_args: function(tag) {
		return {
			tag: tag,
			dt: this.doctype,
			dn: this.docname,
		}
	},

	refresh: function() {
		// render from user tags
		var me = this;
		if(this.set_opts) 
			this.set_opts();
		this.refreshing = true;
		me.$tags.tagit("removeAll");
		if(this.user_tags) {
			$.each(this.user_tags.split(','), function(i, v) {
				if(v)me.$tags.tagit("createTag", v);
			});
		}
		this.refreshing = false;
	}
});