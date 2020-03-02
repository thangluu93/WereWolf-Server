const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const index=  require('./index').creatNewServer;
const server=new index()

// io.on('connection', socket => {
//   console.log('-------' + socket.id + '--------')
//   socket.emit('my broadcast',() {
//     message: 'Welcome to WereWolf-itss.'
//   })
//   socket.broadcast.emit('my broadcast', {
//     message: 'A new client has connected.'
//   })

//   socket.on('send', function (data) {
//     console.log(data)
//     io.emit('my broadcast', data)
//   })
// })



app.get('/', (req, res) => {
    res.send('<h1>Hey Socket.io</h1>')
  })
  
  
  
  http.listen(3000, () => {
    console.log('listening on *:3000')
  })
  
  