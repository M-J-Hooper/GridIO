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
  drawBoard();
  drawUi();
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
      roundRect(ctx,i*size+offsetX,j*size+offsetY,size,size,size*0.25,true,true);
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
        roundRect(ctx,x+offsetX,y+offsetY,size*0.8,size*0.8,size*0.2,true,false);
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
    roundRect(ctx,x+offsetX,y+offsetY,size*0.6,size*0.6,size*0.15,true,false);
  }
}

var drawUi = function() {
  ctxUi.font = fontSize + "px bolder sans-serif";

  //draw leaderboard
  var leaderLength = leaderboard.length < 10 ? leaderboard.length : 10;

  //draw leaderboard outlines in top left
  ctxUi.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctxUi, 10, 10, 200, 30+(fontSize+20)*leaderLength, 20, true, false);
  ctxUi.fillStyle = "rgb(255,255,255)";
  roundRect(ctxUi, 20, 20, 180, 10+(fontSize+20)*leaderLength, 10, true, false);

  //draw each player in top 10 with text
  for(var i = 0; i < leaderLength; i++) {
    ctxUi.fillStyle = Player.list[leaderboard[i].id].color;
    roundRect(ctxUi, 30, 30+i*(fontSize+20), 160, 10+fontSize, (10+fontSize)*0.2, true, false);

    ctxUi.fillStyle = "rgb(255,255,255)";
    ctxUi.textAlign = "left";
    ctxUi.fillText(leaderboard[i].rank + ".", 35, 35+(i+1)*fontSize+i*20 - 2);
    ctxUi.fillText(leaderboard[i].name, 55, 35+(i+1)*fontSize+i*20 - 2);
    ctxUi.textAlign = "right";
    ctxUi.fillText(leaderboard[i].score, 185, 35+(i+1)*fontSize+i*20 - 2);
  }

  //draw info outline and text in bottom left
  ctxUi.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctxUi, 10, height - (fontSize+60), 300, 50+fontSize, 20, true, false);
  ctxUi.fillStyle = "rgb(255,255,255)";
  roundRect(ctxUi, 20, height - (fontSize+50), 280, 30+fontSize, 10, true, false);
  ctxUi.fillStyle = Player.list[selfId].color;
  roundRect(ctxUi, 30, height - (fontSize+40), 260, 10+fontSize, (10+fontSize)*0.2, true, false);

  ctxUi.fillStyle = "rgb(255,255,255)";
  ctxUi.textAlign = "left";
  ctxUi.fillText(Player.list[selfId].name, 35, height - 35 - 2);
  ctxUi.textAlign = "center";
  ctxUi.fillText("Score: " + Player.list[selfId].score, 150, height - 35 - 2);
  ctxUi.textAlign = "right";
  ctxUi.fillText("Rank: " + rank + "/" + leaderboard.length, 285, height - 35 - 2);
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

//helper to draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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

  if(fill) { ctx.fill(); }
  if(stroke) { ctx.stroke(); }
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

//helper for converting rgb to rgba
function makeAlpha(rgb,alpha) {
  return rgb.replace(')', ', ' + alpha + ')').replace('rgb', 'rgba');
}
