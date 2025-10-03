"use client";
import useStore from "@/store/userStore";
import { Bell, User2 } from 'lucide-react';
import { useEffect, useState } from "react";
import { getRole } from '@/lib/integration';

const TopBar = ({userName}:{userName:string})=>{
  const role = useStore((state) => state.role);
  const [hydrated, setHydrated] = useState(false);  

  useEffect(() => {
    setHydrated(true);
  }, []);

  if(!hydrated){
    return null;
  }

  return(
    <div className="bg-blue-950 w-full flex justify-between items-center px-6 py-3 shadow-sm">
      <div className="flex items-center space-x-6">
        <Bell className="text-white" />
        <div className="flex items-center space-x-2">
          <User2 className="text-white" />
          <div className="text-sm">
            <div className="text-white font-medium">Welcome back , {userName}</div>
            <div className="text-white">{role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar;