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
		console.log("Game "+game.id+" created");
	}

	gameList[game.id].initPack.players.push(player);

	var pieces = gameList[game.id].game.addPlayer(player);
	for(var n = 0; n < pieces.length; n++) { gameList[game.id].initPack.pieces.push(pieces[n]); }

	socketList[socket.id].gameId = game.id;

	socket.on('keyPress',function(data){
		if(socket.id == gameList[socketList[socket.id].gameId].game.board[data.selected.i][data.selected.j].id) {
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

	console.log("Player "+socket.id+" joined Game "+game.id);
	var playerCount = Object.keys(game.playerList).length;
	console.log("Game "+game.id+" has "+playerCount+"/"+playerLimit+" players");
}

leaveGame = function(socket){
	var gameId = socketList[socket.id].gameId;

	if(gameList[gameId]) { //if statement for nodemon restart problems
		socketList[socket.id].gameId = null;
		console.log("Player "+socket.id+" left Game "+gameId);

		var pieces = gameList[gameId].game.removePlayer(socket.id);
		var playerCount = Object.keys(gameList[gameId].game.playerList).length;
		console.log("Game "+gameId+" has "+playerCount+"/"+playerLimit+" players");
		if(playerCount == 0) {
			delete gameList[gameId];
			console.log("Game "+gameId+" deleted");
		}
		else {
			gameList[gameId].removePack.players.push(socket.id);
			for(var n = 0; n < pieces.length; n++) { gameList[gameId].removePack.pieces.push(pieces[n]); }
		}
	}
}


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	socketList[socket.id] = {socket:socket,gameId:null};
	console.log("Player "+socket.id+" connected");

	socket.on('join', function(data) {
		joinGame(socket,data.name,data.color);
	});

	socket.on('disconnect',function() {
		leaveGame(socket);
		delete socketList[socket.id];
		console.log("Player "+socket.id+" disconnected")
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

		//faster safer way of forcing zero scores to leave?
		for(var w in gameList[v].game.playerList) {
			if(gameList[v].game.playerList[w].score == 0) {
				leaveGame(socketList[gameList[v].game.playerList[w].id].socket);
			}
		}
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
