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

wn.ui.GridControl = wn.ui.Control.extend({
	init: function(opts) {
		opts.docfield.vertical = true;
		this.tabletype = opts.docfield.options;
		this._super(opts);
	},
	make_input: function() {
		wn.lib.import_slickgrid();
		var width = $(this.parent).parent('form:first').width();
		this.$w = $('<div style="height: 300px; border: 1px solid grey;"></div>')
			.appendTo(this.$w.find('.controls'))
			.css('width', width);
			
		var options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			rowHeight: 32,
			editable: false
		};
		
		this.grid = new Slick.Grid(this.$w.get(0), [], 
			this.get_columns(), options);		
	},
	get_columns: function() {
		var columns = $.map(wn.model.get('DocType', this.tabletype).get({doctype:'DocField'}), 
			function(d) {
				if(!d.hidden) {
					return {
						id: d.get('fieldname'),
						field: d.get('fieldname'),
						name: d.get('label'),
						width: 100
					}					
				} else {
					return null;
				}
			}
		);
		
		function EditButtonFormatter(row, cell, value, columnDef, data) {
			return repl('<button class="btn btn-small grid-edit" \
				data-parentfield="%(parentfield)s" data-name="%(name)s">Edit</button>', data);
	  	}
		
		return [{id:'_edit', field:'_edit', name:'', width: 55, 
				formatter:EditButtonFormatter},
				{id:'idx', field:'idx', name:'Sr', width: 40}].concat(columns);
	},
	set_init_value: function() {
		this.set();
	},
	set: function() {
		// refresh values from doclist
		var me = this;
		var rows = wn.model.get(this.doc.get('doctype'), this.doc.get('name'))
			.get({parentfield:this.docfield.fieldname});
			
		this.grid.setData($.map(rows, 
			function(d) { 
				return d.fields; 
			}));
		this.grid.render();
		
		this.$w.find('.grid-edit').on('click', function() {
			var d = wn.model.get(me.doc.get('doctype'), me.doc.get('name')).get({
					parentfield:$(this).attr('data-parentfield'),
					name:$(this).attr('data-name'),
				})[0];
			var form_dialog = new wn.views.FormDialog({
				title: 'Editing row #' + d.get('idx'),
				doc: d
			});
			form_dialog.show();
			return false;
		})
	}
})

