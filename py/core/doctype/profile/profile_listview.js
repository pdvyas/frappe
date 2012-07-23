// render
wn.doclistviews['Profile'] = wn.views.ListView.extend({
	init: function(d) {
		this._super(d)
		this.fields = this.fields.concat([
			"`tabProfile`.enabled",
		]);		
	},
	columns: [
		{width: '3%', content: 'check'},
		{width: '5%', content:'avatar'},
		{width: '40%', content:'name'},
		{width: '10%', content: function(parent, data, me) {
			if(data.enabled) {
				$('<span class="label label-info">Enabled</span>').appendTo(parent);
			} else {
				$('<span class="label">Disabled</span>').appendTo(parent);				
			}
		}},
		{width: '10%', content:'tags'},
		{width: '20%', content:'supplier_type', css: {'color': '#aaa'}},
		{width: '12%', content:'modified', css: {'text-align': 'right', 'color':'#777'}}
	]
});