const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const server = new (require('./index').creatNewServer)()

const events = require('./events');

const cors = require('cors');

app.use(cors());

function setSocket(req, res, next) {
  io.on("connection", function (socket) {
    req.socket = socket;
    console.log("RUN");
    next();
  });
}

app.get('/', (req, res) => {
  res.send('<h1>Hey Socket.io</h1>')
})

http.listen(3000, () => {
  console.log('listening on *:3000')
})

app.get("/lobby", (req, res) => {
  res.send({
    ids: server.getAllLobbyId()
  });
});

io.on("connection", function (socket) {
  socket.on("global", function (data) {
    const event = data.event;
    console.log(data);
    if (event == "lobby.create") {
      id = server.createLobby();
      socket.emit("lobby.id", id);
    }
    // socket.on(id, function (data) {
    //   console.log(data);
    //   const event = data.event;
    if (event == events.repliedJoinLobby) {
      const { roomId, userId } = data;
      // console.log(roomId);
      console.log(server);
      let result = server.joinLobby(roomId, userId);
      if (!result) {
        socket.emit("global", {
          event: events.sendJoiningStatus,
          status: result
        });
      }
      socket.emit("global", {
        event: events.sendRoomStatus,
        status: server.checkRoomStatus(roomId),
        users: server.findLobby(roomId)
      });
    }
    if(checkRoomStatus(roomId)==true){
      
    }
  });

});

app.post("/lobby", setSocket, (req, res) => {
  const id = server.createLobby();
  console.log(id);
  let socket = req.socket;
  console.log(socket);



  res.send({
    id: id
  });

});