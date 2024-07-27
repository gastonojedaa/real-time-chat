import express from 'express'
import logger from 'morgan'

import { Server } from 'socket.io'
import { createServer } from 'node:http'


const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {}
})

io.on('connection', (socket) => {
    console.log('User connected')

    socket.on('disconnect', () => {
        console.log('User disconnected')
    })

    socket.on('chat message', (msg) => {
        switch (msg) {
            case 'exit':
                console.log('message: ' + msg)
                socket.disconnect()                
                break
            case '':
                console.log('empty message')
                break
            default:
                io.emit('chat message', msg)
                console.log('message: ' + msg)
                break            
        }     
    })
})


app.use(logger('dev'))

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`)
})