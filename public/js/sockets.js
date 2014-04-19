var SockServer = Backbone.Model.extend({
    defaults: {
        ip: '10.0.0.10',
        port: '4500',
        socket: null,
        connected: false,
        statusButton: null,
        respCallback: null,
        uri: ''
    },
    init: function(connectCallback) {
        if (!this.get('statusButton')) {
            console.log('no button to update so assuming no connection');
            return;
        }
        this.get('statusButton').removeClass();
        this.get('statusButton').addClass('btn btn-warning');

        var socket = new WebSocket('ws://' + this.get('ip') + ':' + this.get('port') + '/' + this.get('uri'));
        console.log('connecting to :' + 'ws://' + this.get('ip') + ':' + this.get('port') + '/' + this.get('uri'));

        var self = this;
        //gotta do ws events inline to ensure backbone model scope
        socket.onopen = function() {
            self.get('statusButton').removeClass();
            self.get('statusButton').addClass('btn btn-success');
            console.log('connected to ' + self.get('ip') + ':' + self.get('port'));
            self.set('connected', true);

            if (connectCallback) {
                connectCallback();
            }
        };
        socket.onmessage = function(msg) {
            console.log(self.get('ip') + ' message ' + msg.data);
            var jsonResp = JSON.parse(msg.data);

            //if the game is running, only message that comes across is target hit.
            if (Sad.Timer.isRunning()) {
                Sad.playBomb();
                Sad.updateTargets(jsonResp);
            }
            if (self.get('respCallback')) {
                self.get('respCallback')(jsonResp);
                self.set('respCallback', null);
            }
        };
        socket.onclose = function() {
            self.get('statusButton').removeClass();
            self.get('statusButton').addClass('btn btn-danger');
            console.log(self.get('ip') + ' socket closed.');
            self.set('connected', false);
            //this.init();
        };
        socket.onerror = function(err) {
            console.log(self.get('ip') + ' there was an error');
            console.log(err);
        };

        this.set('socket', socket);
    },
    send: function(model, respCallback) {
        if (this.get('connected')) {
            this.set('respCallback', respCallback);

            var jsonToSend = JSON.stringify(model);
            console.log(this.get('ip') + ' sending message\n' + jsonToSend);
            this.get('socket').send(jsonToSend);
        } else {
            console.log(this.get('ip') + ' not connected so no message sent');
        }
    }
});
var SelfServer = new SockServer();
var RPiServer = new SockServer();

$(function() {
    RPiServer.set({
        ip: '10.0.0.10',
        port: '4500',
        statusButton: $('#statusPi'),
        uri: 'ws'
    });
    //RPiServer.init();
});