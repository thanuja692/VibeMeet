import { createContext, useState } from "react";

export const DashboardContext=createContext(null)

export function DashBoardProvider({children}){
    const [activeTab,setActiveTab]=useState('home')


    return (
        <DashboardContext.Provider value={{activeTab,setActiveTab}}>{children}</DashboardContext.Provider>
    )
}