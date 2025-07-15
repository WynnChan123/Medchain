import useStore from "@/store/userStore";
import { Bell, User2 } from 'lucide-react';
import { useEffect, useState } from "react";

const TopBar = ({userName}:{userName:string})=>{
  const role = useStore((state) => state.role);
  const [hydrated, setHydrated] = useState(false);  

  useEffect(()=> {
    setHydrated(true);
  }), [hydrated];

  if(!hydrated){
    return null;
  }

  return(
    <div className="bg-blue-950 w-full flex justify-between items-center px-6 py-3 shadow-sm">
      <div className="flex items-center space-x-6">
        <Bell className="text-gray-700" />
        <div className="flex items-center space-x-2">
          <User2 className="text-gray-700" />
          <div className="text-sm">
            <div className="font-medium">{userName}</div>
            <div className="text-white">{role}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar;