var READ = 0; var WRITE = 1; var CREATE = 2; var SUBMIT = 3; var CANCEL = 4; var AMEND = 5;

wn.provide('wn.model.perm');

$.extend(wn.model.perm, {
	get: function(dt, dn) {
		var perm = [[0,0],];

		if(in_list(user_roles, 'Administrator')) 
			perm[0][READ] = 1;

		wn.model.get('DocType', dt).each({doctype:'DocPerm'}, function(p) {
			var p = p.fields;
			var level = cint(p.permlevel || 0);
			if(in_list(user_roles, p.role)) {
				if(wn.model.perm.check_match(p, dt, dn)) { // new style
					if(!perm[level])
						perm[level] = [0,0,0,0,0,0];

					perm[level][READ] = perm[level][READ] || cint(p.read) || cint(p.write);
					perm[level][WRITE] = perm[level][WRITE] || cint(p.write);
					perm[level][CREATE] = perm[level][CREATE] || cint(p.create);
					perm[level][SUBMIT] = perm[level][SUBMIT] || cint(p.submit);
					perm[level][AMEND] = perm[level][AMEND] || cint(p.amend);
					perm[level][CANCEL] = perm[level][CANCEL] || cint(p.cancel);
				}

			}
		});
		return perm;
	},
	check_match: function(p, dt, dn) {
		if(!dn) 
			return true;
		if(!p.match)
			return true;

		var doc_val = wn.model.get(dt, dn).doc.get(p.match);
		if(user_defaults[p.match]) {
			for(var i=0;i<user_defaults[p.match].length;i++) {
				 // user must have match field in defaults
				if(user_defaults[p.match][i] === doc_val) {
				    // must match document
		  			return true;
				}
			}
			return false;
		} else if(!doc_val) { // blanks are true
			return true;
		} else {
			return false;
		}
	}
});