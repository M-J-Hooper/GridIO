var WIDTH = 500;
var HEIGHT = 500;
var w = 0;
var h = 0;
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

setInterval(function(){
  if(!selfId || !board) return;

  ctx.clearRect(0,0,WIDTH,HEIGHT);
  drawBoard();
  drawUI();
},40);

var drawBoard = function(){
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      if(board[i][j]) {
        if(board[i][j] == 1) { ctx.fillStyle = "black"; }
        else { ctx.fillStyle = Player.list[board[i][j]].color; }
        ctx.fillRect(i*squareW,j*squareH,squareW,squareH);
      }
    }
  }

  if(selected.i != null) {
    ctx.fillStyle = "white";
    ctx.fillRect((selected.i+0.25)*squareW,(selected.j+0.25)*squareH,squareW/2,squareH/2);
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

document.onkeydown = function(event){
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
  if(ok && board[selected.i+dx][selected.j+dy] == selfId) {
    selected.i += dx;
    selected.j +=dy;
  }
}

document.onmouseup = function(event){
  var i = Math.floor(event.clientX/squareW);
  var j = Math.floor(event.clientY/squareH);
  if(i>=0 && i<w && j>=0 && j<h && board[i][j] == selfId) {
    selected.i = i;
    selected.j = j;
  }
  else {
    selected.i = null;
    selected.j = null;
  }

  console.log(JSON.stringify(selected));
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
