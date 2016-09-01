var WIDTH = 500;
var HEIGHT = 500;
var w = 0;
var h = 0;
var slide = 0;
var squareW = 0;
var squareH = 0;

var leaderboard = [];

var socket = io();

var ctx = document.getElementById("ctx").getContext("2d");

var Player = function(initPack){
  var self = {};
  self.id = initPack.id;
  self.score = initPack.score;
  self.color = initPack.color;

  Player.list[self.id] = self;

  return self;
}
Player.list = {};

var Board = function(w,h){
	var self = createArray(w,h)

	return self;
}

var board = null;
var selfId = null;
var selected = {i:null,j:null};


socket.on('init',function(data){
  if(data.selfId) { selfId = data.selfId; }
  if(data.slide) { slide = data.slide; }
  if(data.board) {
    if(!board) {
      w = data.board.length;
      h = data.board[0].length;
      squareW = WIDTH/w;
      squareH = HEIGHT/h;
    }
    board = data.board;
  }

  for(var i = 0 ; i < data.player.length; i++){
    new Player(data.player[i]);
    updateLeaderboard();
  }
});

socket.on('update',function(data){
  if(data.board) { board = data.board; }

  for(var i = 0 ; i < data.player.length; i++){
    new Player(data.player[i]);
  }
  if(data.player.length > 0) { updateLeaderboard(); }
});

socket.on('remove',function(data){
  if(data.board) board = data.board;

  for(var i = 0 ; i < data.player.length; i++){
    delete Player.list[data.player[i]];
  }
  updateLeaderboard();
});

document.onkeyup = function(event){
  if(selected.i != null) {
    if(event.keyCode === 68)	//d
      socket.emit('keyPress',{inputId:'right',selected:selected},keyPressResponse);
    else if(event.keyCode === 83)	//s
      socket.emit('keyPress',{inputId:'down',selected:selected},keyPressResponse);
    else if(event.keyCode === 65) //a
      socket.emit('keyPress',{inputId:'left',selected:selected},keyPressResponse);
    else if(event.keyCode === 87) // w
      socket.emit('keyPress',{inputId:'up',selected:selected},keyPressResponse);
  }
}

//needs fix for weird behavior (not synched properly?!)
function keyPressResponse(ok,dx,dy) {
  if(ok && board[selected.i+dx][selected.j+dy].id == selfId) {
    selected.i += dx;
    selected.j +=dy;
  }
}

document.onmouseup = function(event){
  var i = Math.floor(event.clientX/squareW);
  var j = Math.floor(event.clientY/squareH);
  if(i>=0 && i<w && j>=0 && j<h && board[i][j].id == selfId) {
    selected.i = i;
    selected.j = j;
  }
  else {
    selected.i = null;
    selected.j = null;
  }

  console.log(JSON.stringify(selected));
}

setInterval(function(){
  if(!selfId || !board) return;

  for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
			if(board[i][j].prev.count > 0) { board[i][j].prev.count--; }
		}
	}

  ctx.clearRect(0,0,WIDTH,HEIGHT);
  drawBoard();
  drawUI();
},40);

var drawBoard = function(){
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      if(board[i][j].id) {
        if(board[i][j].id == 1) { ctx.fillStyle = "rgba(0,0,0,0.8)"; }
        else { ctx.fillStyle = Player.list[board[i][j].id].color; }

        var x = (i - board[i][j].prev.dx*board[i][j].prev.count/slide)*squareW;
        var y = (j - board[i][j].prev.dy*board[i][j].prev.count/slide)*squareH;
        ctx.fillRect(x,y,squareW,squareH);
      }
    }
  }

  if(selected.i != null) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";

    var i = selected.i;
    var j = selected.j;
    var x = (i+0.25 - board[i][j].prev.dx*board[i][j].prev.count/slide)*squareW;
    var y = (j+0.25 - board[i][j].prev.dy*board[i][j].prev.count/slide)*squareH;
    ctx.fillRect(x,y,squareW/2,squareH/2);
  }

  for(var i = 0; i <= w; i++) {
    ctx.beginPath();
    ctx.moveTo(squareW*i,0);
    ctx.lineTo(squareW*i,HEIGHT);
    ctx.closePath();
    ctx.stroke();
  }

  for(var j = 0; j <= h; j++) {
    ctx.beginPath();
    ctx.moveTo(0,squareH*j);
    ctx.lineTo(WIDTH,squareH*j);
    ctx.closePath();
    ctx.stroke();
  }
}

var drawUI = function(){
  for(var i = 0; i < leaderboard.length; i++) {
    ctx.fillStyle = Player.list[leaderboard[i][0]].color;
    ctx.fillText((i+1) + ". ::: " + leaderboard[i][0] + " ::: " + leaderboard[i][1],20,20*(i+1));
  }
}

function updateLeaderboard() {
  newBoard = [];
  for(var i in Player.list) { newBoard.push([i,Player.list[i].score]); }
  newBoard.sort(function(a,b) { return a[1] - b[1] });

  leaderboard = newBoard.reverse();
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
