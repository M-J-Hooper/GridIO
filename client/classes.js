if(typeof module != 'undefined') {
  module.exports = function() {
    this.Game = Game;
    this.Player = Player;
  }
}

var Game = function(params) {
  var self = {};
  if(params.new) {
    if(params.new.id) { self.id = params.new.id; }
    else { self.id = Math.random(); }
    self.l = params.new.l;
    self.slide = params.new.slide;
    self.playerLimit = params.new.playerLimit;
    self.pub = params.new.pub;
    self.spawn = params.new.spawn;
    self.playerList = {};

  	self.board = createArray(self.l,self.l);
  	for(var n = 0; n < self.l; n++) {
  		for(var m = 0; m < self.l; m++) {
  			self.board[n][m] = {id:null,prev:{count:0,dx:0,dy:0}};
  		}
  	}
  }
  if(params.copy) { self = params.copy; }

  self.getPlayerCount = function() {
    return Object.keys(self.playerList).length;
  }

	//add player to the board
	self.addPlayer = function(player) {
    self.playerList[player.id] = player;

		var n = 0;
		var m = 0;
		var berth = 5;
    var tries = 0;
    var pieces = [];

		//find a space for the pieces to spawn
		while(berth >= 1) {
			n = Math.floor(Math.random()*(self.l-2*berth))+berth;
			m = Math.floor(Math.random()*(self.l-2*berth))+berth;

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
		for(var i = 0; i <= 1; i++) {
			for(var j = 0; j <= 1; j++) {
				self.board[n+i][m+j].id = player.id;
				pieces.push({i:n+i,j:m+j,id:player.id});
				self.playerList[player.id].score++;
			}
		}
    return pieces;
	}

	//remove a player from the board
  self.removePlayer = function(id) {
    var pieces = [];

    delete self.playerList[id];

    for(var i = 0; i < self.l; i++) {
  		for(var j = 0; j < self.l; j++) {
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

	//decide if a move is allowed and then calculate changes - must be very fast!
	self.makeMove = function(i,j,dx,dy) {
    var id = self.board[i][j].id;
		var selfCount = 0;
		var otherCount = 0;
		var ok = true;
    var pack = {players:[],pieces:[]};

		//how many pieces ahead of move and can they be moved
		for(var n = 0; n < self.l; n++) {
			if(i+n*dx < 0 || i+n*dx >= self.l || j+n*dy < 0 || j+n*dy >= self.l) { ok = false; break; } //fails if boundary hit
			else if(self.board[i+n*dx][j+n*dy].prev.count > 0) { ok = false; break; } //fails if moving piece is hit
			else if(!self.board[i+n*dx][j+n*dy].id) { break; } //succeeds if reachs an empty tile
			else {
				if(self.board[i+n*dx][j+n*dy].id == id && otherCount == 0) { selfCount++; } //count own pieces which are pushing
				else {
					otherCount++; //count pieces being pushed
					if(selfCount == otherCount) { ok = false; break; } //fails if cannot push
				}
			}
		}

		//when move is allowed
		if(ok) {
			for(var n = n; n > 0; n--) { //track back through moved pieces for updating
				self.board[i+n*dx][j+n*dy].id = self.board[i+(n-1)*dx][j+(n-1)*dy].id;
				var prev = {count:self.slide,dx:dx,dy:dy};
				self.board[i+n*dx][j+n*dy].prev = prev;
        pack.pieces.push({i:i+n*dx,j:j+n*dy,id:self.board[i+(n-1)*dx][j+(n-1)*dy].id,prev:prev});
			}
			self.board[i][j].id = null; //clear space behind move
			self.board[i][j].prev.count = self.slide;
      pack.pieces.push({i:i,j:j,id:null,prev:{count:self.slide}});

			do {
				var region = {minI:i+dx,maxI:i+dx,minJ:j+dy,maxJ:j+dy}
				var checked = createArray(self.l,self.l);
				var data = regionLoop(self,{region:region,checked:checked} , i, j);
				region = data.region;

				var groups = findGroups(self, region);
				var groupList = {};

				//make list of groups with perimeter and neighbours
				for(var n = 0; n < groups.length; n++) {
					for(var m = 0; m < groups[0].length; m++) {
						if(groups[n][m]) {
							var groupNum = groups[n][m];
							if(!groupList[groupNum]) {
								groupList[groupNum] = {id:self.board[n+region.minI][m+region.minJ].id,perimeter:0,neighbours:[]};
							}

							//loop through the 4 bounding tiles
							for(var a = -1; a < 2; a++) {
								for(var b = -1; b < 2; b++) {
									if(Math.abs(a) + Math.abs(b) == 1) {
										if(n+a == groups.length || n+a < 0 || m+b == groups[0].length || m+b < 0) { //if index out of region then must be perimeter
											groupList[groupNum].perimeter++;
										}
										else if(groups[n+a][m+b] != groupNum) { //if of different group or no group
											groupList[groupNum].perimeter++;
											if(groups[n+a][m+b] && self.board[n+region.minI+a][m+region.minJ+b] != 1) { //if of different group
												groupList[groupNum].neighbours.push(self.board[n+region.minI+a][m+region.minJ+b].id); //add id to list of attacking players for that group
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

					//if more then half perimeter covered by max surrounder then add "group:n captured by id:result"
					if(result != 1 && max/groupList[n].perimeter >= 0.5) { captured[n] = result; }
				}

				//transfer pieces between players for any captures
				for(var n = 0; n < groups.length; n++) {
					for(var m = 0; m < groups[0].length; m++) {
						if(groups[n][m]) {
							for(var v in captured) {
								if(v == groups[n][m]) { //if group has been captured
									if(self.board[n+region.minI][m+region.minJ].id != 1) { //capture of non-dead piece results in score changes
										//score and pack for prey
										self.playerList[self.board[n+region.minI][m+region.minJ].id].score--;
                    pack.players.push(self.playerList[self.board[n+region.minI][m+region.minJ].id].getUpdatePack());
									}
									//score and pack for attacker
									self.playerList[captured[v]].score++;
                  pack.players.push(self.playerList[captured[v]].getUpdatePack());

									//edit board and pack for piece change
									self.board[n+region.minI][m+region.minJ].id = captured[v];
                  pack.pieces.push({i:n+region.minI,j:m+region.minJ,id:captured[v]});
								}
							}
						}
					}
				}
			} while(Object.keys(captured).length != 0); //capture could cause further captures so repeat

			//kill isolated pieces
			var groupCount = {};
			for(var n = 0; n < groups.length; n++) {
				for(var m = 0; m < groups[0].length; m++) {
					if(groups[n][m]) {
						if(groupCount[groups[n][m]]) { groupCount[groups[n][m]]++; }
						else { groupCount[groups[n][m]] = 1; }
					}
				}
			}
			for(var n = 0; n < groups.length; n++) {
				for(var m = 0; m < groups[0].length; m++) {
					var currId = self.board[n+region.minI][m+region.minJ].id;
					if(groups[n][m] && currId != 1) {
						for(var v in groupCount) {
							if(groupCount[v] == 1 && v == groups[n][m]) {
								self.board[n+region.minI][m+region.minJ].id = 1;
                pack.pieces.push({i:n+region.minI,j:m+region.minJ,id:1});

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
    var rate = 0.001*self.l*self.l;
    var density = 1/100;
    var target = self.l*self.l*density;

    var count = 0;
    for(var n = 0; n < self.l; n++) {
      for(var m = 0; m < self.l; m++) {
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
    			n = Math.floor(Math.random()*(self.l-2*berth))+berth;
    			m = Math.floor(Math.random()*(self.l-2*berth))+berth;

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
      for(var n = berth; n < self.l-berth; n++) { //cant kill pieces near edge???
    		for(var m = berth; m < self.l-berth; m++) {
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
    for(var i = 0; i < self.l; i++) {
  		for(var j = 0; j < self.l; j++) {
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
