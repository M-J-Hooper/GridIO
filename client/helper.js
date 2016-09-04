if(typeof module != 'undefined') {
  module.exports = function() {
    this.createArray = createArray;
    this.boardSlide = boardSlide;
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
