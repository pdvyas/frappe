// assign to
wn.ui.AssignTo = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_button();
		this.make_dropdown();
		if(this.form_page.doclist.doc.get('__assigned_to')) {
			this.set_assign_button_text(wn.boot.user_info[
				this.form_page.doclist.doc.get('__assigned_to')]);
		}
	},
	make_button: function() {
		this.$w = $('<div class="btn-group">\
			<span class="label dropdown-toggle" \
				style="width: 180px; overflow: hidden; text-align: left; display: inline-block;" \
				data-toggle="dropdown">Not Assigned</span>\
			<ul class="dropdown-menu">\
			</ul>\
		</div>').appendTo(this.form_page.$sidebar);		
	},
	make_dropdown: function() {
		this.assign_btn = this.$w.find('.dropdown-toggle');
		var ul = this.$w.find('ul');
		var me = this;
		
		$.each(keys(wn.boot.user_info).sort().concat(''), function(i, v) {
			if(v!='Guest') {
				if(v) {
					var ui = $.extend(wn.boot.user_info[v], {id: v});
				} else {
					var ui = {fullname:'Not Assigned', id: null};
					$('<li class="divider"></li>').appendTo(ul);
				}
	
				$('<a></a>').html(ui.fullname).data('user-info', ui)
					.appendTo($('<li>').appendTo(ul)).click(function() {
						me.assign($(this).data('user-info'));
					});
			}
		});
		
		this.assign_btn.dropdown();		
	},
	assign: function(user_info) {
		this.assign_btn.attr('disabled', 'disabled').text('Updating...');
		var me = this;
		if(user_info.id) {
			wn.model.insert({
				doctype: 'ToDo',
				reference_name: this.form_page.doclist.doc.get('name'),
				reference_type: this.form_page.doclist.doc.get('doctype'),
				owner: user_info.id,
				description: 'You have been assigned this.',
				assigned_by: user
			}, function(r) {
				me.set_assign_button_text(user_info);
			})
		} else {
			wn.call({
				method: 'core.doctype.todo.todo.remove_todo',
				args: {
					reference_name: this.form_page.doclist.doc.get('name'),
					reference_type: this.form_page.doclist.doc.get('doctype')					
				},
				callback: function(r) {
					me.set_assign_button_text(user_info);
				}
			});
		}
	},
	set_assign_button_text: function(user_info) {
		if(user_info.id) {
			this.assign_btn.text(user_info.fullname).addClass('label-success', user_info.id);			
		} else {
			this.assign_btn.text(user_info.fullname).removeClass('label-success', user_info.id);			
		}
		this.assign_btn.attr('disabled', null);
		this.assign_to = user_info.id;
	},
	
})
