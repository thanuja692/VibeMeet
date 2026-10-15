import mongoose from "mongoose";
const Schema=mongoose.Schema

const userSchema=new Schema({
    auth0Id: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
  email: String,
  picture: String,
    
},{timestamps:true})

export const User=mongoose.model("User",userSchema)