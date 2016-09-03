var width = 0;
var height = 0;
var w = 0;
var h = 0;
var slide = 0;

var size = 50;
var viewX = 0;
var viewY = 0;
var fontSize = 16;

var leaderboard = [];
var rank = 0;

var socket = io();

var canvas = document.getElementById("canvas");
canvas.style.background = 'rgb(200,200,200)'; //set canvas background
var ctx = canvas.getContext("2d");

var canvasUi = document.getElementById("canvas-ui");
var ctxUi = canvas.getContext("2d");


var Player = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.name = initPack.name;
  self.score = initPack.score;
  self.color = initPack.color;

  Player.list[self.id] = self;

  return self;
}
Player.list = {};

var board = null;
var selfId = null;
var selected = {i:null,j:null};


socket.on('init',function(data){
  if(data.selfId) { selfId = data.selfId; }
  if(data.slide) { slide = data.slide; }

  for(var i = 0 ; i < data.player.length; i++){
    new Player(data.player[i]);
    updateLeaderboard();
  }

  for(var n = 0; n < data.piece.length; n++) {
    board[data.piece[n].i][data.piece[n].j] = {id:data.piece[n].id,prev:{count:0,dx:0,dy:0}};
  }

  if(data.board) {
    if(!board) {
      w = data.board.length;
      h = data.board[0].length;
    }
    board = data.board;

    getView(false);
  }
});

socket.on('update',function(data){
  if(data.piece.length) {
    for(var n = 0; n < data.piece.length; n++) {
      var i = data.piece[n].i;
      var j = data.piece[n].j;
      board[i][j].id = data.piece[n].id;
      if(data.piece[n].prev) {
        if(data.piece[n].prev.count) { board[i][j].prev.count = data.piece[n].prev.count; }
        if(data.piece[n].prev.dx != null) { board[i][j].prev.dx = data.piece[n].prev.dx; }
        if(data.piece[n].prev.dy != null) { board[i][j].prev.dy = data.piece[n].prev.dy; }
      }
    }

    //decide where the selected piece has moved when the board updates
    var max = {i:null,j:null};
    for(var i = 0; i < w; i++) {
  		for(var j = 0; j < h; j++) {
        if(board[i][j].id) {
          if(i-board[i][j].prev.dx == selected.i && j-board[i][j].prev.dy == selected.j) {
             if(!max.i || board[i][j].prev.count > board[max.i][max.j].prev.count) { max.i = i; max.j = j; }
          }
        }
      }
    }
    if(max.i) { selectPiece(max.i,max.j); }
  }
  for(var i = 0 ; i < data.player.length; i++){
    Player.list[data.player[i].id].score = data.player[i].score;
  }
  if(data.player.length) { updateLeaderboard(); }
});

socket.on('remove',function(data){
  if(data.board) board = data.board;

  for(var i = 0; i < data.player.length; i++) {
    delete Player.list[data.player[i]];
  }
  updateLeaderboard();

  for(var n = 0; n < data.piece.length; n++) {
    board[data.piece[n].i][data.piece[n].j].id = null;
  }
});

//client side update loop for drawing
setInterval(function(){
  width = window.innerWidth;
  height = window.innerHeight;
  ctx.canvas.width  = width;
  ctx.canvas.height = height;

  if(!selfId || !board) return;


  boardSlide();
  getView(true);

  ctx.clearRect(0,0,width,height);
  drawBoard(ctx,width,height,size,viewX,viewY,Player.list,board);
  drawUi(ctx,width,height,size,viewX,viewY,Player.list,board,fontSize,leaderboard,rank,selfId);
},40);

//client side sliding
function boardSlide() {
  for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
			if(board[i][j].prev.count > 0) { board[i][j].prev.count--; }
    }
  }
}

//get info on own pieces for size and view
function getView(smooth) {
  var minI, maxI, minJ, maxJ;
  var first = true;
  var count = 0;

  var avI = 0;
  var avJ = 0;

  for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
      if(board[i][j].id == selfId) {
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
  avI = avI/count;
  avJ = avJ/count;

  var viewDist = Math.sqrt(count)+2;
  var playerSizeX = (maxI - minI + 1)*size;
  var playerSizeY = (maxJ - minJ + 1)*size;
  var r = Math.min(width/(playerSizeX+viewDist*size*2),height/(playerSizeY+viewDist*size*2));

  if(smooth) {
    var viewSmooth = 100;

    size += size*(r-1)/viewSmooth;

    viewX += (avI*size - viewX)/viewSmooth;
    viewY += (avJ*size - viewY)/viewSmooth;
  }
  else {
    size  = size*r;

    viewX = avI*size;
    viewY = avJ*size;
  }
}

//reorder leaderboard based on score
function updateLeaderboard() {
  newBoard = [];
  for(var i in Player.list) { newBoard.push({id:i,name:Player.list[i].name,score:Player.list[i].score,rank:0}); }
  newBoard.sort(function(a,b) { return a.score - b.score });
  leaderboard = newBoard.reverse();

  var prevRank = 1;
  var prevScore = 0;
  for(var i = 0; i < leaderboard.length; i++) {
    if(leaderboard[i].score != prevScore) { prevRank = i+1; }
    prevScore = leaderboard[i].score;
    leaderboard[i].rank = prevRank;

    if(leaderboard[i].id == selfId) { rank = prevRank; }
  }
}

document.onkeyup = function(event){
  if(selected.i != null) {
    if(event.keyCode === 68)	//d
      socket.emit('keyPress',{inputId:'right',selected:selected});
    else if(event.keyCode === 83)	//s
      socket.emit('keyPress',{inputId:'down',selected:selected});
    else if(event.keyCode === 65) //a
      socket.emit('keyPress',{inputId:'left',selected:selected});
    else if(event.keyCode === 87) // w
      socket.emit('keyPress',{inputId:'up',selected:selected});
  }
}

document.onmouseup = function(event){
  var offsetX = width/2 - viewX;
  var offsetY = height/2 - viewY;

  var i = Math.floor((event.clientX-offsetX)/size);
  var j = Math.floor((event.clientY-offsetY)/size);

  selectPiece(i,j);
  //console.log(JSON.stringify());
}

//attempt to set selected piece to certain index
function selectPiece(i,j) {
  if(i>=0 && i<w && j>=0 && j<h && board[i][j].id == selfId) {
    selected.i = i;
    selected.j = j;
  }
  else {
    selected.i = null;
    selected.j = null;
  }
}
