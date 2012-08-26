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

// opts { width, height, title, fields (like docfields) }

wn.ui.Dialog = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.display = false;

		if(!this.width) this.width = 640;
		
		if(!$('#dialog-container').length) {
			$('<div id="dialog-container">').appendTo('body');
		}
						
		this.wrapper = $('<div class="dialog_wrapper">').appendTo('#dialog-container').get(0);
		this.wrapper.style.width = this.width + 'px';

		this.make_head();
		this.body = $('<div class="dialog_body">').appendTo(this.wrapper).get(0);
	},
	
	make_head: function() {
		var me = this;
		this.appframe = new wn.ui.AppFrame(this.wrapper);
		this.appframe.$titlebar.find('.close').unbind('click').click(function() {
			if(me.oncancel)me.oncancel(); me.hide();
		});
		this.set_title(this.title);
	},
	
	set_title: function(t) {
		this.appframe.$titlebar.find('.appframe-title').html(t || '');
	},
	
	set_postion: function() {
		// place it at the center
		this.wrapper.style.left  = (($(window).width() - parseInt(this.wrapper.style.width))/2) + 'px';
        this.wrapper.style.top = ($(window).scrollTop() + 60) + 'px';

		// place it on top
		top_index++;
		$(this.wrapper).css('z-index', top_index);	
	},
	
	/** show the dialog */
	show: function() {
		// already live, do nothing
		if(this.display) return;

		// set position
		this.set_postion()

		// show it
		$(this.wrapper).toggle(true);

		// hide background
		freeze();

		this.display = true;
		wn.ui.cur_dialog = this;
		
		this.trigger('show');
	},

	hide: function() {
		// call onhide
		this.trigger('hide');

		// hide
		unfreeze();
		$(this.wrapper).toggle(false);

		// flags
		this.display = false;
		wn.ui.cur_dialog = null;
	},
		
	no_cancel: function() {
		this.appframe.$titlebar.find('.close').toggle(false);
	}
});

wn.ui.cur_dialog = null;

// close open dialogs on ESC
$(document).bind('keydown', function(e) {
	if(wn.ui.cur_dialog && !wn.ui.cur_dialog.no_cancel_flag && e.which==27) {
		wn.ui.cur_dialog.hide();
	}
});