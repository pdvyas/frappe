frappe.socket = {
  open_tasks: {},
  init: function() {
    frappe.socket.socket = io.connect('http://' + document.domain + ':' + location.port);
    frappe.socket.socket.on('msgprint', function(message) {
      frappe.msgprint(message)
    });

    frappe.socket.setup_listeners();
    frappe.socket.setup_reconnect();
  },
  subscribe: function(task_id, opts) {
    socket.emit('task_subscribe', task_id);
    socket.emit('progress_subscribe', task_id);

    frappe.socket.open_tasks[task_id] = opts;
  },
  setup_listeners: function() {
    socket.on('task_status_change', function(data) {
      if(data.status==="Running") {
        frappe.socket.process_response(data, "running");
      } else {
        // failed or finished
        frappe.socket.process_response(data, "callback");
        delete frappe.socket.open_tasks[data.response.task_id];
      }
    });
    socket.on('task_progress', function(data) {
      frappe.socket.process_response(data, "progress");
    });

  },
  setup_reconnect: function() {
    // subscribe again to open_tasks
    frappe.socket.socket.on("connect", function() {
      $.each(frappe.socket.open_tasks, function(task_id, opts) {
        frappe.socket.subscribe(task_id, opts);
      });
    });
  },
  process_response: function(data, method) {
    if(!data) {
      return;
    }
    if(data) {
      var opts = frappe.socket.open_tasks[data.task_id];
      if(opts[method]) opts[method](data.response);
    }
    if(opts.always) {
      opts.always(data.response);
    }
    if(data.response && data.response.status_code > 400 && opts.error) {
      opts.error(data.response);
      return;
    }

  }
}

$(frappe.socket.init);
