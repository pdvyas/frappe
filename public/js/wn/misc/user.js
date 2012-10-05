// misc user functions

wn.user_info = function(uid) {
	var def = {
		'fullname':uid, 
		'image': 'lib/images/ui/avatar.png'
	}
	if(!wn.boot.user_info) return def
	if(!wn.boot.user_info[uid]) return def
	if(!wn.boot.user_info[uid].fullname)
		wn.boot.user_info[uid].fullname = uid;
	if(!wn.boot.user_info[uid].image)
		wn.boot.user_info[uid].image = def.image;
	return wn.boot.user_info[uid];
}

wn.avatar_dims = {};
wn.avatar = function(user, large) {
	var image = wn.user_info(user).image;
	var to_size = large ? 72 : 30;
	
	var get_adj = function(large, small) {
		if(small==0); return 0;
		return cint((flt(large) / flt(small) * 72 - 72) / 2);
	}
	
	// find the smaller dim by rendering in hidden div
	if(!wn.avatar_dims[image]) {
		var img = $('<img src="'+image+'">').appendTo("#dialog-container").toggle(false);
		if(img.width() < img.height()) {
			var opts = {
				smaller_dim: "width",
				adjust_dim: "margin-top",
				adjust_len_large: get_adj(img.height(), img.width())
			}
		} else {
			var opts = {
				smaller_dim: "height",
				adjust_dim: "margin-left",
				adjust_len_large: get_adj(img.width(), img.height())
			}
		}
		opts.adjust_len_small = flt(opts.adjust_len_large) * 30 / 72;
		wn.avatar_dims[image] =  opts;
	}
	
	var dims = wn.avatar_dims[image];
	
	return repl('<span class="avatar" style="width: %(len)s; height: %(len)s;\
		border-radius: %(len)s;">\
		<img src="%(image)s" style="%(smaller_dim)s: %(len)s; \
			%(adjust_dim)s: -%(adjust_len)spx;"></span>', {
			image: image,
			smaller_dim: dims.smaller_dim,
			len: to_size + "px",
			adjust_dim: dims.adjust_dim,
			adjust_len: large ? dims.adjust_len_large : dims.adjust_len_small
		});
}

wn.provide('wn.user');

$.extend(wn.user, {
	name: (wn.boot ? wn.boot.profile.name : 'Guest'),
	has_role: function(rl) {
		if(typeof rl=='string') 
			rl = [rl];
		for(var i in rl) {
			if((wn.boot ? wn.boot.profile.roles : ['Guest']).indexOf(rl[i])!=-1)
				return true;
		}
	},
	is_report_manager: function() {
		return wn.user.has_role(['Administrator', 'System Manager', 'Report Manager']);
	}
})

// wn.session_alive is true if user shows mouse movement in 30 seconds

wn.session_alive = true;
$(document).bind('mousemove', function() {
	wn.session_alive = true;
	if(wn.session_alive_timeout) 
		clearTimeout(wn.session_alive_timeout);
	wn.session_alive_timeout = setTimeout('wn.session_alive=false;', 30000);
})