var express = require('express');
var app = express();
var serv = require('http').Server(app);

var common = require('./client/common.js');
var classes = require('./client/classes.js');

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 1337);
console.log("Server started.");

var socketList = {};
var gameList = {};




///////////////////////////////////////////////////////////////////////
//Main server update loop
///////////////////////////////////////////////////////////////////////

setInterval(function(){
	//if(!game) return;

	//spawn pieces for all games
	for(var v in gameList) {
		var pieces = gameList[v].game.pieceSpawn();
		for(var n = 0; n < pieces.length; n++) { gameList[v].updatePack.pieces.push(pieces[n]); }
	}

	//send pack for game to corresponding joined players
	for(var v in socketList){
		var socket = socketList[v].socket;

		if(socketList[v].gameId) {
			var game = gameList[socketList[v].gameId];
			if(game.initPack.players.length != 0 || game.initPack.pieces.length != 0) socket.emit('init',game.initPack);
			if(game.updatePack.pieces.length != 0 || game.updatePack.players.length != 0)  socket.emit('update',game.updatePack);
			if(game.removePack.players.length != 0 || game.removePack.pieces.length != 0)  socket.emit('remove',game.removePack);
		}
	}

	//slide and empty packs
	for(var v in gameList) {
		gameList[v].game.boardSlide();

		gameList[v].initPack = {players:[],pieces:[]};
		gameList[v].removePack = {players:[],pieces:[]};
		gameList[v].updatePack = {players:[],pieces:[]};
	}
},40);


///////////////////////////////////////////////////////////////////////
//Joining and leaving games
///////////////////////////////////////////////////////////////////////

function joinGame(socket,data) {
	var name = data.name.substring(0,10);
	var color = data.color; //check if color is visible enough???
	var player = new classes.Player({new:{id:socket.id, name:name, color:color}});
	var game;

	if(data.joinId != null) {
		if(gameList[data.joinId] && gameList[data.joinId].game.getPlayerCount() < gameList[data.joinId].game.playerLimit) {
			game = gameList[data.joinId].game;
		}
		else { return; }
	}
	else if(data.createData != null) {
		if(data.createData.l != 20 && data.createData.l != 50 && data.createData.l != 100 && data.createData.l != 200) return; //avoid dodgy sizes

		game = new classes.Game({new:{id:data.createData.createId,l:data.createData.l,pub:data.createData.pub}});
		gameList[game.id] = {game:game,initPack:{players:[],pieces:[]},removePack:{players:[],pieces:[]},updatePack:{players:[],pieces:[]}};
		console.log("Game "+game.id+" created");
	}
	else { //check for space in current games
		for(var v in gameList) {
			if(gameList[v].game.pub && gameList[v].game.getPlayerCount() < gameList[v].game.playerLimit) {
				game = gameList[v].game;
				break;
			}
		}
		if(!game) { //if no game with space found
			game = new classes.Game({new:{}});
			gameList[game.id] = {game:game,initPack:{players:[],pieces:[]},removePack:{players:[],pieces:[]},updatePack:{players:[],pieces:[]}};
			console.log("Game "+game.id+" created");
		}
	}

	//NEED BETTER WAY OF PREVENTING SPAM CLICKING!!!
	//before adding to a game, check that the id is not already playing
	for(var n in gameList) {
		if(gameList[n].game.playerList[socket.id]) {
			if(gameList[n].game.playerList[socket.id].score > 0) { return; }
		}
	}

	gameList[game.id].initPack.players.push(player);

	//add player to board
	var pieces = gameList[game.id].game.addPlayer(player);
	for(var n = 0; n < pieces.length; n++) { gameList[game.id].initPack.pieces.push(pieces[n]); }

	socketList[socket.id].gameId = game.id;

	//add move listener to socket of new joined player
	socket.on('move',function(data){
		var gameId = socketList[socket.id].gameId;
		//needs to prevent moves while waiting for zero score leave
		if(gameId && socket.id == gameList[gameId].game.board[data.i][data.j].id) {
			var pack = gameList[gameId].game.makeMove(data.i,data.j,data.dx,data.dy);
			for(var n = 0; n < pack.players.length; n++) { gameList[gameId].updatePack.players.push(pack.players[n]); }
			for(var n = 0; n < pack.pieces.length; n++) { gameList[gameId].updatePack.pieces.push(pack.pieces[n]); }
		}
	});

	console.log("Player "+socket.id+" joined Game "+game.id);
	console.log("Game "+game.id+" has "+game.getPlayerCount()+"/"+game.playerLimit+" players");

	return game;
}

function leaveGame(socket){
	var gameId = socketList[socket.id].gameId;

	if(gameList[gameId]) { //if statement for nodemon restart problems
		//disassociate player with the game
		socketList[socket.id].gameId = null;
		console.log("Player "+socket.id+" left Game "+gameId);

		//remove player from board
		var pieces = gameList[gameId].game.removePlayer(socket.id);
		console.log("Game "+gameId+" has "+gameList[gameId].game.getPlayerCount()+"/"+gameList[gameId].game.playerLimit+" players");


		//delete game if last player
		if(gameList[gameId].game.getPlayerCount() == 0) {
			delete gameList[gameId];
			console.log("Game "+gameId+" deleted");
		} else { //otherwise let other players in game know
			gameList[gameId].removePack.players.push(socket.id);
			for(var n = 0; n < pieces.length; n++) { gameList[gameId].removePack.pieces.push(pieces[n]); }
		}
	}
}


///////////////////////////////////////////////////////////////////////
//Socket listeners
///////////////////////////////////////////////////////////////////////

var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	socketList[socket.id] = {socket:socket,gameId:null}; //connected but not joined
	console.log("Player "+socket.id+" connected");

	//join specific game
	socket.on('join', function(data, callback) {
		var game = joinGame(socket,data);
		callback(game,socket.id);
	});

	//leave game without disconnect
	socket.on('leave', function(data) {
		leaveGame(socket);
	});

	socket.on('disconnect',function() {
		leaveGame(socket);
		delete socketList[socket.id];
		console.log("Player "+socket.id+" disconnected")
	});
});
