const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
// const io = require('console-read-write');

const Server = function () {
  this.data = {} 
}

Server.prototype.createLobby = function () {
  let id = Math.random().toString().substring(2, 8).toUpperCase();
  this.data[id] = {
    users: [],
    isDay: false,
    numOfDay: 0
  }
  return id;
}

Server.prototype.getAllLobbyId = function(){
  return Object.keys(this.data);
}

Server.prototype.findLobby = function (id) {
  return this.data[id]
}

Server.prototype.joinLobby = function (id, userId) {
  let room = this.findLobby(id);
  if (room !=null) {
    room.users.push({
      uid: userId,
      role: "",
      isDead: false
    });
    console.log("user array after push"+  room);
    return true;  //join success
  }
  return false //Join fail
}


function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

Server.prototype.setRole = function (room) {
  let roles = ["wolf", "hunter", "witch", "bodyguard", "seer", "villager"];
  let wolfRate = 0.3;
  let numOfWolf = Math.ceil(wolfRate * room.users.length);
  room.users = shuffle(room.users);
  room.numOfWolf = Math.ceil(numOfWolf);
  let roleIndex = 0;
  for (let i = 0; i < room.users.length; i++) {
    if (roles[roleIndex] == "wolf") {
      if (numOfWolf > 0) {
        room.users[i].role = roles[roleIndex];
        numOfWolf--;
        continue;
      } else if (numOfWolf == 0) {
        roleIndex++;
      }
    }
    room.users[i].role = roles[roleIndex];
    if (roles[roleIndex] != "villager") {
      roleIndex++;
    }
  }
}

Server.prototype.checkRoomStatus = function(id){
  let room = this.findLobby(id);
  if (room == undefined) {
    return false;
  }
  if (room.users.length < 6) {
    return false;   // not enough users
  }
  return true;
}

Server.prototype.play = async function (id) {
  let room = this.findLobby(id);
  if (room == undefined) {
    return false;
  }
  if (room < 6) {
    return false;
  }
  this.setRole(room);
  await next(room);
}

function getUserByRole(role, room) {
  return room.users.filter((usr) => usr.role == role);
}

function createVoteTable(role, room) {
  return room.users.filter((usr) => usr.role == role);
}


