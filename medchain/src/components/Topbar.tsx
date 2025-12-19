"use client";
import useStore from "@/store/userStore";
import { Bell, User2, AlertCircle, FileText, Share2, Menu, X, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { getNotificationsByUser, getRole } from '@/lib/integration';
import { ethers } from "ethers";
import { UserRole } from "../../utils/userRole";
import { Notification, NotificationType } from "@/types/notification";

interface TopBarProps {
  userName: string;
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

const TopBar = ({userName, onMenuClick, isSidebarOpen = false}: TopBarProps)=>{
  const role = useStore((state) => state.role);
  const [hydrated, setHydrated] = useState(false);  
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isVerified, setIsVerified] = useState<boolean>(true); // Default to true, will update from blockchain
  
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
        console.log('My ROLE: ', userRole);

        // Check verification status based on role
        if (userRole === UserRole.HealthcareProvider || userRole === UserRole.Insurer) {
          setIsVerified(true);
        } else if (userRole === UserRole.Unregistered) {
          // Check if they have pending requests (unverified)
          setIsVerified(false);
        } else {
          setIsVerified(true); // Admin and Patient are always "verified"
        }

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
    <div className="bg-blue-950 w-full flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 shadow-sm">
      <div className="flex items-center space-x-3 sm:space-x-6 flex-1">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden hover:bg-gray-700 p-2 rounded-full transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? (
              <X className="text-white" size={24} />
            ) : (
              <Menu className="text-white" size={24} />
            )}
          </button>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button className="hover:bg-gray-700 p-2 rounded-full transition-colors" onClick={handleOpen}>
            <Bell className="text-white" size={20} />
            {/* Notification count badge - only show unread */}
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Dropdown - Responsive */}
        {hydrated && showDropdown && (
          <div 
            className="absolute top-12 sm:top-14 left-24 sm:left-16
                       bg-gray-900 border border-gray-700 rounded-lg 
                       w-[calc(100vw-2rem)] sm:w-96
                       shadow-lg z-50" 
            ref={dropdownRef}
          >
            <div className="p-3 border-b border-gray-700 text-white font-semibold text-sm sm:text-base">
              Notifications
              {notifications.length > 0 && (
                <span className="ml-2 text-xs sm:text-sm text-gray-400">({notifications.length})</span>
              )}
            </div>
            <div className="max-h-64 sm:max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-gray-400 text-sm">
                  No notifications.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 sm:p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs sm:text-sm break-words">
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

        {/* User info - Responsive (kept ml-auto to push it right within flex-1) */}
        <div className="flex items-center space-x-2 ml-auto">
          <button 
            onClick={() => {
              // Dynamic navigation based on role
              const roleRoutes: { [key: string]: string } = {
                'Admin': '/Admin/Profile',
                'Patient': '/Patient/Profile',
                'HealthcareProvider': '/HealthcareProvider/Profile',
                'Insurer': '/Insurer/Profile'
              };
              const profileRoute = role ? roleRoutes[role] || '/Patient/Profile' : '/Patient/Profile';
              window.location.href = profileRoute;
            }}
            className="hover:bg-gray-700 p-2 rounded-full transition-colors hidden sm:block"
          >
            <User2 className="text-white" size={20} />
          </button>
          <div className="text-xs sm:text-sm">
            <div className="text-white font-medium truncate max-w-[150px] sm:max-w-none">
              <span className="hidden sm:inline">Welcome back, </span>
              <span className="sm:hidden">Hi, </span>
              {userName}
            </div>
          </div>
        </div>
      </div>
      
      {hydrated && (role === 'HealthcareProvider' || role === 'Insurer' || role === 'Unregistered') && (
        <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium mr-4 sm:mr-6 ${
          isVerified 
            ? 'bg-green-900 text-green-200 border border-green-700' 
            : 'bg-yellow-900 text-yellow-200 border border-yellow-700'
        }`}>
          {isVerified ? (
            <>
              <CheckCircle size={14} className="hidden sm:block" />
              <span className="whitespace-nowrap">Verified</span>
            </>
          ) : (
            <>
              <Clock size={14} className="hidden sm:block" />
              <span className="whitespace-nowrap">Unverified</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TopBar;