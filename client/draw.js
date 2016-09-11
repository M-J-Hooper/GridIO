var mobile = mobileCheck();

//draw board lines, pieces and selection on canvas
function drawBoard(ctx,game,view,selected) {
  var offsetX = view.width/2 - view.x;
  var offsetY = view.height/2 - view.y;

  ctx.lineWidth = view.size*0.05;
  ctx.strokeStyle = "rgb(200, 200, 200)";

  //draw board design
  //rounded edges on tiles (slow due to round rect function)
  /*ctx.fillStyle = "rgb(255,255,255)";
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      roundRect(ctx,i*size+offsetX,j*size+offsetY,size,size,size*0.25,true,true);
    }
  }*/

  //more efficient board style
  ctx.fillStyle = "white";
  ctx.fillRect(offsetX,offsetY,view.size*game.w,view.size*game.h);
  for(var i = 1; i < game.w; i++) {
    ctx.beginPath();
    ctx.moveTo(i*view.size+offsetX,offsetY);
    ctx.lineTo(i*view.size+offsetX,(game.w+1)*view.size+offsetY);
    ctx.stroke();
  }
  for(var j = 1; j < game.h; j++) {
    ctx.beginPath();
    ctx.moveTo(offsetX,j*view.size+offsetY);
    ctx.lineTo((game.h+1)*view.size+offsetX,j*view.size+offsetY);
    ctx.stroke();
  }


  //draw pieces
  for(var i = 0; i < game.w; i++) {
    for(var j = 0; j < game.h; j++) {
      if(game.board[i][j].id) {
        if(game.board[i][j].id == 1) { ctx.fillStyle = "rgb(64, 64, 64)"; }
        else { ctx.fillStyle = game.playerList[game.board[i][j].id].color; }

        var x = (i+0.1 - game.board[i][j].prev.dx*game.board[i][j].prev.count/game.slide)*view.size;
        var y = (j+0.1 - game.board[i][j].prev.dy*game.board[i][j].prev.count/game.slide)*view.size;
        roundRect(ctx,x+offsetX,y+offsetY,view.size*0.8,view.size*0.8,view.size*0.2,true,false);
      }
    }
  }

  //draw selected piece indicator
  if(selected.i != null) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";

    var i = selected.i;
    var j = selected.j;
    var x = (i+0.2 - game.board[i][j].prev.dx*game.board[i][j].prev.count/game.slide)*view.size;
    var y = (j+0.2 - game.board[i][j].prev.dy*game.board[i][j].prev.count/game.slide)*view.size;
    roundRect(ctx,x+offsetX,y+offsetY,view.size*0.6,view.size*0.6,view.size*0.15,true,false);
  }
}

//update html of leaderboard and info bar after player update
function updateUi(game,view,selfId) {
  var leaderboard = game.getLeaderboard();
  var rank = 0;
  for(var i = 0; i < leaderboard.length; i++) {
    if(leaderboard[i].id == selfId) { rank = leaderboard[i].rank; }
  }

  $("#info .blob").css("background", game.playerList[selfId].color);
  $("#info .text-left").text(name);
  $("#info .text-center").text("Score:"+game.playerList[selfId].score);
  $("#info .text-right").text("Rank:"+rank+"/"+leaderboard.length);

  $("#leaderboard .inner").html("");
  var leaderLength = leaderboard.length < 10 ? leaderboard.length : 10;
  for(var i = 0; i < leaderLength; i++) {
    $("<div>", {
      class: "blob",
      html: '<span class="text-rank">#'+leaderboard[i].rank+'</span><span class="text-left">'+leaderboard[i].name+'</span><span class="text-right">'+leaderboard[i].score+'</span>',
      css: {background: game.playerList[leaderboard[i].id].color}
    }).appendTo("#leaderboard .inner");
  }
}

//update the html of the game browser after goto or refresh
function updateBrowser(gameList, socket, name, color) {
  $("#gamelist").html("");
  gameList.sort(function(a,b) { return Object.keys(b.playerList).length - Object.keys(a.playerList).length; })

  var count = 0;
  for(var n = 0; n < gameList.length; n++) {
    var game = gameList[n];
    var playerCount = Object.keys(game.playerList).length;
    if(game.pub && playerCount < game.playerLimit) {
      count++;
      var code = "#"+(""+game.id).slice(-4);
      $("<div>", {
        id: game.id,
        class: "blob hover",
        html: '<span class="text-id">'+code+'</span><span class="text-center">'+game.w+'x'+game.h+'</span><span class="text-right">'+playerCount+'/'+game.playerLimit+'</span>',
        click: function() { socket.emit('join',{name:name,color:color,gameId:this.id}); }
      }).appendTo("#gamelist");
    }
  }
  if(!count) { $("#gamelist").html('<div class="blob neutral">No games found!</div>')}
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

//helper for converting rgb to rgba
function makeAlpha(rgb,alpha) {
  return rgb.replace(')', ', ' + alpha + ')').replace('rgb', 'rgba');
}
