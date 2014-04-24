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
    teams: null
};

$(function() {
    Sad.teams = new Sad.Teams();
    var serverSocket = io.connect('http://localhost:3000');

    $('#statusGameServer').tooltip({
        placement: 'bottom'
    });

    $('#resetAll').tooltip({
        placement: 'bottom'
    });

    var connectToPi = function() {
        $.get('/connect?ip=' + $('#raspPiAddress').val());
    };

    $('#resetAll').on('click', function(e) {
        $.get('/reset');

        return false;
    });


    $('#statusGameServer').on('click', function(e) {
        connectToPi();
        return false;
    });

    $('#generalSetup').on('click', function() {
        //socket.send('test');
        $('#generalSetupWindow').modal();

        return false;
    });

    $('#piConnect').on('click', function() {
        //socket.send('test');
        $('#generalSetupWindow').modal('hide');

        connectToPi();

        return false;
    });

    serverSocket.on('connectedrpi', function() {
        $('#statusGameServer').removeClass('btn-default btn-success btn-danger btn-warning')
        .addClass('btn-success');
    });

    serverSocket.on('connecterror', function() {
        $('#statusGameServer').removeClass('btn-default btn-success btn-danger btn-warning')
        .addClass('btn-danger');

        onFinish();
    });

    serverSocket.on('startgame', function(data){
        $('#timer').removeClass('text-warning');
        $('#timer').removeClass('text-error');
        $('#timer').addClass('text-info');

        var team = new Sad.Team();
        team.set('name', data.teamname);
        //team.set('ip', data.ip);

        Sad.addTeam(team);
        //team = Sad.setCurrentTeam(team.get('name'));
        team = Sad.setCurrentTeam(data.teamname);

        team.addNewGame(data.gamename, data.targets);

        $('#currteam').text(Sad.currentTeam.get('name'));
        $('#currgame').text(data.gamename);


        var currentGame = Sad.currentTeam.getCurrentGame();

        //currentGame.set('notes', $('#inputGamenotesStart').val());

        Sad.updateTargets(data.targets);

        currentGame.set('start', new Date().getTime());

        //$('#setupwindow').modal('hide');
        $('#welcome').hide();
        $('#scoreboard').slideDown('slow');

        //send message and start timer signaling game start
        //SelfServer.send(Sad.currentTeam);
        Sad.Timer.start();
        $('#music')[0].volume = 0.2;
        $('#music')[0].play();

        return false;
    });

    serverSocket.on('targethit', function(data){
        if ($('#scoreboard').is(':visible')) {
            Sad.playBomb();
    
            Sad.updateTargets(data.targets);
    
            var currentGame = Sad.currentTeam.getCurrentGame();
            $('#t1_type, #t2_type, #t3_type, #t4_type').removeClass();
            $('#t1_type, #t2_type, #t3_type, #t4_type').addClass('muted');
            var score = 0;
            currentGame.get('targets').each(function(target) {
                score += (parseFloat(target.get('points')) * parseInt(target.get('hit')));

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
    
                //TODO: update score
            });

            $('#teamScore').text(score);
        }
    });

    serverSocket.on('stopgame', function(data){
        var currentGame = Sad.currentTeam.getCurrentGame();
        if (currentGame !== null) {
            currentGame.set('score', parseInt($('#teamScore').text()));
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
        }

        return false;
    });

    var onFinish = function() {
        $('#music')[0].pause();
        $('#music')[0].currentTime = 0;

        Sad.Timer.reset();

        $('#scoreboard').hide();
        $('#welcome').slideDown('slow');
        $('#finalscorewindow').modal('hide');
        $('#teamScore').html('0');

        if (Sad.currentTeam !== null) {
            var currentGame = Sad.currentTeam.getCurrentGame();
            currentGame.get('targets').each(function(target) {
                $('#t' + target.get('id') + '_hit').val('0');
                var targetTypeElem = $('#t' + target.get('id') + '_type');
                targetTypeElem.removeClass();
                targetTypeElem.addClass('muted');
            });
        }

        if (Sad.teams.length > 0) {

            var scoreboard = Sad.teams.sortBy(function(team) {
                return (team.getBestGame().get('score') * -1);
            });

            $('#welcome table').remove();
            var table = $('<table class="table table-striped"><thead><th><h3>Team</h3></th><th><h3>Score</h3></th></thead><tbody></tbody></table>');
            $('#welcome').append(table);
            _.each(scoreboard, function(team) {
                var bestGame = team.getBestGame();
                table.find('tbody').append('<tr><td><h4>' + team.get('name') + '</h4></td><td><h4>' + bestGame.get('score') + '</h4></td></tr>');

            });
        }
    };

    serverSocket.on('reset', function(data){
        onFinish();
    });

    $('#finish').on('click', function() {
        var currentGame = Sad.currentTeam.getCurrentGame();
        currentGame.get('targets').each(function(target) {
            var adjustedHits = $('#t' + target.get('id') + '_hit').val();
            target.set('hit', parseInt(adjustedHits));
        });

        var adjustedScore = $('#inputFinalscore').val();
        currentGame.set('score', parseInt(adjustedScore));

        currentGame.set('notes', $('#inputGamenotesEnd').val());

        onFinish();

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

    //update UI. 
    //TODO: make Views and put this in them
    $('#t1_counter, #t2_counter, #t3_counter, #t4_counter').removeClass();
    $('#t1_counter, #t2_counter, #t3_counter, #t4_counter').addClass('badge');
    $('#t1_counter>span, #t2_counter>span, #t3_counter>span, #t4_counter>span').text('X');
    currentGame.get('targets').each(function(target) {
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
    },
    initialize: function() {
    }
});

Sad.Targets = Backbone.Collection.extend({
    model: Sad.Target
});

Sad.addTeam = function(team) {
    var added = true;
    this.teams.each(function(teamIt) {
        if (teamIt.get('name').toLowerCase() === team.get('name').toLowerCase()) {
            added = false;
        }
    });

    if (added) {
        team.get('games').reset();
        this.teams.add(team);
    }
    return added;
};
Sad.setCurrentTeam = function(name) {
    var setTeam = null;
    this.teams.each(function(team) {
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
        games: null
    },
    initialize: function() {
        this.set('games', new Sad.Games());
    },
    addNewGame: function(code, targets) {
        var game = new Sad.Game();

        game.set('code', code);
        game.setTargets(targets);

        this.get('games').add(game);

        return game;
    },
    getCurrentGame: function() {
        return this.get('games').at(this.get('games').length - 1);
    },
    getBestGame: function() {
        return this.get('games').max(function(game) {
            return game.get('score');
        });
    }
});
Sad.Teams = Backbone.Collection.extend({
    model: Sad.Team
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
    initialize: function () {
        this.set('targets', new Sad.Targets());
    },
    setTargets: function(targets) {
        this.get('targets').reset(targets);
    }
});
Sad.Games = Backbone.Collection.extend({
    model: Sad.Game
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
            $('#timer').addClass('text-danger');
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