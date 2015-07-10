var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var redis = require("redis")
var subscriber = redis.createClient(12311);
var r = redis.createClient(12311);

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection', function(socket){
	socket.on('task_subscribe', function(task_id) {
		var room = 'task:' + task_id;
		socket.join(room);
	})
	socket.on('progress_subscribe', function(task_id) {
		var room = 'task_progress:' + task_id;
		socket.join(room);
		send_existing_lines(task_id, socket);
	})
});

function send_existing_lines(task_id, socket) {
	r.hgetall('task_log:' + task_id, function(err, lines) {
		socket.emit('task_progress', {
			"task_id": task_id,
			"message": {
				"lines": lines
			}
		})
	})
}

 
subscriber.on("message", function(channel, message) {
	message = JSON.parse(message);
	io.to(message.room).emit(message.event, message.message);
});

subscriber.subscribe("events");
 
http.listen(3000, function(){
  console.log('listening on *:3000');
});
