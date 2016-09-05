if(typeof module != 'undefined') {
  module.exports = function() {
    this.createArray = createArray;
    this.boardSlide = boardSlide;
    this.findGroups = findGroups;
  }
}

function createArray(length) {
  var arr = new Array(length || 0),
    i = length;

  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }
  return arr;
}

function boardSlide(game) {
  for(var i = 0; i < game.w; i++) {
		for(var j = 0; j < game.h; j++) {
			if(game.board[i][j].prev.count > 0) { game.board[i][j].prev.count--; }
    }
  }
  return game;
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
