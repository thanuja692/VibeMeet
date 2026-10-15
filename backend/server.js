import "dotenv/config"
import express from "express"
import { Server } from "socket.io"
import {createServer} from "http"
import mongoose from "mongoose"
import cors from "cors"
const app=express()
app.use(cors())
app.use(express.json({ limit: "8mb" }))
app.use(express.urlencoded({extended:true}))
import { socketConnection } from "./controllers/socketManager.js"
const server=createServer(app)
const io = socketConnection(server)


import dns from "node:dns";

import { router } from "./routes/userRoute.js"

dns.setServers(["8.8.8.8", "1.1.1.1"]); 
                                             


app.get("/",(req,res)=>{
    res.json({msg:"hello"})
})

app.use("/users",router)
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    const status = error.status || error.statusCode || 500
    res.status(status).json({ msg: status === 401 ? "Your access token was rejected. Log out and log in again." : status === 403 ? "Your account is not authorized to access this API." : 
        "The server could not process the request." })
})
const start=async()=>{
    const connectDB=await mongoose.connect(process.env.CONNECTION_STRING)
    console.log("connected to DB")
    
server.listen(process.env.PORT,()=>{
    console.log(`listening from PORT ${process.env.PORT}`)
})
}
start().catch(error => {
    console.error("Backend startup failed:", error.name, error.code || "")
    process.exitCode = 1
})

