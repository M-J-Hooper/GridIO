var socket = io();

var canvas = $("#canvas");
var ctx = canvas[0].getContext("2d");


var game = null;
var selfId = null;
var selected = {i:null,j:null};
var view = {height:0,width:0,size:50,x:0,y:0,fixed:false};

socket.on('init',function(data){
  for(var i = 0 ; i < data.players.length; i++){
    game.playerList[data.players[i].id] = new Player({copy:data.players[i]});
  }
  if(data.players.length) { updateUi(game,view,selfId); }

  for(var n = 0; n < data.pieces.length; n++) {
    game.board[data.pieces[n].i][data.pieces[n].j] = {id:data.pieces[n].id,prev:{count:0,dx:0,dy:0}};
  }
});

socket.on('update',function(data) {

  //unpack piece updates
  if(data.pieces.length) {
    var ownPieces = false;
    for(var n = 0; n < data.pieces.length; n++) {
      var i = data.pieces[n].i;
      var j = data.pieces[n].j;
      game.board[i][j].id = data.pieces[n].id;
      if(data.pieces[n].prev) {
        if(data.pieces[n].prev.count != null) {
          if(!ownPieces && data.pieces[n].id == selfId) { ownPieces = true; } //only need to move selected if your pieces move
          game.board[i][j].prev.count = data.pieces[n].prev.count;
        }
        if(data.pieces[n].prev.dx != null) { game.board[i][j].prev.dx = data.pieces[n].prev.dx; }
        if(data.pieces[n].prev.dy != null) { game.board[i][j].prev.dy = data.pieces[n].prev.dy; }
      }
    }

    //decide where the selected piece should be moved
    if(ownPieces) {
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
  }

  //unpack player updates
  if(data.players.length) {
    for(var i = 0 ; i < data.players.length; i++){
      game.playerList[data.players[i].id].score = data.players[i].score;
    }
  }
  if(data.players.length) { updateUi(game,view,selfId); } //leadboard only changes on player updates
});


socket.on('remove',function(data) {
  //unpack removed players
  for(var i = 0; i < data.players.length; i++) {
    delete game.playerList[data.players[i]];
  }
  if(data.players.length) { updateUi(game,view,selfId); }

  //unpack changes to removed players' pieces
  for(var n = 0; n < data.pieces.length; n++) {
    game.board[data.pieces[n].i][data.pieces[n].j].id = data.pieces[n].id;
  }
});

//client side update loop for drawing
setInterval(function(){
  //canvas matched to window size
  view.width = window.innerWidth;
  view.height = window.innerHeight;

  ctx.canvas.width  = view.width;
  ctx.canvas.height = view.height;

  if(game) { //view board even when score goes to zero
    game.boardSlide();
    view = getView(game,selfId,view,true);

    ctx.clearRect(0,0,view.width,view.height);
    drawBoard(ctx,game,view,selected);
  }

  //transition between menu when game starts/ends (BETTER WAY!!!)
  if(!game || game.playerList[selfId].score == 0) { $("#menu").show(); $("#ui").hide(); }
},40);

//send move when a valid piece is selected and wasd pressed
document.onkeydown = function(event){
  if(game && game.playerList[selfId].score > 0) {
    if(selected.i != null) {
      var dx = 0;
      var dy = 0;
      if(event.keyCode === 87) { dy = -1; } // w
      else if(event.keyCode === 65) { dx = -1; } //a
      else if(event.keyCode === 83) { dy = 1; }	//s
      else if(event.keyCode === 68) { dx = 1; } //d

      if(dx || dy) { socket.emit('move',{i:selected.i,j:selected.j,dx:dx,dy:dy}); }
    }
  }
}

//try to select a piece on mouse click
document.onmousedown = function(event) {
  if(game && game.playerList[selfId].score > 0) {
    var offsetX = view.width/2 - view.x;
    var offsetY = view.height/2 - view.y;

    var i = Math.floor((event.clientX-offsetX)/view.size);
    var j = Math.floor((event.clientY-offsetY)/view.size);

    selected = selectPiece(game,selfId,i,j);
  }
  //console.log(JSON.stringify(game));
}

//try to select a piece on touch of a screen
document.addEventListener("touchstart", function(event) {
  //event.preventDefault();
  //event.stopPropagation();

  if(game && game.playerList[selfId].score > 0) {
    var offsetX = view.width/2 - view.x;
    var offsetY = view.height/2 - view.y;

    var touch = event.touches[0];
    var i = Math.floor((touch.clientX-offsetX)/view.size);
    var j = Math.floor((touch.clientY-offsetY)/view.size);

    selected = selectPiece(game,selfId,i,j);
  }
}, false);

//if valid selection, send move in direction of drag on touch screen
document.addEventListener("touchmove", function(event) {
  event.preventDefault();
  event.stopPropagation();
  if(game && game.playerList[selfId].score > 0) {

    if(selected.i != null) {
      var offsetX = view.width/2 - view.x;
      var offsetY = view.height/2 - view.y;

      var touch = event.touches[0];
      var diffI = Math.floor((touch.clientX-offsetX)/view.size) - selected.i;
      var diffJ = Math.floor((touch.clientY-offsetY)/view.size) - selected.j;
      var dx = 0;
      var dy = 0;
      if(Math.abs(diffI) > Math.abs(diffJ)) { dx = Math.sign(diffI); }
      else { dy = Math.sign(diffJ); }

      if(dx || dy) { socket.emit('move',{i:selected.i,j:selected.j,dx:dx,dy:dy}); }
    }
  }
}, false);

//remove selection when touch is released on screen
document.addEventListener("touchend", function(event) {
  //event.preventDefault();
  //event.stopPropagation();

  selected = {i:null,j:null};
}, false);

//send for games then update html
getGames = function() {
  socket.emit('browse',"",function(gameList) {
    var array = [];
    for(var v in gameList) {
      array.push(gameList[v].game);
    }
    updateBrowser(array,socket, name, color);
  });
}

joinGame = function(createId,joinId) {
  socket.emit('join',{name:name,color:color,createId:createId,joinId:joinId}, function(joinedGame,playerId) {
    selfId = playerId;
    if(joinedGame) {
      game = new Game({copy:joinedGame});
      view = getView(game,selfId,view,false);

      $("#browse").hide(); $("#create").hide(); $("#join").hide();
      $("#start").show();
      $("#menu").hide();
      $("#ui").show();
    }
  });
}

leaveGame = function() {

}

var word = chance.word()
var name = word.charAt(0).toUpperCase() + word.slice(1);
setName = function() {
  if($("#name").val()) { name = $("#name").val().substring(0,15); }
}

var color = randomColor({luminosity:"dark",format:"rgb"});
setColor = function(newColor) {
  $("#name").css("background",newColor);
  color = newColor;
}

//menu clicks and transitions

$("#ui").hide();
$("#settings").hide();
$("#rules").hide();
$("#browse").hide();
$("#create").hide();
$("#join").hide();

$("#name").focus();

updateColors();
$("#more-colors").click(function() { updateColors(); });

$("#go-rules").click(function() { $("#start").hide(); $("#rules").show(); });
$("#rules-back").click(function() { $("#start").show(); $("#rules").hide(); });

$("#go-browse").click(function() { getGames(); setName(); $("#start").hide(); $("#browse").show(); });
$("#browse-refresh").click(function() { getGames(); });
$("#browse-back").click(function() { $("#start").show(); $("#browse").hide(); });

var code;
$("#go-create").click(function() { $("#start").hide(); $("#create").show(); setName(); code = Math.random(); $("#get-code").text((""+code).substring(2)); });
$("#create-create").click(function() { joinGame(code,null); });
$("#create-back").click(function() { $("#start").show(); $("#create").hide(); });

$("#go-join").click(function() { $("#start").hide(); $("#join").show(); setName(); $("#put-code").focus(); });
$("#join-join").click(function() { joinGame(null,parseFloat("0."+$("#put-code").val())); });
$("#join-back").click(function() { $("#start").show(); $("#join").hide(); });

$("#play").click(function() { setName(); joinGame(null,null); });

$("#go-settings").click(function() {
  if($("#settings").is(":visible")) { $("#settings").hide(); }
  else { $("#settings").show(); }
});
$("#settings-continue").click(function() { $("#settings").hide(); });
$("#settings-leave").click(function() { socket.emit('leave'); game = null; $("#settings").hide(); });
