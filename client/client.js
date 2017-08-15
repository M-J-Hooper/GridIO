/*global $, io, classes, common, draw, helper, randomColor, chance*/

(function($, io, classes, common, draw, helper, randomColor, chance) {
  
  var socket = io();
  
  var canvas = $("#canvas");
  var ctx = canvas[0].getContext("2d");
  
  
  var game = null;
  var selfId = null;
  var selected = {i:null,j:null};
  var view = {height:0,width:0,size:1,x:0,y:0,offsetX:0,offsetY:0,minI:0,maxI:0,minJ:0,maxJ:0};
  
  
  ///////////////////////////////////////////////////////////////////////
  //Main client update loop
  ///////////////////////////////////////////////////////////////////////
  
  //client side update loop for drawing
  setInterval(function(){
    //canvas matched to window size
    view.width = window.innerWidth;
    view.height = window.innerHeight;
  
    ctx.canvas.width  = view.width;
    ctx.canvas.height = view.height;
  
    if(game) { //view board even when score goes to zero
      game.boardSlide(view);
      view = draw.getView(game,selfId,view,true);
  
      //bring up lose screen on zero score
      if(!game.playerList[selfId].score) {
        $("#leaderboard").hide();
        $("#info").hide();
        $("#go-settings").hide();
        $("#settings").hide();
        $("#lose").show();
      }
  
      ctx.clearRect(0,0,view.width,view.height);
      draw.drawBoard(ctx,game,view,selected);
    }
  },40);
  
  
  ///////////////////////////////////////////////////////////////////////
  //Socket listeners and emitters
  ///////////////////////////////////////////////////////////////////////
  
  function joinGame(createData,joinId) {
    socket.emit('join',{name:name,color:randomColor({luminosity: 'dark'}),createData:createData,joinId:joinId}, function(joinedGame,playerId) {
      selfId = playerId;
      if(joinedGame) {
        game = new classes.Game({copy:joinedGame});
        view.maxI = game.l-1; view.maxJ = game.l-1;
        view = draw.getView(game,selfId,view,false);
  
        $("#browse").hide(); $("#create").hide(); $("#join").hide();
        $("#other").show();
        $("#menu").hide();
  
        $("#lose").hide(); $("#settings").hide(); $("#go-settings").show();
        $("#ui").show(); $("#leaderboard").show(); $("#info").show();
      }
    });
  }
  
  function leaveGame() {
    //emit leave game and get some callback to end client game
    socket.emit('leave');
    game = null;
  
    $("#settings").hide();
    $("#lose").hide();
    $("#go-settings").show();
    $("#ui").hide();
    $("#menu").show();
  }
  
  socket.on('init',function(data){
    for(var i = 0 ; i < data.players.length; i++){
      game.playerList[data.players[i].id] = new classes.Player({copy:data.players[i]});
    }
    if(data.players.length) { helper.updateUi(game,view,selfId); }
  
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
        for(var i = 0; i < game.l; i++) {
      		for(var j = 0; j < game.l; j++) {
            if(game.board[i][j].id) {
              if(i-game.board[i][j].prev.dx == selected.i && j-game.board[i][j].prev.dy == selected.j) {
                 if(max.i == null || game.board[i][j].prev.count > game.board[max.i][max.j].prev.count) { max.i = i; max.j = j; }
              }
            }
          }
        }
        if(max.i != null) { selected = common.selectPiece(game,selfId,max.i,max.j); }
      }
    }
  
    //unpack player updates
    if(data.players.length) {
      for(var i = 0 ; i < data.players.length; i++){
        game.playerList[data.players[i].id].score = data.players[i].score;
      }
    }
    if(data.players.length) { helper.updateUi(game,view,selfId); } //leadboard only changes on player updates
  });
  
  
  socket.on('remove',function(data) {
    //unpack removed players
    for(var i = 0; i < data.players.length; i++) {
      delete game.playerList[data.players[i]];
    }
    if(data.players.length) { helper.updateUi(game,view,selfId); }
  
    //unpack changes to removed players' pieces
    for(var n = 0; n < data.pieces.length; n++) {
      game.board[data.pieces[n].i][data.pieces[n].j].id = data.pieces[n].id;
    }
  });
  
  
  ///////////////////////////////////////////////////////////////////////
  //User input event handlers
  ///////////////////////////////////////////////////////////////////////
  
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
      var i = Math.floor((event.clientX-view.offsetX)/view.size);
      var j = Math.floor((event.clientY-view.offsetY)/view.size);
  
      selected = common.selectPiece(game,selfId,i,j);
    }
  }
  
  //try to select a piece on touch of a screen
  document.addEventListener("touchstart", function(event) {
    //event.preventDefault();
    //event.stopPropagation();
  
    if(game && game.playerList[selfId].score > 0) {
      var touch = event.touches[0];
      var i = Math.floor((touch.clientX-view.offsetX)/view.size);
      var j = Math.floor((touch.clientY-view.offsetY)/view.size);
  
      selected = common.selectPiece(game,selfId,i,j);
    }
  }, false);
  
  //if valid selection, send move in direction of drag on touch screen
  document.addEventListener("touchmove", function(event) {
    if(game && game.playerList[selfId].score > 0) {
      event.preventDefault();
      event.stopPropagation();
  
      if(selected.i != null) {
        var touch = event.touches[0];
        var diffI = Math.floor((touch.clientX-view.offsetX)/view.size) - selected.i;
        var diffJ = Math.floor((touch.clientY-view.offsetY)/view.size) - selected.j;
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
  
  
  
  ///////////////////////////////////////////////////////////////////////
  //Menu navigation and logic
  ///////////////////////////////////////////////////////////////////////
  
  //send for games then update html
  function getGames() {
    socket.emit("browse","",function(gameList) {
      var array = [];
      for(var v in gameList) {
        array.push(gameList[v].game);
      }
      draw.updateBrowser(array,socket, name, color);
    });
  }
  
  var word = chance.word()
  var name = word.charAt(0).toUpperCase() + word.slice(1);
  $("#name").change(function() {
    if($("#name").val()) { name = $("#name").val().substring(0,15); $("#name").val(name); }
    else {
      var word = chance.word()
      name = word.charAt(0).toUpperCase() + word.slice(1);
    }
  });
  
  var color = randomColor({luminosity:"dark",format:"rgb"});
  function setColor(newColor) {
    $("#name").css("background",newColor);
    color = newColor;
  }
  
  //menu clicks and transitions
  
  $("#ui").hide();
  $("#settings").hide();
  $("#lose").hide();
  $("#rules").hide();
  $("#browse").hide();
  $("#create").hide();
  $("#join").hide();
  
  $("#name").focus();
  
  var touch = helper.mobileTabletCheck();
  if(touch) { $("#rules-pc").hide(); }
  else { $("#rules-touch").hide(); }
  $("#go-rules").click(function() { $("#other-sub").hide(); $("#rules").show(); });
  $("#rules-back").click(function() { $("#other-sub").show(); $("#rules").hide(); });
  
  $("#go-browse").click(function() { getGames(); $("#other").hide(); $("#browse").show(); });
  $("#browse-refresh").click(function() { getGames(); });
  $("#browse-back").click(function() { $("#other").show(); $("#browse").hide(); });
  
  var code;
  var pub = true;
  var l = 20;
  $("#go-create").click(function() { $("#other").hide(); $("#create").show(); code = Math.random(); $("#get-code").text((""+code).substring(2)); });
  $("#create-20").click(function() { l = 20; $("#create-20").addClass("light"); $("#create-50").removeClass("light"); $("#create-100").removeClass("light"); $("#create-200").removeClass("light"); });
  $("#create-50").click(function() { l = 50; $("#create-20").removeClass("light"); $("#create-50").addClass("light"); $("#create-100").removeClass("light"); $("#create-200").removeClass("light"); });
  $("#create-100").click(function() { l = 100; $("#create-20").removeClass("light"); $("#create-50").removeClass("light"); $("#create-100").addClass("light"); $("#create-200").removeClass("light"); });
  $("#create-200").click(function() { l = 200; $("#create-20").removeClass("light"); $("#create-50").removeClass("light"); $("#create-100").removeClass("light"); $("#create-200").addClass("light"); });
  $("#create-public").click(function() { pub = true; $("#create-public").addClass("light"); $("#create-private").removeClass("light"); });
  $("#create-private").click(function() { pub = false; $("#create-public").removeClass("light"); $("#create-private").addClass("light"); });
  $("#create-create").click(function() { joinGame({createId:code,l:l,pub:pub}, null); });
  $("#create-back").click(function() { $("#other").show(); $("#create").hide(); });
  
  $("#go-join").click(function() { $("#other").hide(); $("#join").show(); $("#put-code").focus(); });
  $("#join-join").click(function() { joinGame(null,parseFloat("0."+$("#put-code").val())); });
  $("#join-back").click(function() { $("#other").show(); $("#join").hide(); });
  
  $("#play").click(function() { joinGame(null,null); });
  
  $("#go-settings").click(function() { $("#settings").show(); $("#go-settings").hide() });
  $("#settings-continue").click(function() { $("#settings").hide(); $("#go-settings").show(); });
  $("#settings-leave").click(function() { leaveGame(); });
  
  $("#lose-play").click(function() { joinGame(null,game.id); });
  $("#lose-leave").click(function() { leaveGame(); });
  
  
})($, io, classes, common, draw, helper, randomColor, chance);
