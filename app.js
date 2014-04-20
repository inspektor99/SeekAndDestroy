var util = require('util');

var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(express.favicon(path.join(__dirname, 'public/images/favicon/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});

//Socket.IO
var io = require('socket.io').listen(server);

var controllerSocket = null;
io.sockets.on('connection', function (socket) {
	console.log('connected to webserver socket.io');
	controllerSocket = socket;
});



//WebSockets
var WebSocket = require('ws');
var ws = {};


var mainResp = {};
var respArgs = {};

var setRpiCommunication = function() {
	ws.on('open', function() {
	    console.log('connected to rPI');
	    controllerSocket.emit('connectedrpi', {});
	});

	ws.on('message', function(message) {
		console.log('message from PI');
		console.log(message);

		message = JSON.parse(message);

		if (respArgs.startgame){
			respArgs.targets = message;
			controllerSocket.emit('startgame', respArgs);
		}
		else if (respArgs.stopgame) {
			controllerSocket.emit('stopgame', respArgs);
		}
		else if (respArgs.reset) {
			controllerSocket.emit('reset', respArgs);
		}
		else if (util.isArray(message)) {
			//assume if response array and no args rpi is brodcasting target hits
			respArgs.targets = message;
			controllerSocket.emit('targethit', respArgs);
		}

		respArgs = {};

		try {
	    	mainResp.send(message);
		}
		catch (ex) {
			console.log('Could not send to response');
		}
	});

	ws.on('close', function() {
	    console.log('disconnected');
	    controllerSocket.emit('connecterror', {});
	});

	ws.on('error', function(message) {
		console.log('error from game server');
		console.log(message);
		controllerSocket.emit('connecterror', {});
	});
};



//Routs
app.get('/connect', function(req, res) {
	ws = new WebSocket('ws://' + req.query.ip + ':4500/ws');
	setRpiCommunication();

	res.send(req.query);
});

app.get('/reset', function(req, res) {
	mainResp = res;

	respArgs = req.body;
	respArgs.reset = true;

	controllerSocket.emit('reset');

	var socketMsg = {stopgame: 'STOP'};
	ws.send(JSON.stringify(socketMsg), {});
});

app.post('/start', function(req, res) {
	mainResp = res;
	respArgs = req.body;
	respArgs.startgame = true;
	console.log(req.body);

	//TODO: do something clever with req.body.teamname
	var socketMsg = {startgame: req.body.gamename};
	ws.send(JSON.stringify(socketMsg), {});

	//TODO: send client game and team name to keep track of points
});

app.post('/stop', function(req, res) {
	mainResp = res;

	respArgs = req.body;
	respArgs.stopgame = true;
	
	console.log(req.body);
	var socketMsg = {stopgame: 'STOP'};
	ws.send(JSON.stringify(socketMsg), {});
});

app.get('/games', function(req, res) {
	mainResp = res;

	console.log(req.body);
	var socketMsg = {getgames: 'ALL'};
	ws.send(JSON.stringify(socketMsg), {});
});

app.get('/targets/:gamename', function(req, res) {
	mainResp = res;

	console.log('get targets');
	console.log(req.params);
	//TODO: do something clever with req.body.teamname
	var socketMsg = {gettargets: req.param('gamename')};
	ws.send(JSON.stringify(socketMsg), {});
});

