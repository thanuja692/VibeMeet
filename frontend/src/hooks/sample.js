import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"


export const  useSaveUserSample=()=>{
    const {isAuthenticated,user,getAccessTokenSilently}=useAuth0()
    useEffect(()=>{
        if(!isAuthenticated || !user)return
        

        async function saveProfile(params) {

            try{
        const controller=new AbortController()
        const token=await getAccessTokenSilently()


    }
    catch(err){
        console.log(err)
    }
            
        }
        

    },[isAuthenticated])

    

}