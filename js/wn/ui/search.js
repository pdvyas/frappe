// search widget

// options: doctype, callback, txt, query (if applicable)
wn.ui.Search = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		var me = this;
		wn.model.with_doctype(this.doctype, function(r) {
			me.make();
			me.dialog.show();
			me.list.$w.find('.list-filters input[type="text"]').focus();
		});
	},
	make: function() {
		var me = this;
		this.dialog = new wn.ui.Dialog({
			title: this.doctype + ' Search',
			width: 500
		});
		
		if(this.with_filters && this.with_filters.length) {
			this.msg_area = $('<div class="help-box">\
				<div><b>Results containing: </b></div>\
				</div>').appendTo(this.dialog.body);			
			$.each(this.with_filters, function(i, f) {
				$('<div>"' + wn.model.get_label(f[1], me.doctype) + '" ' + 
					f[2] + ' "'+ f[3]+'"</div>').appendTo(me.msg_area);
			})
		}
		
		this.list = new wn.ui.Listing({
			parent: $('<div>').appendTo(this.dialog.body),
			appframe: this.dialog.appframe,
			new_doctype: this.doctype,
			doctype: this.doctype,
			method: 'webnotes.widgets.doclistview.get',
			show_filters: true,
			style: 'compact',
			get_args: function() {
				if(me.query) {
					me.page_length = 50; // there has to be a better way :(
					return {
						query: me.query
					}
				} else {
					var filters = me.list.filter_list.get_filters() || [];
					if(me.with_filters) {
						filters = filters.concat(me.with_filters);
					}
					
					return {
						doctype: me.doctype,
						fields: [ '`tab' + me.doctype + '`.name'],
						filters: filters,
						docstatus: ['0','1']
					}					
				}
			},
			render_row: function(parent, data) {
				$ln = $('<a style="cursor: pointer;" data-name="'+data.name+'">'
					+ data.name +'</a>')
					.appendTo(parent)
					.click(function() {
						var val = $(this).attr('data-name');
						me.dialog.hide(); 
						if(me.callback)
							me.callback(val);
						else 
							wn.set_route('Form', me.doctype, val);
					});
			}
		});
		this.list.filter_list.add_filter('name', 'like');
		// preset text
		if(this.txt)
			this.list.$w.find('.list-filters input[type="text"]').val(this.txt)
		this.list.run();
	}
})