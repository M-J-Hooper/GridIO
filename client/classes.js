if(typeof module != 'undefined') {
  module.exports = function() {
    this.Game = Game;
    this.Player = Player;
  }
}

var Game = function(w,h,slide) {
  var self = {};
  self.id = Math.random();
  self.w = w;
  self.h = h;
  self.slide = slide;
  self.playerList = {};

	self.board = createArray(w,h);
	for(var n = 0; n < w; n++) {
		for(var m = 0; m < h; m++) {
			self.board[n][m] = {id:null,prev:{count:0,dx:0,dy:0}};
		}
	}

	self.addPlayer = function(player) {
    self.playerList[player.id] = player;

		var ok = false;
		var n = 0;
		var m = 0;
		var scoreDiff = 0;
		var tries = 0;
    var piece = [];

		//find a space for the pieces to spawn
		while(!ok) {
			n = Math.floor(Math.random()*(self.w-6))+3;
			m = Math.floor(Math.random()*(self.h-6))+3;

			var check = 0;
			for(var i = -3; i < 4; i++) {
				for(var j = -3; j < 4; j++) {
					if(self.board[n+i][m+j].id) { check++; break }
				}
			}
			if(!check) { ok = true; }
      else {
  			tries++;
  			if(tries > 100) { console.log("No room!"); break; }
      }
		}

		//add pieces and get score change
		for(var i = -1; i < 2; i++) {
			for(var j = -1; j < 2; j++) {
				self.board[n+i][m+j].id = player.id;
				piece.push({i:n+i,j:m+j,id:player.id});
				self.playerList[player.id].score++;
			}
		}
    return piece;
	}

  self.removePlayer = function(id) {
    var piece = [];

    delete self.playerList[id];

    for(var i = 0; i < self.w; i++) {
  		for(var j = 0; j < self.h; j++) {
  			if(self.board[i][j].id == id) {
  				self.board[i][j].id = null; //1 to kill pieces when disconnected
  				piece.push({i:i,j:j});
  			}
  		}
  	}
    return piece;
  }

	self.makeMove = function(id,i,j,dx,dy) {
		var selfCount = 0;
		var otherCount = 0;
		var ok = true;
		var take = false;
    var updatePack = {player:[],piece:[]};

		//how many pieces ahead of move and can they be moved
		for(var n = 0; n < self.w + self.h; n++) {
			if(i+n*dx < 0 || i+n*dx >= self.w || j+n*dy < 0 || j+n*dy >= self.h) { ok = false; break; }
			else if(self.board[i+n*dx][j+n*dy].prev.count > 0) { ok = false; break; }
			else if(!self.board[i+n*dx][j+n*dy].id) { break; }
			else {
				if(self.board[i+n*dx][j+n*dy].id == id && otherCount == 0) { selfCount++; }
				else {
					otherCount++;
					if(selfCount == otherCount) { ok = false; break; }
				}
			}
		}

		//when move is allowed
		if(ok) {
			for(var n = n; n > 0; n--) {
				self.board[i+n*dx][j+n*dy].id = self.board[i+(n-1)*dx][j+(n-1)*dy].id; //update board
				var prev = {count:slide,dx:dx,dy:dy};
				self.board[i+n*dx][j+n*dy].prev = prev;
				updatePack.piece.push({i:i+n*dx,j:j+n*dy,id:self.board[i+(n-1)*dx][j+(n-1)*dy].id,prev:prev});
			}
			self.board[i][j].id = null; //clear space behind move
			self.board[i][j].prev.count = slide;
			updatePack.piece.push({i:i,j:j,id:null,prev:{count:slide}});

			do {
				var groups = findGroups(self);
				var groupList = {};

				//make list of groups with perimeter and neighbours
				for(var n = 0; n < self.w; n++) {
					for(var m = 0; m < self.h; m++) {
						if(groups[n][m]) {
							groupNum = groups[n][m];
							if(!groupList[groupNum]) {
								groupList[groupNum] = {id:self.board[n][m].id,perimeter:0,neighbours:[]};
							}

							//careful of board edges
							var maxA = n == self.w-1 ? 1 : 2;
							var minA = n == 0 ? 0 : -1;
							var maxB = m == self.h-1 ? 1 : 2;
							var minB = m == 0 ? 0 : -1;

							for(var a = minA; a < maxA; a++) {
								for(var b = minB; b < maxB; b++) {
									if(Math.abs(a) + Math.abs(b) == 1) {
										if(groups[n+a][m+b] != groupNum) {
											groupList[groupNum].perimeter++;
											if(groups[n+a][m+b] && self.board[n+a][m+b].id != 1) {
												groupList[groupNum].neighbours.push(self.board[n+a][m+b].id);
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
				for(var n = 0; n < self.w; n++) {
					for(var m = 0; m < self.h; m++) {
						if(groups[n][m]) {
							for(var v in captured) {
								if(v == groups[n][m]) {
									if(self.board[n][m].id != 1) {
										self.playerList[self.board[n][m].id].score--;
										updatePack.player.push(self.playerList[self.board[n][m].id].getUpdatePack());
									}

									self.playerList[captured[v]].score++;
									updatePack.player.push(self.playerList[captured[v]].getUpdatePack());

									self.board[n][m].id = captured[v];
									updatePack.piece.push({i:n,j:m,id:captured[v]});
								}
							}
						}
					}
				}
			} while(Object.getOwnPropertyNames(captured).length != 0);

			//kill isolated pieces (MORE EFFICIENT WAY!!!!!!!)
			var groups = findGroups(self)
			var groupCount = {};
			for(var n = 0; n < self.w; n++) {
				for(var m = 0; m < self.h; m++) {
					if(groupCount[groups[n][m]]) { groupCount[groups[n][m]]++; }
					else { groupCount[groups[n][m]] = 1; }
				}
			}
			for(var n = 0; n < self.w; n++) {
				for(var m = 0; m < self.h; m++) {
					var currId = self.board[n][m].id;
					if(groups[n][m] && currId != 1) {
						for(var v in groupCount) {
							if(groupCount[v] == 1 && v == groups[n][m]) {
								self.board[n][m].id = 1;
								updatePack.piece.push({i:n,j:m,id:1});

								self.playerList[currId].score--;
								updatePack.player.push(self.playerList[currId].getUpdatePack());
							}
						}
					}
				}
			}

			//old method for cell killing...
			/*for(var n = 0; n < self.w; n++) {
				for(var m = 0; m < self.h; m++) {
					var currId = self.board[n][m].id;

					//careful of board edges
					var maxA = n == self.w-1 ? 1 : 2;
					var minA = n == 0 ? 0 : -1;
					var maxB = m == self.h-1 ? 1 : 2;
					var minB = m == 0 ? 0 : -1;

					if(currId && currId != 1) {
						var check = 0;
						for(var a = minA; a < maxA; a++) {
							for(var b = minB; b < maxB; b++) {
								if(Math.abs(a) + Math.abs(b) == 1) {
									if(self.board[n+a][m+b].id == currId) { check++; }
								}
							}
						}

						if(!check) {
							self.board[n][m].id = 1;
							updatePack.piece.push({i:n,j:m,id:1});

							self.playerList[currId].score--;
							updatePack.player.push(self.playerList[currId].getUpdatePack());
						}
					}
				}
			}*/
		}
		return updatePack;
	}
	return self;
}

function findGroups(game) {
	var groups = createArray(game.w,game.h);
	var groupNum = 0;

	//get array of grouped pieces
	for(var n = 0; n < game.w; n++) {
		for(var m = 0; m < game.h; m++) {
			if(game.board[n][m].id && !groups[n][m]) {
				groupNum++;
				groups = groupsLoop(game,game.board[n][m].id,groups,n,m,groupNum);
			}
		}
	}
	return groups;
}

//helper function to loop through when calculating groups
function groupsLoop(game,id,groups,n,m,groupNum) {
	groups[n][m] = groupNum;

	//careful of board edges
	var maxA = n == game.w-1 ? 1 : 2;
	var minA = n == 0 ? 0 : -1;
	var maxB = m == game.h-1 ? 1 : 2;
	var minB = m == 0 ? 0 : -1;

	for(var a = minA; a < maxA; a++) {
		for(var b = minB; b < maxB; b++) {
			if(Math.abs(a) + Math.abs(b) == 1) {
				if(game.board[n+a][m+b].id == id && !groups[n+a][m+b]) {
					groups = groupsLoop(game,id,groups,n+a,m+b,groupNum);
				}
			}
		}
	}
	return groups;
}

var Player = function(id,name,color){
	var self = {};
	self.id = id;
  self.name = name;
  self.color = color;
	self.score = 0;

	self.getUpdatePack = function() {
		return {id:self.id,score:self.score};
	}

	return self;
}
