# Copyright (c) 2012 Web Notes Technologies Pvt Ltd (http://erpnext.com)
# 
# MIT License (MIT)
# 
# Permission is hereby granted, free of charge, to any person obtaining a 
# copy of this software and associated documentation files (the "Software"), 
# to deal in the Software without restriction, including without limitation 
# the rights to use, copy, modify, merge, publish, distribute, sublicense, 
# and/or sell copies of the Software, and to permit persons to whom the 
# Software is furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in 
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
# CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
# OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
# 

from __future__ import unicode_literals
"""
Simple Caching:

Stores key-value pairs in database and enables simple caching

CacheItem(key).get() returns the cached value if not expired (else returns null)
CacheItem(key).set(interval = 60000) sets a value to cache, expiring after x seconds
CacheItem(key).clear() clears an old value
setup() sets up cache
"""

import webnotes

def clear(key):
	"""clear doctype cache"""
	if key:
		webnotes.conn.sql("delete from __CacheItem where `key`=%s", key)
	else:
		webnotes.conn.sql("""delete from __CacheItem""")

def get(key):
	"""get cache"""
	value = webnotes.conn.sql("""select `value` from __CacheItem where 
		`key`=%s""", key)
	return value and value[0][0] or None
	
def set(key, value):
	"""set in cache"""
	clear(key)	
	webnotes.conn.sql("""insert into __CacheItem (`key`, `value`) 
		values (%s, %s)""", (key, str(value)))
