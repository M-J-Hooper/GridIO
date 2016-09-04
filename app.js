var express = require('express');
var app = express();
var serv = require('http').Server(app);

var rc = require('randomcolor');
var chance = require('chance').Chance();

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
var game = Game(w,h,slide);
gameList[game.id] = game; //use when there are multiple games

onConnect = function(socket){
	var name = chance.word()
	var color = rc.randomColor({luminosity:"dark",format:"rgb"});
	var player = Player(socket.id, name.charAt(0).toUpperCase() + name.slice(1), color);
	initPack.player.push(player);

	var piece = game.addPlayer(player);
	for(var n = 0; n < piece.length; n++) { initPack.piece.push(piece[n]); }

	console.log(socket.id+" connected.")

	socket.on('keyPress',function(data){
		if(socket.id == game.board[data.selected.i][data.selected.j].id) {
			var pack;
			if(data.inputId == 'left'){ pack = game.makeMove(socket.id,data.selected.i,data.selected.j,-1,0); }
			else if(data.inputId == 'right'){ pack = game.makeMove(socket.id,data.selected.i,data.selected.j,1,0); }
			else if(data.inputId == 'up'){ pack = game.makeMove(socket.id,data.selected.i,data.selected.j,0,-1); }
			else if(data.inputId == 'down'){ pack = game.makeMove(socket.id,data.selected.i,data.selected.j,0,1); }

			for(var n = 0; n < pack.player.length; n++) { updatePack.player.push(pack.player[n]); }
			for(var n = 0; n < pack.piece.length; n++) { updatePack.piece.push(pack.piece[n]); }
		}
	});

	//get all info on connect
	socket.emit('init',{
		selfId:socket.id,
		player:[],
		piece:[],
		game:game
	});
}

onDisconnect = function(socket){
	removePack.player.push(socket.id);

	var piece = game.removePlayer(socket.id);
	for(var n = 0; n < piece.length; n++) { removePack.piece.push(piece[n]); }

	console.log(socket.id+" disconnected.")
}


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	socketList[socket.id] = socket;

	onConnect(socket);

	socket.on('disconnect',function(){
		delete socketList[socket.id];
		onDisconnect(socket);
	});
});


var initPack = {player:[],piece:[]};
var removePack = {player:[],piece:[]};
var updatePack = {player:[],piece:[]};

setInterval(function(){
	if(!game) return;

	game = boardSlide(game);

	for(var i in socketList){
		var socket = socketList[i];
		socket.emit('init',initPack);
		socket.emit('update',updatePack);
		socket.emit('remove',removePack);
	}
	initPack = {player:[],piece:[]};
	removePack = {player:[],piece:[]};
	updatePack = {player:[],piece:[]};

},1000/25);

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
