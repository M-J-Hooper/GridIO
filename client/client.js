var socket = io();

var canvas = document.getElementById("canvas");
canvas.style.background = 'rgb(200,200,200)'; //set canvas background
var ctx = canvas.getContext("2d");

var canvasUi = document.getElementById("canvas-ui");
var ctxUi = canvas.getContext("2d");

var game = null;
var selfId = null;
var selected = {i:null,j:null};
var view = {height:0,width:0,size:50,x:0,y:0,fixed:false};

var word = chance.word()
var name = word.charAt(0).toUpperCase() + word.slice(1);
var color = randomColor({luminosity:"dark",format:"rgb"});

socket.on('init',function(data){
  if(data.selfId) { selfId = data.selfId; }

  if(data.game) {
    game = new Game({copy:data.game});
    view = getView(game,selfId,view,false);
  }

  for(var i = 0 ; i < data.players.length; i++){
    game.playerList[data.players[i].id] = new Player({copy:data.players[i]});
  }

  for(var n = 0; n < data.pieces.length; n++) {
    game.board[data.pieces[n].i][data.pieces[n].j] = {id:data.pieces[n].id,prev:{count:0,dx:0,dy:0}};
  }
});

socket.on('update',function(data){
  if(data.pieces.length) {
    for(var n = 0; n < data.pieces.length; n++) {
      var i = data.pieces[n].i;
      var j = data.pieces[n].j;
      game.board[i][j].id = data.pieces[n].id;
      if(data.pieces[n].prev) {
        if(data.pieces[n].prev.count != null) { game.board[i][j].prev.count = data.pieces[n].prev.count; }
        if(data.pieces[n].prev.dx != null) { game.board[i][j].prev.dx = data.pieces[n].prev.dx; }
        if(data.pieces[n].prev.dy != null) { game.board[i][j].prev.dy = data.pieces[n].prev.dy; }
      }
    }

    //decide where the selected piece has moved when the board updates
    var max = {i:null,j:null};
    for(var i = 0; i < game.w; i++) {
  		for(var j = 0; j < game.h; j++) {
        if(game.board[i][j].id) {
          if(i-game.board[i][j].prev.dx == selected.i && j-game.board[i][j].prev.dy == selected.j) {
             if(max.i == null || game.board[i][j].prev.count > game.board[max.i][max.j].prev.count) { max.i = i; max.j = j; }
          }
        }
      }
    }
    if(max.i != null) { selected = selectPiece(game,selfId,max.i,max.j); }
  }

  if(data.players.length) {
    for(var i = 0 ; i < data.players.length; i++){
      game.playerList[data.players[i].id].score = data.players[i].score;
    }
  }
});

socket.on('remove',function(data) {
  for(var i = 0; i < data.players.length; i++) {
    delete game.playerList[data.players[i]];
  }

  for(var n = 0; n < data.pieces.length; n++) {
    game.board[data.pieces[n].i][data.pieces[n].j].id = null;
  }
});

//client side update loop for drawing
setInterval(function(){
  view.width = window.innerWidth;
  view.height = window.innerHeight;
  ctx.canvas.width  = view.width;
  ctx.canvas.height = view.height;

  if(game) {
    game = boardSlide(game);
    view = getView(game,selfId,view,true);

    ctx.clearRect(0,0,view.width,view.height);
    ctxUi.clearRect(0,0,view.width,view.height);

    drawBoard(ctx,game,view,selected);
  }
  if(game && game.playerList[selfId].score > 0) { drawUi(ctxUi,game,view,selfId); }
  else { drawMenu(ctxUi,name,color); }
},40);

document.onkeydown = function(event){
  if(game && game.playerList[selfId].score > 0) {
    if(selected.i != null) {
      if(event.keyCode === 87) { socket.emit('keyPress',{inputId:'up',selected:selected}); } // w
      else if(event.keyCode === 65) { socket.emit('keyPress',{inputId:'left',selected:selected}); } //a
      else if(event.keyCode === 83) { socket.emit('keyPress',{inputId:'down',selected:selected}); }	//s
      else if(event.keyCode === 68) { socket.emit('keyPress',{inputId:'right',selected:selected}); } //d
    }
  } else {
    if(event.keyCode === 67) { color = randomColor({luminosity:"dark",format:"rgb"}); } //c
    else if(event.keyCode === 32) { socket.emit('join',{name:name,color:color}); } //space
    else if(event.keyCode === 78) { //n
      word = chance.word()
      name = word.charAt(0).toUpperCase() + word.slice(1);
    }
  }
}

document.onmousedown = function(event){
  if(game && game.playerList[selfId].score > 0) {
    var offsetX = view.width/2 - view.x;
    var offsetY = view.height/2 - view.y;

    var i = Math.floor((event.clientX-offsetX)/view.size);
    var j = Math.floor((event.clientY-offsetY)/view.size);

    selected = selectPiece(game,selfId,i,j);
  }
  //else { socket.emit('join',{name:name,color:color}); }

  //console.log(JSON.stringify(game));
}
