var express = require('express');
var app = express();
var serv = require('http').Server(app);

var rc = require('randomcolor');
var chance = require('chance').Chance();

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 1337);
console.log("Server started.");

var SOCKET_LIST = {};

//board settings
var slide = 5;
var w = 20;
var h = w;

var Board = function(w,h){
	var self = createArray(w,h)
	for(var n = 0; n < w; n++) {
		for(var m = 0; m < h; m++) {
			self[n][m] = {id:null,prev:{count:0,dx:0,dy:0}};
		}
	}

	self.addPlayer = function(id) {
		var ok = false;
		var x = 0;
		var y = 0;
		var scoreDiff = 0;
		var tries = 0;

		//find a space for the pieces to spawn
		while(!ok) {
			var x = Math.floor(Math.random()*(w-6))+3;
			var y = Math.floor(Math.random()*(h-6))+3;

			var check = 0;
			for(var i = -3; i < 4; i++) {
				for(var j = -3; j < 4; j++) {
					if(self[x+i][y+j].id) { check++; break }
				}
			}
			if(!check) { ok = true; }

			tries++;
			if(tries > 100) { console.log("No room!"); return; }
		}

		//add pieces and get score change
		for(var i = -1; i < 2; i++) {
			for(var j = -1; j < 2; j++) {
				self[x+i][y+j].id = id;
				initPack.piece.push({i:x+i,j:y+j,id:id});
				Player.list[id].score++;
			}
		}
	}

	self.makeMove = function(id,i,j,dx,dy) {
		var selfCount = 0;
		var otherCount = 0;
		var ok = true;
		var take = false;

		//how many pieces ahead of move and can they be moved
		for(var n = 0; n < w + h; n++) {
			if(i+n*dx < 0 || i+n*dx >= w || j+n*dy < 0 || j+n*dy >= h) { ok = false; break; }
			else if(self[i+n*dx][j+n*dy].prev.count > 0) { ok = false; break; }
			else if(!self[i+n*dx][j+n*dy].id) { break; }
			else {
				if(self[i+n*dx][j+n*dy].id == id && otherCount == 0) { selfCount++; }
				else {
					otherCount++;
					if(selfCount == otherCount) { ok = false; break; }
				}
			}
		}

		//when move is allowed
		if(ok) {
			for(var n = n; n > 0; n--) {
				self[i+n*dx][j+n*dy].id = self[i+(n-1)*dx][j+(n-1)*dy].id; //update board
				var prev = {count:slide,dx:dx,dy:dy};
				self[i+n*dx][j+n*dy].prev = prev;
				updatePack.piece.push({i:i+n*dx,j:j+n*dy,id:self[i+(n-1)*dx][j+(n-1)*dy].id,prev:prev});
			}
			self[i][j].id = null; //clear space behind move
			self[i][j].prev.count = slide;
			updatePack.piece.push({i:i,j:j,id:null,prev:{count:slide}});

			do {
				var groups = findGroups(board);
				var groupList = {};

				//make list of groups with perimeter and neighbours
				for(var n = 0; n < w; n++) {
					for(var m = 0; m < h; m++) {
						if(groups[n][m]) {
							groupNum = groups[n][m];
							if(!groupList[groupNum]) {
								groupList[groupNum] = {id:self[n][m].id,perimeter:0,neighbours:[]};
							}

							//careful of board edges
							var maxA = n == w-1 ? 1 : 2;
							var minA = n == 0 ? 0 : -1;
							var maxB = m == h-1 ? 1 : 2;
							var minB = m == 0 ? 0 : -1;

							for(var a = minA; a < maxA; a++) {
								for(var b = minB; b < maxB; b++) {
									if(Math.abs(a) + Math.abs(b) == 1) {
										if(groups[n+a][m+b] != groupNum) {
											groupList[groupNum].perimeter++;
											if(groups[n+a][m+b] && self[n+a][m+b].id != 1) {
												groupList[groupNum].neighbours.push(self[n+a][m+b].id);
											}
										}
									}
								}
							}
						}
					}
				}

				//decide if there are enough neighbours for a capture for each group
				var captured = {};
				for(var n in groupList) {

					//algorithm for finding the maximum occuring neighbour id
					var store = groupList[n].neighbours;
					var frequency = {};
					var max = 0;
					var result = 0;

					for(var v in store) {
		        frequency[store[v]]=(frequency[store[v]] || 0)+1;
		        if(frequency[store[v]] > max) {
	            max = frequency[store[v]];
	            result = store[v];
		        }
					}

					if(max/groupList[n].perimeter >= 0.5) { captured[n] = result; }
				}

				//transfer pieces between players for any captures
				for(var n = 0; n < w; n++) {
					for(var m = 0; m < h; m++) {
						if(groups[n][m]) {
							for(var v in captured) {
								if(v == groups[n][m]) {
									if(self[n][m].id != 1) {
										Player.list[self[n][m].id].score--;
										updatePack.player.push(Player.list[self[n][m].id].getUpdatePack());
									}

									Player.list[captured[v]].score++;
									updatePack.player.push(Player.list[captured[v]].getUpdatePack());

									self[n][m].id = captured[v];
									updatePack.piece.push({i:n,j:m,id:captured[v]});
								}
							}
						}
					}
				}
			} while(Object.getOwnPropertyNames(captured).length != 0);

			//kill isolated pieces (MORE EFFICIENT WAY!!!!!!!)
			for(var n = 0; n < w; n++) {
				for(var m = 0; m < h; m++) {
					var currId = self[n][m].id;

					//careful of board edges
					var maxA = n == w-1 ? 1 : 2;
					var minA = n == 0 ? 0 : -1;
					var maxB = m == h-1 ? 1 : 2;
					var minB = m == 0 ? 0 : -1;

					if(currId && currId != 1) {
						var check = 0;
						for(var a = minA; a < maxA; a++) {
							for(var b = minB; b < maxB; b++) {
								if(Math.abs(a) + Math.abs(b) == 1) {
									if(self[n+a][m+b].id == currId) { check++; }
								}
							}
						}

						if(!check) {
							self[n][m].id = 1;
							updatePack.piece.push({i:n,j:m,id:1});

							Player.list[currId].score--;
							updatePack.player.push(Player.list[currId].getUpdatePack());
						}
					}
				}
			}
		}
		return ok;
	}
	return self;
}
var board = new Board(w,h);

