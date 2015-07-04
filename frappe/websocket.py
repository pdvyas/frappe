import os
import sys
import json
from frappe import conf



def emit_via_redis(event, message, room=None):
	r = get_redis_server()
	r.publish('events', json.dumps({'event': event, 'message': message, 'room': room}))


def put_log(task_id, line_no, line):
	r = get_redis_server()
	print "task_log:" + task_id
	r.hset("task_log:" + task_id, line_no, line)


redis_server = None
def get_redis_server():
	"""Returns memcache connection."""
	global redis_server
	if not redis_server:
		from redis import Redis
		redis_server = Redis.from_url(conf.get("cache_redis_server") or "redis://localhost:12311")
	return redis_server
