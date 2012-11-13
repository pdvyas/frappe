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

wn.provide('wn.utils');

wn.utils = {
	filter_dict: function(dict, filters) {
		var ret = [];
		if(typeof filters=='string') {
			return [dict[filters]];
		}
		$.each(dict, function(i, d) {
			for(key in filters) {
				if(d[key]!=filters[key]) return;
			}
			ret.push(d);
		});
		return ret;
	},
	
	comma_or: function(list) {
		return wn.utils.comma_sep(list, " or ");
	},
	comma_and: function(list) {
		return wn.utils.comma_sep(list, " and ");
	},
	comma_sep: function(list, sep) {
		if(list instanceof Array) {
			if(list.length==0) {
				return "";
			} else if (list.length==1) {
				return list[0];
			} else {
				return list.slice(0, list.length-1).join(", ") + sep + list.slice(-1)[0];
			}
		} else {
			return list;
		}
	},
	
	all: function(iterator) {
		var result = true;
		$.each(iterator, function(i, val) {
			if(!result) return;
			
			if($.isArray(val)) {
				result = (val.length > 0);
			} else if($.isPlainObject(val)) {
				result = !$.isEmptyObject(val);
			} else if(!val) {
				result = false;
			}
		});
		return result;
	},
	
	any: function(iterator) {
		var result = false;
		$.each(iterator, function(i, val) {
			if(result) return;
			
			if($.isArray(val)) {
				result = (val.length > 0);
			} else if($.isPlainObject(val)) {
				result = !$.isEmptyObject(val);
			} else if(val) {
				result = true;
			}
		});
		return result;
	},
}