function findGroups() {
	var groups = createArray(w,h);
	var groupNum = 0;

	//get array of grouped pieces
	for(var n = 0; n < w; n++) {
		for(var m = 0; m < h; m++) {
			if(board[n][m].id && !groups[n][m]) {
				groupNum++;
				groups = groupsLoop(board,board[n][m].id,groups,n,m,groupNum);
			}
		}
	}
	return groups;
}

//helper function to loop through when calculating groups
function groupsLoop(board,id,groups,n,m,groupNum) {
	groups[n][m] = groupNum;

	//careful of board edges
	var maxA = n == w-1 ? 1 : 2;
	var minA = n == 0 ? 0 : -1;
	var maxB = m == h-1 ? 1 : 2;
	var minB = m == 0 ? 0 : -1;

	for(var a = minA; a < maxA; a++) {
		for(var b = minB; b < maxB; b++) {
			if(Math.abs(a) + Math.abs(b) == 1) {
				if(board[n+a][m+b].id == id && !groups[n+a][m+b]) {
					groups = groupsLoop(board,id,groups,n+a,m+b,groupNum);
				}
			}
		}
	}
	return groups;
}

var Player = function(id){
	var self = {};
	self.id = id;

	var word = chance.word()
	self.name = word.charAt(0).toUpperCase() + word.slice(1);
	self.score = 0;
	self.color = rc.randomColor({luminosity:"dark",format:"rgb"});

	//TRY TO SEPERATE PLAYER AND BOARD MORE!!! CONFUSING!!!
	Player.list[id] = self;
	initPack.player.push(self);

	board.addPlayer(id);
	initPack.board = board;

	self.getUpdatePack = function() {
		return {id:self.id,score:self.score};
	}

	return self;
}
Player.list = {};

//get array instead of list for first init on connect
Player.getAll = function(){
	var players = [];
	for(var i in Player.list) { players.push(Player.list[i]); }
	return players;
}

Player.onConnect = function(socket){
	var player = Player(socket.id);
	console.log(socket.id+" connected.")

	socket.on('keyPress',function(data,callback){
		if(socket.id == board[data.selected.i][data.selected.j].id) {
			var ok;
			if(data.inputId == 'left'){ ok = board.makeMove(socket.id,data.selected.i,data.selected.j,-1,0); }
			else if(data.inputId == 'right'){ ok = board.makeMove(socket.id,data.selected.i,data.selected.j,1,0); }
			else if(data.inputId == 'up'){ ok = board.makeMove(socket.id,data.selected.i,data.selected.j,0,-1); }
			else if(data.inputId == 'down'){ ok = board.makeMove(socket.id,data.selected.i,data.selected.j,0,1); }
		}
	});

	//get all info on connect
	socket.emit('init',{
		selfId:socket.id,
		slide:slide,
		player:Player.getAll(),
		piece:[],
		board:board
	});
}

Player.onDisconnect = function(socket){
	console.log(socket.id+" disconnected.")
	delete Player.list[socket.id];
	removePack.player.push(socket.id);

	for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
			if(board[i][j].id == socket.id) {
				board[i][j].id = null; //1 to kill pieces when disconnected
				removePack.piece.push({i:i,j:j});
			}
		}
	}
}


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
});


var initPack = {player:[],piece:[]};
var removePack = {player:[],piece:[]};
var updatePack = {player:[],piece:[]};

setInterval(function(){
	if(!board) return;

	for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
			if(board[i][j].prev.count > 0) { board[i][j].prev.count--; }
		}
	}

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
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

function createArray(length) {
  var arr = new Array(length || 0),
    i = length;

  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }
  return arr;
}
