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

//get info on own pieces for size and view
function getView(game, selfId, view, smooth) {
  var minI, maxI, minJ, maxJ;
  var first = true;
  var count = 0;

  var avI = 0;
  var avJ = 0;

  for(var i = 0; i < game.w; i++) {
		for(var j = 0; j < game.h; j++) {
      if(game.board[i][j].id == selfId) {
        if(first) { minI = i; maxI = i; minJ = j; maxJ = j; first = false; }
        else {
          if(i < minI) { minI = i; }
          if(i > maxI) { maxI = i; }
          if(j < minJ) { minJ = j; }
          if(j > maxJ) { maxJ = j; }
        }

        avI += i+0.5;
        avJ += j+0.5;
        count++;
      }
		}
	}

  var r;
  if(count && !view.fixed) {
    avI = (maxI + minI)/2;
    avJ = (maxJ + minJ)/2;

    var viewDist = Math.sqrt(count)+2;
    var playerSizeX = (maxI - minI + 1);
    var playerSizeY = (maxJ - minJ + 1);
    r = Math.min(view.width/(playerSizeX+viewDist*2),view.height/(playerSizeY+viewDist*2))/view.size;
  }
  else {
    avI = game.w/2;
    avJ = game.h/2
    r = Math.min(view.width/(game.w+1),view.height/(game.h+1))/view.size;
  }

  if(smooth) {
    var viewSmooth = 100;
    view.size += view.size*(r-1)/viewSmooth;
    view.x += (avI*view.size*r - view.x)/viewSmooth;
    view.y += (avJ*view.size*r - view.y)/viewSmooth;
  }
  else {
    view.size  = view.size*r;
    view.x = avI*view.size;
    view.y = avJ*view.size;
  }
  return view;
}


//attempt to set selected piece to certain index
function selectPiece(game,selfId,i,j) {
  if(i>=0 && i<game.w && j>=0 && j<game.h && game.board[i][j].id == selfId) {
    return {i:i,j:j};
  }
  else { return {i:null,j:null} }
}
