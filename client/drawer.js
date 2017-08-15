/*global helper*/

this.drawer = function(helper) {
  'use strict';

  var mobile = helper.mobileCheck();
  
  //draw board lines, pieces and selection on canvas
  function drawBoard(ctx,game,view,selected) {
    //draw board border
    var borderWidth = 0.5;
    for(var n = 8; n >= 0; n--) {
      var value = 256 - n*32;
      ctx.fillStyle = "rgb("+value+","+value+","+value+")";
      roundRect(ctx,view.offsetX-borderWidth*n*view.size,view.offsetY-borderWidth*n*view.size,view.size*(game.l+2*borderWidth*n),view.size*(game.l+2*borderWidth*n),view.size*(borderWidth*n + 0.25),true,false);
    }
  
    ctx.lineWidth = view.size*0.05;
    ctx.strokeStyle = "rgb(224, 224, 224)";
  
    //more efficient board style
    for(var i = view.minI-1; i <= view.maxI+2; i++) {
      ctx.beginPath();
      if(i>=0 && i<game.l) {
        var x = i*view.size+view.offsetX;
        ctx.moveTo(x,Math.max(view.offsetY,0));
        ctx.lineTo(x,Math.min(view.offsetY+game.l*view.size,view.height));
        ctx.stroke();
      }
    }
    for(var j = view.minJ-1; j <= view.maxJ+2; j++) {
      ctx.beginPath();
      if(j>=0 && j<game.l) {
        var y = j*view.size+view.offsetY;
        ctx.moveTo(Math.max(view.offsetX,0),y);
        ctx.lineTo(Math.min(view.offsetX+game.l*view.size,view.width),y);
        ctx.stroke();
      }
    }
  
    //draw pieces
    for(var i = view.minI-1; i <= view.maxI+2; i++) {
      for(var j = view.minJ-1; j <= view.maxJ+2; j++) {
        if(i>=0 && i<game.l && j>=0 && j<game.l) {
          if(game.board[i][j].id) {
            if(game.board[i][j].id == 1) { ctx.fillStyle = "rgb(64, 64, 64)"; }
            else { ctx.fillStyle = game.playerList[game.board[i][j].id].color; }
  
            var x = (i+0.1 - game.board[i][j].prev.dx*game.board[i][j].prev.count/game.slide)*view.size;
            var y = (j+0.1 - game.board[i][j].prev.dy*game.board[i][j].prev.count/game.slide)*view.size;
            roundRect(ctx,x+view.offsetX,y+view.offsetY,view.size*0.8,view.size*0.8,view.size*0.2,true,false);
          }
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
      roundRect(ctx,x+view.offsetX,y+view.offsetY,view.size*0.6,view.size*0.6,view.size*0.15,true,false);
    }
  }
  
  //get info on own pieces for size and view
  function getView(game, selfId, view, smooth) {
    var minI, maxI, minJ, maxJ;
    var first = true;
    var count = 0;
  
    var avI = 0;
    var avJ = 0;
  
    for(var i = view.minI-5; i < view.maxI+10; i++) {
  		for(var j = view.minJ-5; j < view.maxJ+10; j++) {
        if(i>=0 && i<game.l && j>=0 && j<game.l) {
          if(game.board[i][j].id == selfId) {
            if(first) { minI = i; maxI = i; minJ = j; maxJ = j; first = false; }
            else {
              if(i < minI) { minI = i; }
              if(i > maxI) { maxI = i; }
              if(j < minJ) { minJ = j; }
              if(j > maxJ) { maxJ = j; }
            }
          }
        }
  		}
  	}
  
    var r;
    if(game.playerList[selfId].score) {
      avI = (maxI + minI + 1)/2;
      avJ = (maxJ + minJ + 1)/2;
  
      var viewDist = Math.sqrt(game.playerList[selfId].score)+2;
      var playerSizeX = (maxI - minI + 1);
      var playerSizeY = (maxJ - minJ + 1);
      r = Math.min(view.width/(playerSizeX+viewDist*2),view.height/(playerSizeY+viewDist*2))/view.size;
    }
    else {
      avI = game.l/2;
      avJ = game.l/2
      r = Math.max(view.width/game.l,view.height/game.l)/view.size;
    }
  
    if(smooth) {
      var prevSize = view.size;
      var viewSmooth = 50;
      view.size += prevSize*(r-1)/viewSmooth;
      view.x += (avI*prevSize*r - view.x)/viewSmooth;
      view.y += (avJ*prevSize*r - view.y)/viewSmooth;
    }
    else {
      view.size  = view.size*r;
      view.x = avI*view.size;
      view.y = avJ*view.size;
    }
  
    view.offsetX = view.width/2 - view.x;
    view.offsetY = view.height/2 - view.y;
  
    view.minI = Math.floor(-view.offsetX / view.size);
    view.maxI = view.minI + Math.ceil(view.width / view.size);
    view.minJ = Math.floor(-view.offsetY / view.size);
    view.maxJ = view.minJ + Math.ceil(view.height / view.size);
  
    return view;
  }
  
  //draw rounded rectangle
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
  
  //convert rgb to rgba
  function makeAlpha(rgb,alpha) {
    return rgb.replace(')', ', ' + alpha + ')').replace('rgb', 'rgba');
  }
  
  
  
  return {
    drawBoard: drawBoard,
    getView: getView
  };
  
}(helper);