import { User } from "../models/userModel.js"
import apiResponse from "../utils/grokAi.js"

export const saveUser = async (req, res) => {
  const auth0Id = req.auth?.payload?.sub
  if (!auth0Id) return res.status(401).json({ msg: "Please log in again." })

  try {
    const existingUser = await User.findOne({ auth0Id })

    if (existingUser) {
      return res.json({ user: existingUser })
    }

    const { name, email, picture } = req.body || {}
    let status = 201

    const user = await User.create({
      auth0Id,
      name: typeof name === "string" ? name : undefined,
      email: typeof email === "string" ? email : undefined,
      picture: typeof picture === "string" ? picture : undefined,
    }).catch(async (error) => {
      // Another login request may have created this user first.
      if (error.code === 11000) {
        const existingUser = await User.findOne({ auth0Id })
        if (existingUser) {
          status = 200
          return existingUser
        }
      }
      throw error
    })

    return res.status(status).json({ user })
  } catch (error) {
    console.error("Profile save failed:", error.message)
    if (error.code === 11000) {
      return res.status(409).json({ msg: "This profile conflicts with an existing user." })
    }
    return res.status(500).json({ msg: "Unable to save your profile to the database. Please retry." })
  }
}

export const aiChat=async(req,res)=>{
  try{
  const {message, teachingSource, teachingMode}=req.body
  if ( !message) {
      return res.json({
        err: "Incomplete data"
      });
    }
      const assistantResponse =
          await apiResponse(message,req.imageFile,teachingSource,req.teachingImageFile,teachingMode === "true");
           return res.json({
      assistantResponse
    });
    
        }
      
catch(err){
  console.error("AI chat failed:", err.message)
  return res.status(502).json({ msg: "The AI assistant could not answer right now. Please try again." })
}
}