// PLAY
async function next(room) {
  //switch the day
  room.isDay != room.isDay;
  room.numOfDay += 1;

  let deads = room.users.filter(usr => usr.isDead);
  let alive = room.users.filter(usr => !usr.isDead);
  let villagerAlive = alive.filter(usr.role != 'wolf');
  let deadWolf = deads.filter(usr => usr.role = 'wolf')

  if (room.numOfWolf == deadWolf) {
    ///villager win
    return;
  }

  if (alive.filter(usr => usr.role != 'wolf').length == (numOfWolf - deadWolf.length)) {
    //wolf win
    return;
  }

  if (room.isDay) { //Day

    console.log("Day " + (room.numOfDay - 1) + "has" + deads.length + "dead");
    console.log(deads);
    let voteTable = {};
    let maxOfVote = 0;

    createVoteTable(voteTable, alive);
    for (let i = 0; i < alive.length; i++) {
      let chosen = await io.ask(alive[i].uid + "wanna choose?" + (usr => usr.uid));
      if (chosen != '') {
        voteTable[chosen]++;
        if (voteTable[chosen] > maxOfVote) {
          maxOfVote = voteTable[chosen];
        }
      }
    }


    if (maxOfVote == 0) {
      io.ask("End of the day #" + (room.numOfDay - 1));
      await next(room);
      return;
    }

    let hangedUser = null;
    for (let i = 0; i < alives.length; i++) {
      if (voteTable[alives[i].uid] == maxOfVote) {
        hangedUser = alives[i];
      }
    }
    // Revote
    wantToKill = 0;
    for (let i = 0; i < alives.length; i++) {
      if (alives[i].uid != hangedUser.uid) {
        let vote = await io.ask(alives[i].uid + " want to kill " + hangedUser.uid + "? 0 - NO | 1 - YES");
        if (vote == 1) {
          wantToKill++;
        } else {
          wantToKill--;
        }
      }
    }
    if (wantToKill > 0) {
      hangedUser.isDead = true;
      io.write(hangedUser.uid + " is killed");
    } else {
      io.write(hangedUser.uid + " is not killed");
    }
    await next(room);
    return;

  } else { //Night
    io.write("#Night" + room.numOfDay)
    let notWolf = room.users.filter((usr) => usr.role != "wolf" && usr.isDead)
    let voteTable = {};
    let maxOfVote = 0;
    createVoteTable(voteTable, notWolf);
    for (let i = 0; i < room.users.length; i++) {
      if (room.users[i].role == "wolf" && !room.users[i]) {
        let result = await io.ask(room.users[i].uid + "wolf vote for?");
        voteTable[result]++;
        if (voteTable[result] > maxOfVote) {
          maxOfVote = voteTable[result];
        }
      }
    }
    //Session wolf end
    //hunter

    let hunter = room.users.filter(usr => usr.role == "hunter")[0];
    let hunterChosen = null;
    if (!hunter.isDead) {
      let notHunter = room.users.filter(usr => usr.role != "hunter" && !usr.isDead);
      hunterChosen = awaitio.ask(hunter.uid + "hunter want to kill?" + notHunter.map(usr => usr.uid));
    }
    //end ofhunter

    //Body guard
    let bodyguard = room.users.filter(usr => usr.role == "bodyguard")[0];
    let protectedUser = null;
    if (!bodyguard.isDead) {
      protectedUser = await io.ask(bodyguard.uid + "Bodyguard want to procted?" + room.users.filter(usr => !usr.isDead && room.meta.previousProtectedUserId != usr.id).map(usr => usr.id));
      room.meta.previousProtectedUserId = protectedUser.uid
    }
    //end of Bodyguard

    //Witch
    let witch = room.user.filter(usr => usr.role == "witch")[0];
    let notWitch = room.user.filter(usr => usr.role != "witch" && !usr.isDead);
    let killByWitch = null;
    let saveByWitch = null;
    if (!witch.isDead) {
      if (room.users.meta.useKillBotlle || room.users.meta.useSaveBottle) {
        killByWitch = await io.ask(witch.uid + "Witch want to kill?" + notWitch.map(usr => usr.uid));
        if (killByWitch != '' && room.users.meta.useKillBotlle) {
          killByWitch;
        }
        else {
          killByWitch = '';
          if (saveByWitch != '' && room.users.meta.useSaveBottle) {
            saveByWitch;
          } else {
            killByWitch;
          }
        }
      }
    }
    //End of witch

    //Seer
    let seer = room.users.filter(usr => usr.role == "seer")[0];
    let seerChosen = null;

    if (!seer.isDead) {
      seerChosen = await io.ask(seer.uid + "Seer want to know?" + room.users.filter(usr => !usr.isDead && !usr.role == "seer").map(usr => usr.uid));
      io.write(seerChosen + "is" + room.users.filter(usr => usr.uid == seerChosen.uid).role)
    }
    //End of Seer

    //kill the villager
    let theDeath = {};
    for (let i = 0; i < notWolf.length; i++) {
      if (voteTable[notWolf[i]] == maxOfVote) {
        notWolf[i].isDead == true;
        theDeath = notWolf[i];
        break;
      }
    }

    //Sumarize
    theDeath.isDead = true;
    if (hunterChosen != null) {
      room.users.filter(usr => usr.uid == hunterChosen)[0].isDead = true;
    }

    if (killByWitch != null) {
      room.users.filter(usr => usr.uid == killByWitch)[0].isDead = true;
    }

    if (saveByWitch != null) {
      room.users.filter(usr => usr.uid == saveByWitch)[0].isDead = false;
    }

    if (protectedUser != null) {
      room.users.filter(usr => usr.uid == protectedUser)[0].isDead = false;
    }
    await next(room);
    return;


  }
}
//END OF PLAY


module.exports = {
  creatNewServer: Server
}




