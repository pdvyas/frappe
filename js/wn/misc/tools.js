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

$.extend(wn, {
	_pending_req: 0,
	_fcount: 0,
	_dialog_back: null,
	_top_z_index: 2,
	markdown: function(txt) {
		if(!wn.md2html) {
			wn.require('js/lib/showdown.js');
			wn.md2html = new Showdown.converter();
		}
		return '<div class="markdown">' + wn.md2html.makeHtml(txt) + '</div>';
	},
	get_or_set: function(obj, key, val) {
		if(typeof obj[key] === 'undefined')
			obj[key] = val;
		return obj[key];
	},
	set_loading: function() {
		wn._pending_req++;
		$('#spinner').css('visibility', 'visible');
		$('body').css('cursor', 'progress');
	},
	hide_loading: function() {
		wn._pending_req--;
		if(!wn._pending_req){
			$('body').css('cursor', 'default');
			$('#spinner').css('visibility', 'hidden');
		}
	},
	freeze: function() {
		// blur
		if(!wn._dialog_back) {
			wn._dialog_back = $('<div class="dialog_back">')
				.appendTo('#body_div').css('opacity', 0.6);
		}
		wn._dialog_back.toggle(true);
		wn._fcount++;
	},
	unfreeze: function() {
		if(!wn._fcount)
			return; // anything open?
		wn._fcount--;
		if(!wn._fcount) {
			wn._dialog_back.toggle(false);
		}
	},
	get_top_z_index: function() {
		return wn._top_z_index;
		wn._top_z_index++;
	}
});