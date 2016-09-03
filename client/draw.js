function drawBoard(ctx,width,height,size,viewX,viewY,list,board) {
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

function drawUi(ctxUi,width,height,size,viewX,viewY,list,board,fontSize,leaderboard,rank,selfId) {
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
