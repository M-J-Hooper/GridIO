if(typeof module != 'undefined') {
  module.exports = function() {
    this.createArray = createArray;
    this.findGroups = findGroups;
    this.regionLoop = regionLoop;
  }
}

function createArray(length) {
  var arr = new Array(length || 0),
    i = length;

  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }
  return arr;
}

//attempt to set selected piece to certain index
function selectPiece(game,selfId,i,j) {
  if(game.board[i][j].id == selfId && i>=0 && i<game.l && j>=0 && j<game.l) {
    return {i:i,j:j};
  }
  else { return {i:null,j:null}; }
}


///////////////////////////////////////////////////////////////////////
//Logic for recursively finding groups when making moves
///////////////////////////////////////////////////////////////////////

function findGroups(game, region) {
	var groups = createArray(region.maxI-region.minI+1,region.maxJ-region.minJ+1);
	var groupNum = 0;

	//get array of grouped pieces
	for(var n = 0; n < groups.length; n++) {
		for(var m = 0; m < groups[0].length; m++) {
			if(game.board[n+region.minI][m+region.minJ].id && !groups[n][m]) {
				groupNum++;
				groups = groupLoop(game,region,groups,n,m,groupNum);
			}
		}
	}
	return groups;
}

//helper function to loop through when calculating groups
function groupLoop(game,region,groups,n,m,groupNum) {
	groups[n][m] = groupNum;

	//careful of board edges
	var maxA = n == groups.length-1 ? 1 : 2;
	var minA = n == 0 ? 0 : -1;
	var maxB = m == groups[0].length-1 ? 1 : 2;
	var minB = m == 0 ? 0 : -1;

	for(var a = minA; a < maxA; a++) {
		for(var b = minB; b < maxB; b++) {
			if(Math.abs(a) + Math.abs(b) == 1) {
				if(game.board[n+region.minI+a][m+region.minJ+b].id == game.board[n+region.minI][m+region.minJ].id) {
          if(!groups[n+a][m+b]) {
					  groups = groupLoop(game,region,groups,n+a,m+b,groupNum);
          }
				}
			}
		}
	}
	return groups;
}

//helper function to find minimal region for finding groups in
function regionLoop(game, data, i, j) {
  data.checked[i][j] = true;

  //update mins and maxes
  if(i < data.region.minI) data.region.minI = i;
  if(i > data.region.maxI) data.region.maxI = i;
  if(j < data.region.minJ) data.region.minJ = j;
  if(j > data.region.maxJ) data.region.maxJ = j;

  //careful of board edges
	var maxA = i == game.l-1 ? 1 : 2;
	var minA = i == 0 ? 0 : -1;
	var maxB = j == game.l-1 ? 1 : 2;
	var minB = j == 0 ? 0 : -1;

  for(var a = minA; a < maxA; a++) {
		for(var b = minB; b < maxB; b++) {
			if(Math.abs(a) + Math.abs(b) == 1) {
        if(game.board[i+a][j+b].id && !data.checked[i+a][j+b]) {
          data = regionLoop(game, data, i+a, j+b);
        }
      }
    }
  }
  return data;
}




///////////////////////////////////////////////////////////////////////
//Generating dynamic HTML components
///////////////////////////////////////////////////////////////////////

//update html of leaderboard and info bar after player update
function updateUi(game,view,selfId) {
  var leaderboard = game.getLeaderboard();
  var rank = 0;
  for(var i = 0; i < leaderboard.length; i++) {
    if(leaderboard[i].id == selfId) { rank = leaderboard[i].rank; }
  }

  $("#info .blob").css("background", game.playerList[selfId].color);
  $("#info .text-left").text(name);
  $("#info .text-center").text("Score: "+game.playerList[selfId].score);
  $("#info .text-right").text("Rank: "+rank+"/"+leaderboard.length);

  $("#leaderboard .inner").html("");
  var leaderLength = leaderboard.length < 10 ? leaderboard.length : 10;
  for(var i = 0; i < leaderLength; i++) {
    $("<div>", {
      class: "blob",
      html: '<span class="text-rank">#'+leaderboard[i].rank+'</span><span class="text-left">'+leaderboard[i].name+'</span><span class="text-right">'+leaderboard[i].score+'</span>',
      css: {background: game.playerList[leaderboard[i].id].color}
    }).appendTo("#leaderboard .inner");
  }

  //update game info in settings
  $("#code").text((""+game.id).substring(2));
  var value = "#"+(""+game.id).slice(2,6);
  $("#settings-info").html('<span class="text-id">'+value+'</span><span class="text-center">'+game.l+'</span><span class="text-right">'+game.getPlayerCount()+'/'+game.playerLimit+'</span>');
}

//update the html of the game browser after goto or refresh
function updateBrowser(gameList, socket, name, color) {
  $("#gamelist").html("");
  gameList.sort(function(a,b) { return Object.keys(b.playerList).length - Object.keys(a.playerList).length; })

  var count = 0;
  for(var n = 0; n < gameList.length; n++) {
    var game = new Game({copy:gameList[n]});
    if(game.pub && game.getPlayerCount() < game.playerLimit) {
      count++;
      var value = "#"+(""+game.id).slice(2,6);
      $("<div>", {
        id: game.id,
        class: "blob hover",
        html: '<span class="text-id">'+value+'</span><span class="text-center">'+game.l+'</span><span class="text-right">'+game.getPlayerCount()+'/'+game.playerLimit+'</span>',
        click: function() { joinGame(null,this.id); }
      }).appendTo("#gamelist");
    }
  }
  if(!count) { $("#gamelist").html('<div class="blob light">No games found!</div>')}
}


///////////////////////////////////////////////////////////////////////
//Wierd methods of detecting mobile and tablet users
///////////////////////////////////////////////////////////////////////

function mobileTabletCheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

function mobileCheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}
