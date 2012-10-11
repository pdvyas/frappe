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

wn.provide("wn.ui.form");

wn.ui.form.TagEditor = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this;
		this.$w = $('<div class="tag-line">').appendTo(this.parent);
		$('<div class="clear">').appendTo(this.parent);
		this.$tags = $('<ul>').prependTo(this.$w).tagit({
			animate: false,
			placeholderText: 'Add Tag',
			onTagAdded: function(ev, tag) {
				if(!me.refreshing) {
					wn.call({
						method: 'webnotes.widgets.tags.add_tag',
						args: me.get_args(tag.find('.tagit-label').text())
					});					
				}
			},
			onTagRemoved: function(ev, tag) {
				if(!me.refreshing) {
					wn.call({
						method: 'webnotes.widgets.tags.remove_tag',
						args: me.get_args(tag.find('.tagit-label').text())
					});
				}
			}
		});	
	},
	get_args: function(tag) {
		return {
			tag: tag,
			dt: this.frm.doctype,
			dn: this.frm.docname,
		}
	},
	refresh: function() {
		if(this.frm.doc.__islocal) {
			this.parent.toggle(false);
			return;
		}
		this.parent.toggle(true);

		// render from user tags
		var me = this;
		var user_tags = this.frm.doc._user_tags;
		this.refreshing = true;
		me.$tags.tagit("removeAll");
		if(user_tags) {
			$.each(user_tags.split(','), function(i, v) {
				me.$tags.tagit("createTag", v);
			});
		}
		this.refreshing = false;
	}
});