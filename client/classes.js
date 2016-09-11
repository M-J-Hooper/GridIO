if(typeof module != 'undefined') {
  module.exports = function() {
    this.Game = Game;
    this.Player = Player;
  }
}

var Game = function(params) {
  var self = {};
  if(params.new) {
    self.id = Math.random();
    self.w = params.new.w;
    self.h = params.new.h;
    self.slide = params.new.slide;
    self.playerLimit = params.new.playerLimit;
    self.spawn = params.new.spawn;
    self.playerList = {};

  	self.board = createArray(self.w,self.h);
  	for(var n = 0; n < self.w; n++) {
  		for(var m = 0; m < self.h; m++) {
  			self.board[n][m] = {id:null,prev:{count:0,dx:0,dy:0}};
  		}
  	}
  }
  if(params.copy) { self = params.copy; }

  self.getPlayerCount = function() {
    return Object.keys(self.playerList).length;
  }

	self.addPlayer = function(player) {
    self.playerList[player.id] = player;

		var n = 0;
		var m = 0;
		var berth = 5;
    var tries = 0;
    var pieces = [];

		//find a space for the pieces to spawn
		while(berth >= 1) {
			n = Math.floor(Math.random()*(self.w-2*berth))+berth;
			m = Math.floor(Math.random()*(self.h-2*berth))+berth;

			var check = 0;
			for(var i = -berth; i <= berth; i++) {
				for(var j = -berth; j <= berth; j++) {
					if(self.board[n+i][m+j].id) { check++; }
				}
			}
			if(!check) { break; }
      else {
  			tries++;
  			if(tries > 50) { berth--; tries = 0; } //how many times should it try?
      }
		}
    if(berth < 1) { console.log("Game "+self.id+" has no room for Player "+player.id); } //FIND NEW GAME IF NO ROOM!?

		//add pieces and get score change
		for(var i = -1; i <= 1; i++) {
			for(var j = -1; j <= 1; j++) {
				self.board[n+i][m+j].id = player.id;
				pieces.push({i:n+i,j:m+j,id:player.id});
				self.playerList[player.id].score++;
			}
		}
    return pieces;
	}

  self.removePlayer = function(id) {
    var pieces = [];

    delete self.playerList[id];

    for(var i = 0; i < self.w; i++) {
  		for(var j = 0; j < self.h; j++) {
  			if(self.board[i][j].id == id) {
          //1 to kill pieces, null to remove totally
          if(self.spawn) {
            self.board[i][j].id = 1;
            pieces.push({i:i,j:j,id:1});
          } else {
            self.board[i][j].id = null;
            pieces.push({i:i,j:j,id:null});
          }

  			}
  		}
  	}
    return pieces;
  }

	self.makeMove = function(i,j,dx,dy) {
    var id = self.board[i][j].id;
		var selfCount = 0;
		var otherCount = 0;
		var ok = true;
    var pack = {players:[],pieces:[]};

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

		//when move is allowed or on client
		if(ok) {
			for(var n = n; n > 0; n--) {
				self.board[i+n*dx][j+n*dy].id = self.board[i+(n-1)*dx][j+(n-1)*dy].id; //update board
				var prev = {count:self.slide,dx:dx,dy:dy};
				self.board[i+n*dx][j+n*dy].prev = prev;
        pack.pieces.push({i:i+n*dx,j:j+n*dy,id:self.board[i+(n-1)*dx][j+(n-1)*dy].id,prev:prev});
			}
			self.board[i][j].id = null; //clear space behind move
			self.board[i][j].prev.count = self.slide;
      pack.pieces.push({i:i,j:j,id:null,prev:{count:self.slide}});

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
                    pack.players.push(self.playerList[self.board[n][m].id].getUpdatePack());
									}

									self.playerList[captured[v]].score++;
                  pack.players.push(self.playerList[captured[v]].getUpdatePack());

									self.board[n][m].id = captured[v];
                  pack.pieces.push({i:n,j:m,id:captured[v]});
								}
							}
						}
					}
				}
			} while(Object.keys(captured).length != 0);

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
                pack.pieces.push({i:n,j:m,id:1});

								self.playerList[currId].score--;
                pack.players.push(self.playerList[currId].getUpdatePack());
							}
						}
					}
				}
			}
		}
		return pack;
	}

  self.pieceSpawn = function() {
    var pieces = [];
    var berth = 3;
    var rate = 0.005;
    var density = 1/50;
    var target = self.w*self.h*density;

    var count = 0;
    for(var n = 0; n < self.w; n++) {
      for(var m = 0; m < self.h; m++) {
        if(self.board[n][m].id == 1) { count++; } //==1 to only count dead pieces
      }
    }
    var diff = target - count;
    if(diff > 0) { //spawn
      var tries = 0;
      var n = null;
      var m = null;

      var spawnProb = rate;
      if(Math.random() < spawnProb) {
        while(berth >= 1) {
    			n = Math.floor(Math.random()*(self.w-2*berth))+berth;
    			m = Math.floor(Math.random()*(self.h-2*berth))+berth;

    			var check = 0;
    			for(var i = -berth; i <= berth; i++) {
    				for(var j = -berth; j <= berth; j++) {
    					if(self.board[n+i][m+j].id && self.board[n+i][m+j].id != 1) { check++; }
    				}
    			}
    			if(!check) { break; }
          else {
      			tries++;
      			if(tries > 50) { berth--; tries = 0; } //how many times should it try?
          }
    		}
        if(berth < 1) { console.log("Game "+self.id+" has no room for spawn"); }


        self.board[n][m].id = 1;
        pieces.push({i:n,j:m,id:1});
      }
    }
    if(diff < 0) { //kill
      var killProb = rate/count;
      for(var n = berth; n < self.w-berth; n++) { //cant kill pieces near edge???
    		for(var m = berth; m < self.h-berth; m++) {
          if(self.board[n][m].id == 1) {
            var check = 0;
            for(var i = -berth; i <= berth; i++) {
      				for(var j = -berth; j <= berth; j++) {
      					if(self.board[n+i][m+j].id && self.board[n+i][m+j].id != 1) { check++; }
      				}
      			}

            if(!check && Math.random() < killProb) {
              self.board[n][m].id = null;
              pieces.push({i:n,j:m,id:null});
            }
          }
        }
      }
    }
    return pieces;
  }

  self.boardSlide = function() {
    for(var i = 0; i < self.w; i++) {
  		for(var j = 0; j < self.h; j++) {
  			if(self.board[i][j].prev.count > 0) { self.board[i][j].prev.count--; }
      }
    }
  }

  //reorder leaderboard based on score
  self.getLeaderboard = function() {
    var leaderboard = [];
    for(var i in self.playerList) { leaderboard.push({id:i,name:self.playerList[i].name,score:self.playerList[i].score,rank:0}); }
    leaderboard.sort(function(a,b) { return a.score - b.score });
    leaderboard = leaderboard.reverse();

    var prevRank = 1;
    var prevScore = 0;
    for(var i = 0; i < leaderboard.length; i++) {
      if(leaderboard[i].score != prevScore) { prevRank = i+1; }
      prevScore = leaderboard[i].score;
      leaderboard[i].rank = prevRank;
    }
    return leaderboard;
  }
	return self;
}

var Player = function(params){
	var self = {};
  if(params.new) {
  	self.id = params.new.id;
    self.name = params.new.name;
    self.color = params.new.color;
  	self.score = 0;
  }
  if(params.copy) {
    self = params.copy;
  }

	self.getUpdatePack = function() {
		return {id:self.id,score:self.score};
	}

	return self;
}
