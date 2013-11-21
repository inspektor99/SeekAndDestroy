(function() {
    if (!window.console) {
        alert('your browser sucks and cannot run this site');
    }
    if (!window.WebSocket) {
        alert('again, your browser sucks and cannot run this awesome site.  we will now spam your browser with errors. prepare to die.');
    }
})();

//Seek and Destroy object
var Sad = {
    TARGET_COUNT: 4,
    //in 10 milliseconds.  2 mins
    TIME_WARNING: 6000,
    TIME_DANGER: 9000,
    TIME_LIMIT: 12000,
    currentTeam: null,
    teams: []
};

var SockServer = Backbone.Model.extend({
    defaults: {
        ip: '10.0.0.3',
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
var ClassServer = new SockServer();
var RPiServer = new SockServer();

$(function() {
    RPiServer.set({
        ip: '10.0.0.3',
        port: '4500',
        statusButton: $('#statusPi'),
        uri: 'ws'
    });
    RPiServer.init();

    $('#statusLaptop').tooltip({
        placement: 'bottom'
    });
    $('#statusPi').tooltip({
        placement: 'bottom'
    });
    $('#statusLaptop').on('click', function(e) {
        ClassServer.init();

        return false;
    });
    $('#statusPi').on('click', function(e) {
        RPiServer.init();

        return false;
    });
    $('#viewStats').on('click', function() {
        //socket.send('test');
        $('#statswindow').modal();
        var statsTable = $('#statsTable');
        if (Sad.teams.length === 0) {
            statsTable.hide();
        } else {
            statsTable.show();
            Sad.loadStats(statsTable);
        }

        return false;
    });

    $('#setup').on('click', function() {
        //socket.send('test');
        $('#setupwindow').modal();

        var setupCallback = function(games) {
            console.log(games);
        };
        RPiServer.send({
            getgames: null
        }, setupCallback);
    });

    //TODO: wait till pi says it's ready
    $('#begin').on('click', function() {

        var beginCallback = function(targets) {

            $('#timer').removeClass('text-warning');
            $('#timer').removeClass('text-error');
            $('#timer').addClass('text-info');

            var team = new Sad.Team();
            team.set('name', $('#inputTeamname').val());
            team.set('ip', $('#inputTeamIP').val());

            Sad.addTeam(team);
            team = Sad.setCurrentTeam(team.get('name'));

            team.addNewGame($('#inputGamecode').val(), targets);

            $('#currteam').text(Sad.currentTeam.get('name'));


            var currentGame = Sad.currentTeam.getCurrentGame();

            currentGame.set('notes', $('#inputGamenotesStart').val());

            Sad.updateTargets(targets);

            currentGame.set('start', new Date().getTime());
            ClassServer.set({
                ip: team.get('ip'),
                port: '4500',
                statusButton: $('#statusLaptop'),
                uri: ''
            });
            ClassServer.init(function() {
                $('#setupwindow').modal('hide');
                $('#welcome').hide();
                $('#scoreboard').slideDown('slow');

                //send message and start timer signaling game start
                ClassServer.send(Sad.currentTeam);
                Sad.Timer.start();
                $('#music')[0].volume = 0.5;
                $('#music')[0].play();
            });
        };

        RPiServer.send({
            startgame: $('#inputGamecode').val()
        }, beginCallback);

        return false;
    });

    $('#manualdone').on('click', function() {
        var currentGame = Sad.currentTeam.getCurrentGame();
        $('#finalscorewindow').modal();
        Sad.Timer.stop();
        currentGame.set('end', new Date().getTime());
        $('#music')[0].pause();

        $('#music')[0].currentTime = 0;

        currentGame.set('endDisplay', $('#timer').text());

        $('#resultTeamName').html(Sad.currentTeam.get('name'));

        $('#inputTime').val(currentGame.get('endDisplay'));
        $('#inputFinalscore').val(currentGame.get('score'));
        $('#inputGamenotesEnd').val(currentGame.get('notes'));

        $('#t1_type, #t2_type, #t3_type, #t4_type').removeClass();
        $('#t1_type, #t2_type, #t3_type, #t4_type').addClass('muted');
        _.each(currentGame.get('targets'), function(target) {
            $('#t' + target.get('id') + '_hit').val(target.get('hit'));
            var targetTypeElem = $('#t' + target.get('id') + '_type');
            targetTypeElem.removeClass();

            var status = target.get('status');

            if (status === 1) {
                targetTypeElem.addClass('text-success');
            } else if (status === 0) {
                targetTypeElem.addClass('text-error');
            } else if (status === 2) {
                targetTypeElem.addClass('muted');
            }
        });

        return false;
    });

    $('#finish').on('click', function() {
        Sad.Timer.reset();
        $('#scoreboard').hide();
        $('#welcome').slideDown('slow');
        $('#finalscorewindow').modal('hide');

        var currentGame = Sad.currentTeam.getCurrentGame();
        _.each(currentGame.get('targets'), function(target) {
            var adjustedHits = $('#t' + target.get('id') + '_hit').val();
            target.set('hit', parseInt(adjustedHits));
        });

        var adjustedScore = $('#inputFinalscore').val();
        currentGame.set('score', parseInt(adjustedScore));

        currentGame.set('notes', $('#inputGamenotesEnd').val());

        //ClassServer.send(Sad.currentTeam);

        return false;
    });
});

Sad.playBomb = function() {
    $('#bomb')[0].volume = 1;
    $('#bomb')[0].pause();
    $('#bomb')[0].currentTime = 0;
    $('#bomb')[0].play();
};
Sad.loadStats = function(statTable) {
    var i = 0,
        len = this.teams.length;
    $('tbody', statTable).html('');
    for (i = 0; i < len; i++) {
        var teamJson = this.teams[i].toJSON();
        $('tbody', statTable).append('<tr><td></td><td>' + teamJson.name + '</td><td>' + teamJson.games.length + '</td><td></td></tr>');
    }
};
Sad.updateTargets = function(targets) {
    var currentGame = Sad.currentTeam.getCurrentGame();
    currentGame.setTargets(targets);

    ClassServer.send(Sad.currentTeam);

    //update UI. 
    //TODO: make Views and put this in them
    $('#t1_counter, #t2_counter, #t3_counter, #t4_counter').removeClass();
    $('#t1_counter, #t2_counter, #t3_counter, #t4_counter').addClass('badge');
    $('#t1_counter>span, #t2_counter>span, #t3_counter>span, #t4_counter>span').text('X');
    _.each(currentGame.get('targets'), function(target) {
        var counter = $('#t' + target.get('id') + '_counter');

        $('span', counter).text(target.get('hit'));

        var status = target.get('status');

        counter.removeClass();
        if (status === 1) {
            counter.addClass('badge badge-success');
        } else if (status === 0) {
            counter.addClass('badge badge-important');
        } else if (status === 2) {
            counter.addClass('badge');
        }
    });
};
Sad.Target = Backbone.Model.extend({
    defaults: {
        id: 0,
        status: 2,
        hit: 0
    }
});
Sad.addTeam = function(team) {
    var added = true;
    _.each(this.teams, function(teamIt) {
        if (teamIt.get('name').toLowerCase() === team.get('name').toLowerCase()) {
            added = false;
        }
    });

    if (added) {
        team.set('games', []);
        this.teams.push(team);
    }
    return added;
};
Sad.setCurrentTeam = function(name) {
    var setTeam = null;
    _.each(this.teams, function(team) {
        if (team.get('name').toLowerCase() === name.toLowerCase()) {
            Sad.currentTeam = team;
            setTeam = team;
        }
    });

    return setTeam;
};
Sad.Team = Backbone.Model.extend({
    defaults: {
        name: null,
        ip: null,
        score: 0,
        games: []
    },
    addNewGame: function(code, targets) {
        var game = new Sad.Game();

        game.set('code', code);
        game.setTargets(targets);

        this.get('games').push(game);

        return game;
    },
    getCurrentGame: function() {
        return this.get('games')[this.get('games').length - 1];
    }
});
Sad.Game = Backbone.Model.extend({
    defaults: {
        code: null,
        start: 0,
        end: 0,
        endDisplay: '0:00:00',
        targets: null,
        score: 0,
        notes: null
    },
    setTargets: function(targets) {
        this.set('targets', []);
        var i = 0;
        for (i = 0; i < targets.length; i++) {
            var target = new Sad.Target();
            target.set(targets[i]);
            this.get('targets').push(target);
        }
    }
});
Sad.Timer = {
    DEFAULT_DISPLAY: '0:00:000',
    id: null,
    tick: 0,
    elem: $('#timer')[0],
    isRunning: function() {
        return this.id !== null;
    },
    start: function() {
        //this.reset();
        this.id = window.setInterval(this.setTick, 10);
    },
    setTick: function() {
        Sad.Timer.tick++;

        var milli = Sad.Timer.tick % 100;
        var seconds = Math.floor(Sad.Timer.tick / 100);
        var minutes = Math.floor(seconds / 60);

        seconds %= 60;

        if (milli < 10) {
            milli = '0' + milli.toString();
        }
        if (seconds < 10) {
            seconds = '0' + seconds.toString();
        }
        Sad.Timer.elem.innerHTML = minutes + ':' + seconds + ':' + milli;
        if (Sad.Timer.tick === Sad.TIME_WARNING) {
            $('#timer').removeClass('text-info');
            $('#timer').addClass('text-warning');
        }
        if (Sad.Timer.tick === Sad.TIME_DANGER) {
            $('#timer').removeClass('text-warning');
            $('#timer').addClass('text-error');
        }
        if (Sad.Timer.tick === Sad.TIME_LIMIT) {
            Sad.Timer.stop();
        }
    },
    stop: function() {
        if (Sad.Timer.id !== null) {
            window.clearInterval(Sad.Timer.id);
            Sad.Timer.id = null;
        }
    },
    reset: function() {
        Sad.Timer.stop();
        Sad.Timer.tick = 0;
        Sad.Timer.elem.innerHTML = Sad.Timer.DEFAULT_DISPLAY;
    },
    getTick: function() {
        return this.tick;
    }
};