"use client";
import useStore from "@/store/userStore";
import { Bell, User2, AlertCircle, FileText, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { getNotificationsByUser, getRole } from '@/lib/integration';
import { ethers } from "ethers";
import { UserRole } from "../../utils/userRole";
import { Notification, NotificationType } from "@/types/notification";

const TopBar = ({userName}:{userName:string})=>{
  const role = useStore((state) => state.role);
  const [hydrated, setHydrated] = useState(false);  
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Mark notifications as read when dropdown is opened
  const handleOpen =()=> {
    setShowDropdown(true);
    
    // Mark all current notifications as read
    if (notifications.length > 0) {
      const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const allNotificationIds = notifications.map(n => n.id.toString());
      const updatedReadNotifications = [...new Set([...readNotifications, ...allNotificationIds])];
      localStorage.setItem('readNotifications', JSON.stringify(updatedReadNotifications));
      setUnreadCount(0);
    }
  }
  
  // Calculate unread count based on localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const unread = notifications.filter(n => !readNotifications.includes(n.id.toString()));
      setUnreadCount(unread.length);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

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
    const fetchNotifications = async() => {
      if(!window.ethereum){
        return;
      }
      try {
        const provider = new ethers.providers.Web3Provider(
          window.ethereum as ethers.providers.ExternalProvider
        );
        await provider.send('eth_requestAccounts', []);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        const userRole = await getRole(userAddress);

        // Fetch notifications for all roles
        const fetchedNotifications = await getNotificationsByUser(userAddress, userRole);
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }

    fetchNotifications();
    
    // Optional: Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  },[]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    // For older notifications, show the date
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Helper function to get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    switch(type) {
      case NotificationType.PendingAdminRequest:
      case NotificationType.PendingInsurerRequest:
        return <AlertCircle className="text-yellow-400" size={18} />;
      case NotificationType.MedicalRecordCreated:
        return <FileText className="text-green-400" size={18} />;
      case NotificationType.MedicalRecordShared:
        return <Share2 className="text-blue-400" size={18} />;
      default:
        return <Bell className="text-gray-400" size={18} />;
    }
  };

  return(
    <div className="bg-blue-950 w-full flex justify-between items-center px-6 py-4 shadow-sm">
      <div className="flex items-center space-x-6">
        <div className="relative">
          <button className="hover:bg-gray-400 p-2 rounded-full" onClick={handleOpen}>
            <Bell className="text-white" />
            {/* Notification count badge - only show unread */}
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
        {/* Dropdown */}
        {hydrated && showDropdown && (
          <div className="absolute top-12 left-0 translate-x-28 bg-gray-900 border border-gray-700 rounded-lg w-96 shadow-lg z-50" ref={dropdownRef}>
            <div className="p-3 border-b border-gray-700 text-white font-semibold">
              Notifications
              {notifications.length > 0 && (
                <span className="ml-2 text-sm text-gray-400">({notifications.length})</span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-gray-400 text-sm">
                  No notifications.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          {notif.message}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {formatTimestamp(notif.createdAt)}
                        </p>
                      </div>
                    </div>
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