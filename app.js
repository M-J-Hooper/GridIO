var express = require('express');
var app = express();
var serv = require('http').Server(app);

require('./client/helper.js')();
require('./client/classes.js')();

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 1337);
console.log("Server started.");

var socketList = {};
var gameList = {};

//game settings
var slide = 5;
var w = 12;
var h = w;
var playerLimit = 3;

joinGame = function(socket,name,color) {
	var player = new Player({new:{id:socket.id, name:name, color:color}});

	var newGame = true;
	var game;
	for(var v in gameList) {
		var playerCount = Object.keys(gameList[v].game.playerList).length;
		if(playerCount < playerLimit) { game = gameList[v].game; newGame = false; break; }
	}
	if(newGame) {
		game = new Game({new:{w:w,h:h,slide:slide}});
		gameList[game.id] = {game:game,initPack:{players:[],pieces:[]},removePack:{players:[],pieces:[]},updatePack:{players:[],pieces:[]}};
	}

	gameList[game.id].initPack.players.push(player);

	var pieces = gameList[game.id].game.addPlayer(player);
	for(var n = 0; n < pieces.length; n++) { gameList[game.id].initPack.pieces.push(pieces[n]); }

	socketList[socket.id].gameId = game.id;
	console.log(socket.id+" connected.")

	socket.on('keyPress',function(data){
		if(socket.id == gameList[game.id].game.board[data.selected.i][data.selected.j].id) {
			var pack;
			var dx = 0;
			var dy = 0;
			if(data.inputId == 'left'){ dx = -1; }
			else if(data.inputId == 'right'){ dx = 1; }
			else if(data.inputId == 'up'){ dy = -1; }
			else if(data.inputId == 'down'){ dy = 1; }

			pack = gameList[game.id].game.makeMove(data.selected.i,data.selected.j,dx,dy);
			for(var n = 0; n < pack.players.length; n++) { gameList[game.id].updatePack.players.push(pack.players[n]); }
			//get update pack method here???
			for(var n = 0; n < pack.pieces.length; n++) { gameList[game.id].updatePack.pieces.push(pack.pieces[n]); }
		}
	});

	//get all info on connect
	socket.emit('init',{
		selfId:socket.id,
		game:game,
		players:[],
		pieces:[]
	});
}

leaveGame = function(socket){
	var gameId = socketList[socket.id].gameId;

	var playerCount = Object.keys(gameList[gameId].game.playerList).length;
	if(playerCount == 0) { delete gameList[gameId]; }
	else {
		gameList[gameId].removePack.players.push(socket.id);

		var pieces = gameList[gameId].game.removePlayer(socket.id);
		for(var n = 0; n < pieces.length; n++) { gameList[gameId].removePack.pieces.push(pieces[n]); }
	}

	socketList[socket.id].gameId = null;
	console.log(socket.id+" disconnected.")
}


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	socketList[socket.id] = {socket:socket,gameId:null};

	socket.on('join', function(data) {
		joinGame(socket,data.name,data.color);
	});

	socket.on('disconnect',function() {
		leaveGame(socket);
		delete socketList[socket.id];
	});
});

setInterval(function(){
	//if(!game) return;
	for(var v in socketList){
		var socket = socketList[v].socket;
		if(socketList[v].gameId) {
			var game = gameList[socketList[v].gameId];
			socket.emit('init',game.initPack);
			socket.emit('update',game.updatePack);
			socket.emit('remove',game.removePack);
		}
	}
	for(var v in gameList) {
		gameList[v].game = boardSlide(gameList[v].game);

		gameList[v].initPack = {players:[],pieces:[]};
		gameList[v].removePack = {players:[],pieces:[]};
		gameList[v].updatePack = {players:[],pieces:[]};
	}
},40);

/*
var profiler = require('v8-profiler');
var fs = require('fs');
var startProfiling = function(duration){
	profiler.startProfiling('1', true);
	setTimeout(function(){
		var profile1 = profiler.stopProfiling('1');

		profile1.export(function(error, result) {
			fs.writeFile('./profile.cpuprofile', result);
			profile1.delete();
			console.log("Profile saved.");
		});
	},duration);
}
startProfiling(10000);
*/
