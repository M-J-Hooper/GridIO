var width = 0;
var height = 0;
var w = 0;
var h = 0;
var slide = 0;

var size = 50;
var viewX = 0;
var viewY = 0;

var viewSmooth = 100;
var viewDist = 4;

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
    selected.j += dy;
  }
}

document.onmouseup = function(event){
  var offsetX = width/2 - viewX;
  var offsetY = height/2 - viewY;

  var i = Math.floor((event.clientX-offsetX)/size);
  var j = Math.floor((event.clientY-offsetY)/size);
  if(i>=0 && i<w && j>=0 && j<h && board[i][j].id == selfId) {
    selected.i = i;
    selected.j = j;
  }
  else {
    selected.i = null;
    selected.j = null;
  }
}

//client side update loop for drawing
setInterval(function(){
  if(!selfId || !board) return;

  width = window.innerWidth;
  height = window.innerHeight;
  ctx.canvas.width  = width;
  ctx.canvas.height = height;

  boardSlide();
  getView();

  ctx.clearRect(0,0,width,height);
  drawBoard();
  drawUI();
},40);

//get info on own pieces for size and view
function getView() {
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

  var playerSizeX = (maxI - minI + 1)*size;
  var playerSizeY = (maxJ - minJ + 1)*size;
  console.log(playerSizeX/size,playerSizeX/size+viewDist*2);
  var r = Math.min(width/(playerSizeX+viewDist*size*2),height/(playerSizeY+viewDist*size*2));
  size += size*(r-1)/viewSmooth;


  avI = avI/count;
  avJ = avJ/count;
  viewX += (avI*size - viewX)/viewSmooth;
  viewY += (avJ*size - viewY)/viewSmooth;
}

//client side sliding
function boardSlide() {
  for(var i = 0; i < w; i++) {
		for(var j = 0; j < h; j++) {
			if(board[i][j].prev.count > 0) { board[i][j].prev.count--; }
    }
  }
}

var drawBoard = function(){
  var offsetX = width/2 - viewX;
  var offsetY = height/2 - viewY;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(200,200,200)";

  //draw board design
  //rounded edges on tiles (slow round rect function)
  /*ctx.fillStyle = "rgb(255,255,255)";
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      roundRect(i*size+offsetX,j*size+offsetY,size,size,size*0.25,true,true);
    }
  }*/

  //more efficient board style
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(offsetX,offsetY,size*w,size*h);
  for(var i = 1; i < w; i++) {
    ctx.beginPath();
    ctx.moveTo(i*size+offsetX,offsetY);
    ctx.lineTo(i*size+offsetX,(w+1)*size+offsetY);
    ctx.stroke();
  }
  for(var j = 1; j < h; j++) {
    ctx.beginPath();
    ctx.moveTo(offsetX,j*size+offsetY);
    ctx.lineTo((h+1)*size+offsetX,j*size+offsetY);
    ctx.stroke();
  }


  //draw pieces
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      if(board[i][j].id) {
        if(board[i][j].id == 1) { ctx.fillStyle = "rgba(0,0,0,0.8)"; }
        else { ctx.fillStyle = Player.list[board[i][j].id].color; }

        var x = (i+0.1 - board[i][j].prev.dx*board[i][j].prev.count/slide)*size;
        var y = (j+0.1 - board[i][j].prev.dy*board[i][j].prev.count/slide)*size;
        roundRect(x+offsetX,y+offsetY,size*0.8,size*0.8,size*0.2,true,false);
      }
    }
  }

  //draw selected piece indicator
  if(selected.i != null) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";

    var i = selected.i;
    var j = selected.j;
    var x = (i+0.2 - board[i][j].prev.dx*board[i][j].prev.count/slide)*size;
    var y = (j+0.2 - board[i][j].prev.dy*board[i][j].prev.count/slide)*size;
    roundRect(x+offsetX,y+offsetY,size*0.6,size*0.6,size*0.15,true,false);
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
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
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
