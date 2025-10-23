"use client";
import useStore from "@/store/userStore";
import { Bell, User2 } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { getPendingRequestByUser, getRole } from '@/lib/integration';
import { ethers } from "ethers";
import { UserRole } from "../../utils/userRole";

  interface RoleUpgradeRequest {
    requestId: number;
    newRole: UserRole;
    isProcessed: boolean;
    isApproved: boolean;
    adminAddresses: string[];
    requester: string;
    timestamp: number;
    cid: string;
  }

const TopBar = ({userName}:{userName:string})=>{
  const role = useStore((state) => state.role);
  const [hydrated, setHydrated] = useState(false);  
  const [showDropdown, setShowDropdown] = useState(false);
  const [notification, setNotication] = useState<RoleUpgradeRequest[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleOpen =()=> {
    setShowDropdown(true);
  }

  useEffect(() => {
    const handleClickOutside=(event: MouseEvent)=> {
      if(dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)){
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return ()=> {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  },[]);

  useEffect(()=> {
    const fetchNotification = async() =>{
      if(!window.ethereum){
      return;
    }
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as ethers.providers.ExternalProvider
      );
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const userRole = await getRole(userAddress);

      if(userRole == UserRole.Patient){
        const pending = await getPendingRequestByUser(userAddress);
        const formatted = pending.map((req: any) => ({
          ...req,
          requestId: Number(req.requestId),
          newRole: UserRole[req.newRole],
          timestamp: Number(req.timestamp),
        }));
        setNotication(formatted);
      }
    }

    fetchNotification();
  },[]);


  return(
    <div className="bg-blue-950 w-full flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="flex items-center space-x-6">
        <button className="hover:bg-gray-400 p-2 rounded-full" onClick={handleOpen}>
          <Bell className="text-white" />
        </button>
        {/* Dropdown */}
        {hydrated && showDropdown && (
          <div className="absolute top-12 left-0 translate-x-28 bg-gray-900 border border-gray-700 rounded-lg w-80 shadow-lg z-50" ref={dropdownRef}>
            <div className="p-3 border-b border-gray-700 text-white font-semibold">
              Notifications
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notification.length === 0 ? (
                <div className="p-4 text-gray-400 text-sm">
                  No pending requests.
                </div>
              ) : (
                notification.map((req, i) => (
                  <div
                    key={i}
                    className="p-4 border-b border-gray-800 text-white text-sm"
                  >
                    <p>
                      <strong>Request ID: </strong> {req.requestId}
                    </p>
                    <p>
                      <strong>Requested Role: </strong>{req.newRole}
                    </p>
                    <p className="text-yellow-400 font-medium">
                      Status: Pending
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button className="hover:bg-gray-400 p-2 rounded-full">
            <User2 className="text-white" />
          </button>
          <div className="text-sm">
            <div className="text-white font-medium">Welcome back , {userName}</div>
            {/* <div className="text-white">{role}</div> */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar;