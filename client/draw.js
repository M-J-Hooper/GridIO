function drawBoard(ctx,game,view,selected) {
  var offsetX = view.width/2 - view.x;
  var offsetY = view.height/2 - view.y;

  ctx.lineWidth = view.size*0.05;
  ctx.strokeStyle = "rgb(200,200,200)";

  //draw board design
  //rounded edges on tiles (slow due to round rect function)
  /*ctx.fillStyle = "rgb(255,255,255)";
  for(var i = 0; i < w; i++) {
    for(var j = 0; j < h; j++) {
      roundRect(ctx,i*size+offsetX,j*size+offsetY,size,size,size*0.25,true,true);
    }
  }*/

  //more efficient board style
  ctx.fillStyle = "rgb(255,255,255)";
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
        if(game.board[i][j].id == 1) { ctx.fillStyle = "rgba(0,0,0,0.8)"; }
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

var fontSize = 16;
var font = "monospace"
var boxPad = 10;
var textPad = 5;
var leaderSize = 200;
var infoSize = 350;

function drawUi(ctx,game,view,selfId) {
  var leaderboard = game.getLeaderboard();
  var rank = 0;
  for(var i = 0; i < leaderboard.length; i++) {
    if(leaderboard[i].id == selfId) { rank = leaderboard[i].rank; }
  }

  ctx.font = fontSize + "px " + font;

  //draw leaderboard
  var leaderLength = leaderboard.length < 10 ? leaderboard.length : 10;

  //draw leaderboard outlines in top left
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, boxPad, boxPad, leaderSize+4*boxPad, 3*boxPad+(fontSize+2*textPad+boxPad)*leaderLength, 2*boxPad, true, false);
  ctx.fillStyle = "rgb(255,255,255)";
  roundRect(ctx, 2*boxPad, 2*boxPad, leaderSize+2*boxPad, boxPad+(fontSize+2*textPad+boxPad)*leaderLength, boxPad, true, false);

  //draw each player in top 10 with text
  for(var i = 0; i < leaderLength; i++) {
    ctx.fillStyle = game.playerList[leaderboard[i].id].color;
    roundRect(ctx, 3*boxPad, 3*boxPad+i*(fontSize+2*textPad+boxPad), leaderSize, fontSize+2*textPad, (fontSize+2*textPad)*0.2, true, false);

    ctx.fillStyle = "rgb(255,255,255)";
    ctx.textAlign = "left";
    ctx.fillText(leaderboard[i].rank + ".", 3*boxPad+textPad, 3*boxPad+textPad+(i+1)*fontSize+i*(2*textPad+boxPad) - 2);
    ctx.fillText(leaderboard[i].name, 3*boxPad+textPad + 3*boxPad, 3*boxPad+textPad+(i+1)*fontSize+i*(2*textPad+boxPad) - 2);
    ctx.textAlign = "right";
    ctx.fillText(leaderboard[i].score, 3*boxPad+leaderSize-textPad, 3*boxPad+textPad+(i+1)*fontSize+i*(2*textPad+boxPad) - 2);
  }

  //draw info outline and text in bottom left
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, boxPad, view.height - (fontSize+5*boxPad+2*textPad), infoSize+4*boxPad, fontSize+4*boxPad+2*textPad, 2*boxPad, true, false);
  ctx.fillStyle = "rgb(255,255,255)";
  roundRect(ctx, 2*boxPad, view.height - (fontSize+4*boxPad+2*textPad), infoSize+2*boxPad, fontSize+2*boxPad+2*textPad, boxPad, true, false);
  ctx.fillStyle = game.playerList[selfId].color;
  roundRect(ctx, 3*boxPad, view.height - (fontSize+3*boxPad+2*textPad), infoSize, fontSize+2*textPad, (fontSize+2*textPad)*0.2, true, false);

  ctx.fillStyle = "rgb(255,255,255)";
  ctx.textAlign = "left";
  ctx.fillText(game.playerList[selfId].name, 3*boxPad+textPad, view.height - (3*boxPad+textPad) - 2);
  ctx.textAlign = "center";
  ctx.fillText("Score:" + game.playerList[selfId].score, 3*boxPad+infoSize*0.45, view.height - (3*boxPad+textPad) - 2);
  ctx.textAlign = "right";
  ctx.fillText("Rank:" + rank + "/" + leaderboard.length, 3*boxPad+infoSize-textPad, view.height - (3*boxPad+textPad) - 2);
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
