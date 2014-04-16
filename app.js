var express = require('express');
var http = require('http');
var path = require('path');

var WebSocket = require('ws')
  , ws = new WebSocket('ws://10.0.0.9:4500/ws');

ws.on('open', function() {
    console.log('open');
});

var mainResp = {};
ws.on('message', function(message) {
	console.log('message from PI');
	console.log(message);
    mainResp.send(message);
});


var app = express();

app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
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

app.get('/reset', function(req, res) {
	mainResp = res;

	console.log(req.body);
	var socketMsg = {stopgame: 'STOP'};
	ws.send(JSON.stringify(socketMsg), {});
});

app.post('/start', function(req, res) {
	mainResp = res;
	
	console.log(req.body);

	//TODO: do something clever with req.body.teamname
	var socketMsg = {startgame: req.body.gamename};
	ws.send(JSON.stringify(socketMsg), {});

	//TODO: send client game and team name to keep track of points
});

app.post('/stop', function(req, res) {
	mainResp = res;
	
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

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});var io = require('socket.io').listen(80);