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

wn.ui.LinkControl = wn.ui.Control.extend({
	make_input: function() {
		var me = this;
		this.$input_wrap = $('<div class="input-append">').appendTo(this.$w.find('.controls'));
		this.$input = $('<input type="text" size="16"/>').appendTo(this.$input_wrap);
		this.$button = $('<button class="btn"><i class="icon-search"></i></button>')
			.appendTo(this.$input_wrap)
			.click(function() {
				
				me.search_dialog = new wn.ui.Search({
					doctype: me.docfield.options, 
					txt: me.$input.val(),
					with_filters: me.filters,
					df: me.docfield,
					callback: function(val) {
						me.set(val);
					}});				
				
				return false;
			});
		this.make_autocomplete();
	},
	make_autocomplete: function() {
		var me = this;
		this.$input.autocomplete({
			source: function(request, response) {
				var tab_name = "`tab"+ me.docfield.options+"`"
				var filters = [[me.docfield.options, "name", "like", request.term + '%']].concat(me.filters || []);
				var search_fields = me.docfield.search_fields || [];
				wn.call({
					method: 'webnotes.widgets.doclistview.get',
					args: {
						'docstatus': ["0", "1"],
						"fields": $.map(["name"].concat(search_fields), function(v) {
							return "`tab" + me.docfield.options + "`." + strip(v);
						}),
						"filters": filters,
						'doctype': me.docfield.options
					},
					callback: function(r) {
						response($.map(r.message, function(v) {
							return {
								"label": v.name,
								"info": $.map(search_fields, function(f) { return v[f]; }).join(", "),
							}
						}));
					}
				});
			},
			open: function() {
				$(this).autocomplete('widget').css('z-index', wn.get_top_z_index());
				return false;				
			},
			select: function(event, ui) {
				me.set_input(ui.item.value);
			}
		}).data('autocomplete')._renderItem = function(ul, item) {
			return $('<li></li>')
				.data('item.autocomplete', item)
				.append(repl('<a>%(label)s<br><span style="font-size:10px">%(info)s</span></a>', item))
				.appendTo(ul);
		};		
	},
	toggle_input: function(show) {
		this.$input_wrap.toggle(show);
	},
	set_disabled: function(disabled) {
		this.$input.attr('disabled', disabled ? 'disabled' : null);
		this.$button.attr('disabled', disabled ? 'disabled' : null);
	}
});