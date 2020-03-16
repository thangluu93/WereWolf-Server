const io = require('console-read-write');


const Server = function () {
    this.data = {};
}

Server.prototype.createLobby = function () {
    let id = Math.random().toString().substr(2, 5).toUpperCase();
    this.data[id] = {
        users: [],
        isDay: true,
        numOfDay: 0,
        numOfWolf: 0,
        meta: {
            useSaveBottle: false,
            useKillBottle: false,
            previousProtectedUserId: ""
        }
    };
    return id;
}


Server.prototype.findLobby = function (id) {
    return this.data[id];
}

Server.prototype.joinLobby = function (id, userId) {
    let room = this.findLobby(id);
    if (room != undefined) {
        room.users.push({
            uid: userId,
            role: "",
            isDead: false
        });
        return true;
    }
    return false;
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

Server.prototype.play = async function (id) {
    let room = this.findLobby(id);
    if (room == undefined) {
        return false;
    }
    if (room.users.length < 6) {
        return false;
    }

    this.setRole(room);
    await next(room);
}

function getUsersByRole(role, room) {
    return room.users.filter((usr) => usr.role == role);
}

function createVoteTable(voteTable, users) {
    for (let i = 0; i < users.length; i++) {
        voteTable[users[i].uid] = 0;
    }
}

async function next(room) {

    // Switch the day
    room.isDay = !room.isDay;
    room.numOfDay += 1;

    let deads = room.users.filter(usr => usr.isDead);
    let alives = room.users.filter(usr => !usr.isDead);
    let deadWolf = deads.filter(usr => usr.role == "wolf");

    if (deadWolf.length == room.numOfWolf) {
        io.write("Game Over! the villager win !!!");
        return;
    }   alives.length - (deads.length - deadWolf.length)) <= room.numOfWolf) {
        io.write("Game over");
    if ((alives.length - (deads.length - deadWolf.length)) <= room.numOfWolf) {
        io.write("Game Over! the wolf win !!!");
        return;
    }

    if (room.isDay) {
        io.write("Day #" + (room.numOfDay - 1));
        io.write("Report");
        io.write("Total dead: " + deads.length);
        io.write(deads);
        let voteTable = {};
        let maxOfVote = 0;
        createVoteTable(voteTable, alives);
        for (let i = 0; i < alives.length; i++) {
            let chosen = await io.ask(alives[i].uid + " want to choose? " + alives.map(usr => usr.uid));
            if (chosen != "") {
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

    } else {
        io.write("Night #" + room.numOfDay);
        // Wolf
        let notWolf = room.users.filter((usr) => usr.role != "wolf" && !usr.isDead);
        let voteTable = {};
        let maxOfVote = 0;
        createVoteTable(voteTable, notWolf);
        for (let i = 0; i < room.users.length; i++) {
            if (room.users[i].role == "wolf" && !room.users[i].isDead) {
                let result = await io.ask(room.users[i].uid + " wolf votes for? " + notWolf.map((usr) => usr.uid));
                voteTable[result]++;
                if (voteTable[result] > maxOfVote) {
                    maxOfVote = voteTable[result];
                }
            }
        }
        // End of Wolf
        // Hunter
        let hunter = room.users.filter(usr => usr.role == "hunter")[0];
        let hunterChosen = null;
        if (!hunter.isDead) {
            let notHunter = room.users.filter((usr) => usr.role != "hunter" && !usr.isDead);
            hunterChosen = await io.ask(hunter.uid + " hunter want to kill? " + notHunter.map(usr => usr.uid));
        }
        // End of Hunter
        // Bodyguard
        let bodyguard = room.users.filter(usr => usr.role == "bodyguard")[0];
        let protectedUser = null;
        if (!bodyguard.isDead) {
            protectedUser = await io.ask(bodyguard.uid + " Bodyguard want to protect? " + room.users.filter(usr => !usr.isDead && room.meta.previousProtectedUserId != usr.uid).map(usr => usr.uid));
            room.meta.previousProtectedUserId = protectedUser.uid;
        }   
        //End of Bodyguard
        // Witch
        let witch = room.users.filter(usr => usr.role == "witch")[0];
        let killedByWitch = null;
        let savedByWitch = null;
        if (!witch.isDead) {
            let notWitch = room.users.filter(usr => usr.role != "witch" && !usr.isDead);
            if (!room.meta.useKillBottle) {
                killedByWitch = await io.ask(witch.uid + " Witch want to kill? " + notWitch.map(usr => usr.uid));
                killedByWitch = killedByWitch == "" ? null : killedByWitch;
            }
            if (!room.meta.useSaveBottle) {
                savedByWitch = await io.ask(witch.uid + " Witch want to save? " + room.users.map(usr => usr.uid));
                savedByWitch = savedByWitch == "" ? null : savedByWitch;
            }
        }
        //End of witch
        let seer = room.users.filter(usr => usr.role == "seer")[0];
        if (!seer.isDead) {
            seerChosen = await io.ask(seer.uid + " Seer want to know? " + room.users.filter(usr => usr.role != "seer" && !usr.isDead).map(usr => usr.uid));
            io.write(seerChosen + " is " + (room.users.filter(usr => usr.uid == seerChosen)[0].role == "wolf" ? "a wolf" : "not a wolf"));
        }

        // Kill voted villager
        let theDead = {};
        for (let i = 0; i < notWolf.length; i++) {
            if (voteTable[notWolf[i].uid] == maxOfVote) {
                notWolf[i].isDead = true;
                theDead = notWolf[i];
                break;
            }
        }
        // Summarize the result
        theDead.isDead = true;
        if (hunterChosen != null) {
            room.users.filter(usr => usr.uid == hunterChosen)[0].isDead = true;
        }
        if (killedByWitch != null) {
            room.users.filter(usr => usr.uid == killedByWitch)[0].isDead = true;
            room.meta.useKillBottle = true;
        }
        if (savedByWitch != null) {
            room.users.filter(usr => usr.uid == savedByWitch)[0].isDead = false;
            room.meta.useSaveBottle = true;
        }
        if (protectedUser != null) {
            room.users.filter(usr => usr.uid == protectedUser)[0].isDead = false;
        }
        await next(room);
        return;
    }
}

module.exports = {
    createNewServer: Server
}
