const socketIo = require('socket.io')

const { sockets } = require('./vars')

module.exports = server => {
  const io = socketIo(server, { pingTimeout: 6000 * 3600 })

  io.on('connection', socket => {
    console.log('New client connected')
    sockets.set(socket.id, socket)

    socket.on('disconnect', () => {
      console.log('Client disconnected')
      sockets.delete(socket.id)
    })
  })
}
