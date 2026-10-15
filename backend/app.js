const express=require("express")
const mongoose=require("mongoose")
require("dotenv").config()
const app=express()
const cors=require("cors")
const {createServer}=require("node:http")
const {Server}=require("socket.io")
const server=createServer(app)
const io=new Server(server)
app.set("port",5000)
app.set("view engine","ejs")
const path=require("path")

app.set("views", path.join(__dirname, "views"));

let start=async()=>{
    try {
        await mongoose.connect(
            "mongodb://localhost:27017/video"
        );

        console.log("MongoDB Connected");

        server.listen(app.get("port"), () => {
            console.log("Listening on port 5000");
        });

    } catch (err) {
        console.log(err);
    }
}
start()
io.on("connection",(socket)=>{
socket.on("user-message",(message)=>{
    console.log(` new message arrived ${message}`)
    io.emit("message",message)
})
})

app.get("/",(req,res)=>{
    res.render("socketConnection")
})


































// console.log(process.env.CONNECTION_STRING)
// mongoose.connect(process.env.CONNECTION_STRING)
// .then(()=>{
//     console.log("mongoose connected")
// })
// .catch((err)=>{
//     console.log(err)
// })

// let userSchema=new mongoose.Schema({
//     name:String

// })

// let mongooseModel=mongoose.model("NewUser",userSchema)