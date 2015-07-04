# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals


import frappe
import os
from functools import wraps
from app import socketio
from frappe.websocket import emit_via_redis
END_LINE = '<!-- frappe: end-file -->'

def handler(f):
	cmd = f.__module__ + '.' + f.__name__

	def _run(args):
		from frappe.tasks import run_async_task
		args = frappe._dict(args)
		task = run_async_task.delay(frappe.local.site,
			(frappe.session and frappe.session.user) or 'Administrator', cmd, args)
		frappe.local.response['task_id'] = task.id
		return task.id

	@wraps(f)
	def _f(*args, **kwargs):
		from frappe.tasks import run_async_task
		task = run_async_task.delay(frappe.local.site,
			(frappe.session and frappe.session.user) or 'Administrator', cmd,
				frappe.local.form_dict)
		frappe.local.response['task_id'] = task.id
		return {
			"status": "queued",
			"task_id": task.id
		}
	_f.async = True
	_f._f = f
	_f.run = _run
	frappe.whitelisted.append(f)
	frappe.whitelisted.append(_f)
	return _f


def run_async_task(method, args, reference_doctype=None, reference_name=None):
	if frappe.local.request and frappe.local.request.method == "GET":
		frappe.throw("Cannot run task in a GET request")
	task_id = method.run(args)
	task = frappe.new_doc("Async Task")
	task.celery_task_id = task_id
	task.status = "Queued"
	task.reference_doctype = reference_doctype
	task.reference_name = reference_name
	task.save()
	return task_id


@frappe.whitelist()
def get_pending_tasks_for_doc(doctype, docname):
	return frappe.db.sql_list("select name from `tabAsync Task` where status in ('Queued', 'Running')")


def push_log(ns, task_id, log_path):
	import redis

	def emit(lines):
		ns.emit('task_progress', {"task_id": task_id, "response": {"lines": lines }})

	if os.path.exists(log_path):
		with open(log_path) as f:
			lines = f.readlines()
			emit(lines)

		if lines[-1] == END_LINE:
			return

	r = redis.Redis(port=11311)
	pubsub = r.pubsub()
	pubsub.subscribe('task:' + task_id)
	for line in pubsub.listen():
		if line == END_LINE:
			break
		emit([line])


@handler
def ping():
	from time import sleep
	sleep(2)
	return "pong"


@frappe.whitelist()
def get_task_status(task_id):
	from frappe.celery_app import get_celery
	c = get_celery()
	a = c.AsyncResult(task_id)
	frappe.local.response['response'] = a.result
	return {
		"state": a.state,
		"progress": 0
	}


def set_task_status(task_id, status, response=None):
	frappe.db.set_value("Async Task", task_id, "status", status)
	out = {"status": status, "response": response, "task_id": task_id}
	emit_via_redis("task_status_change", out, room="task:" + task_id)
