import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient} from '@libsql/client'
import { Server } from 'socket.io'
import { createServer } from 'node:http'

dotenv.config() // Load environment variables from .env file

const port = process.env.PORT ?? 3000
const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {}
})

/*
Create database
*/
const db = createClient({
    url: "libsql://moral-knockout-gastonojeda.turso.io",
    authToken: process.env.DB_TOKEN
})

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        username TEXT
    )
`)

io.on('connection', async (socket) => {
    console.log('User connected')

    socket.on('disconnect', () => {
        console.log('User disconnected')
    })

    socket.on('chat message', async (msg) => {
        const username = socket.handshake.auth.username ?? 'Anonymous'
        switch (msg) {
            case 'exit':
                console.log('message: ' + msg)
                socket.disconnect()                
                break
            case '':
                console.log('empty message')
                break
            default:
                let result
                try{
                    result = await db.execute({
                        sql: 'INSERT INTO messages (message,username) VALUES (:msg, :username)',
                        args : {msg, username} // for safe query
                    })
                }catch(e){
                    console.error(e)
                    return
                }
                io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
                console.log('message: ' + msg)
                break            
        }     
    })

    console.log(socket.handshake.auth) //shows auth client info

    if(!socket.recovered){
        try {
            const result = await db.execute({
                sql: 'SELECT id, message, username FROM messages where id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            })  
            
            result.rows.forEach(row => {
                socket.emit('chat message', row.message, row.id.toString(), row.username)
            })
        } catch (e) {
            console.error(e)
            return            
        }        
    }
})


app.use(logger('dev'))

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`)
})