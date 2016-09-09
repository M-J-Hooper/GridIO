var express = require('express');
var app = express();
var serv = require('http').Server(app);

require('./client/lib/randomColor.js')(); //use npm???
require('./client/lib/chance.js')();
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
var w = 20;
var h = w;
var playerLimit = Math.floor(w*h/80);
var spawn = true;

joinGame = function(socket,data) {
	//before adding to a game or creating one, check that the id is not already playing!!!
	for(var n in gameList) {
		for(var m in gameList[n].game.playerList) {
			if(gameList[n].game.playerList[m].id == socket.id) { return; }
		}
	}

	var player = new Player({new:{id:socket.id, name:data.name, color:data.color}});
	var newGame = true;
	var game;

	//join specific game from browser
	if(data.gameId != 1) {
		if(data.gameId) {
			var playerCount = Object.keys(gameList[data.gameId].game.playerList).length;
			if(data.gamId != 1 && playerCount < playerLimit) { game = gameList[data.gameId].game; newGame = false; }
		} else { //check for space in current games
			for(var v in gameList) {
				var playerCount = Object.keys(gameList[v].game.playerList).length;
				if(playerCount < playerLimit) { game = gameList[v].game; newGame = false; break; }
			}
		}
	}

	//if no room or if gameId was 1 create new game
	if(newGame) {
		var color = "green";//randomColor({luminosity:"dark",format:"rgb"});
		game = new Game({new:{color:color,w:w,h:h,slide:slide,playerLimit:playerLimit,spawn:spawn}});
		gameList[game.id] = {game:game,initPack:{players:[],pieces:[]},removePack:{players:[],pieces:[]},updatePack:{players:[],pieces:[]}};
		console.log("Game "+game.id+" created");
	}


	gameList[game.id].initPack.players.push(player);

	//add player to board
	var pieces = gameList[game.id].game.addPlayer(player);
	for(var n = 0; n < pieces.length; n++) { gameList[game.id].initPack.pieces.push(pieces[n]); }

	socketList[socket.id].gameId = game.id;

	//add move listener to socket of new joined player
	socket.on('move',function(data){
		var gameId = socketList[socket.id].gameId;
		if(socket.id == gameList[gameId].game.board[data.i][data.j].id) {
			var pack = gameList[gameId].game.makeMove(data.i,data.j,data.dx,data.dy);
			for(var n = 0; n < pack.players.length; n++) { gameList[gameId].updatePack.players.push(pack.players[n]); }
			for(var n = 0; n < pack.pieces.length; n++) { gameList[gameId].updatePack.pieces.push(pack.pieces[n]); }
		}
	});

	//give all info on connect
	socket.emit('init',{
		selfId:socket.id,
		game:game,
		players:[],
		pieces:[]
	});

	console.log("Player "+socket.id+" joined Game "+game.id);
	var playerCount = Object.keys(game.playerList).length;
	console.log("Game "+game.id+" has "+playerCount+"/"+game.playerLimit+" players");
}

leaveGame = function(socket){
	var gameId = socketList[socket.id].gameId;

	if(gameList[gameId]) { //if statement for nodemon restart problems
		socketList[socket.id].gameId = null;
		console.log("Player "+socket.id+" left Game "+gameId);

		//remove player from board
		var pieces = gameList[gameId].game.removePlayer(socket.id);
		var playerCount = Object.keys(gameList[gameId].game.playerList).length;
		console.log("Game "+gameId+" has "+playerCount+"/"+gameList[gameId].game.playerLimit+" players");

		//delete game if last player
		if(playerCount == 0) {
			delete gameList[gameId];
			console.log("Game "+gameId+" deleted");
		} else { //otherwise let other players in game know
			gameList[gameId].removePack.players.push(socket.id);
			for(var n = 0; n < pieces.length; n++) { gameList[gameId].removePack.pieces.push(pieces[n]); }
		}
	}
}


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	socketList[socket.id] = {socket:socket,gameId:null}; //connected but not joined
	console.log("Player "+socket.id+" connected");

	//join specific game
	socket.on('join', function(data) {
		joinGame(socket,data);
	});

	//get gameList for game browser
	socket.on('browse', function(data, callback) {
		callback(gameList);
	});

	socket.on('disconnect',function() {
		leaveGame(socket);
		delete socketList[socket.id];
		console.log("Player "+socket.id+" disconnected")
	});
});

setInterval(function(){
	//if(!game) return;

	//spawn pieces for games with spawning on
	for(var v in gameList) {
		if(gameList[v].game.spawn) {
			var pieces = gameList[v].game.pieceSpawn();
			for(var n = 0; n < pieces.length; n++) { gameList[v].updatePack.pieces.push(pieces[n]); }
		}
	}

	//send pack for game to corresponding joined players
	for(var v in socketList){
		var socket = socketList[v].socket;

		if(socketList[v].gameId) {
			var game = gameList[socketList[v].gameId];
			socket.emit('init',game.initPack);
			socket.emit('update',game.updatePack);
			socket.emit('remove',game.removePack);
		}
	}

	//slide and return packs to empty
	for(var v in gameList) {
		gameList[v].game.boardSlide();

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
