var WIDTH = 500;
var HEIGHT = 500;
var w = 0;
var h = 0;
var slide = 0;
var squareW = 0;
var squareH = 0;

var leaderboard = [];

var socket = io();

var canvas = document.getElementById("canvas");
canvas.style.background = 'rgb(200,200,200)'; //set canvas background
var ctx = canvas.getContext("2d");


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
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(200,200,200)";

  //draw board design
  ctx.fillStyle = "rgb(255,255,255)";
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      roundRect(i*squareW,j*squareH,squareW,squareH,squareW*0.25,true);
    }
  }

  //draw pieces
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      if(board[i][j].id) {
        if(board[i][j].id == 1) { ctx.fillStyle = "rgba(0,0,0,0.8)"; }
        else { ctx.fillStyle = Player.list[board[i][j].id].color; }

        var x = (i+0.1 - board[i][j].prev.dx*board[i][j].prev.count/slide)*squareW;
        var y = (j+0.1 - board[i][j].prev.dy*board[i][j].prev.count/slide)*squareH;
        roundRect(x,y,squareW*0.8,squareH*0.8,squareW*0.2,true,false);
      }
    }
  }

  //draw selected piece indicator
  if(selected.i != null) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";

    var i = selected.i;
    var j = selected.j;
    var x = (i+0.2 - board[i][j].prev.dx*board[i][j].prev.count/slide)*squareW;
    var y = (j+0.2 - board[i][j].prev.dy*board[i][j].prev.count/slide)*squareH;
    roundRect(x,y,squareW*0.6,squareH*0.6,squareW*0.15,true,false);
  }
}

var drawUI = function(){
  //draw leaderboard
  for(var i = 0; i < leaderboard.length; i++) {
    ctx.fillStyle = Player.list[leaderboard[i][0]].color;
    ctx.fillText((i+1) + ". ::: " + leaderboard[i][0] + " ::: " + leaderboard[i][1],20,20*(i+1));
  }
}

//helper to draw rounded rectangle
function roundRect(x, y, width, height, radius, fill, stroke) {
  if (typeof stroke == 'undefined') { stroke = true; }
  if (typeof radius === 'undefined') { radius = 5; }
  if (typeof radius === 'number') { radius = {tl: radius, tr: radius, br: radius, bl: radius }; }
  else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();

  if (fill) { ctx.fill(); }
  if (stroke) { ctx.stroke(); }
}

//reorder leaderboard based on score
function updateLeaderboard() {
  newBoard = [];
  for(var i in Player.list) { newBoard.push([i,Player.list[i].score]); }
  newBoard.sort(function(a,b) { return a[1] - b[1] });

  leaderboard = newBoard.reverse();
}

//helper function for creating nd arrays
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}
