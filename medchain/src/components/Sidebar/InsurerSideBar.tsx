'use client';

import React from 'react';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export interface SidebarStatus {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const menuItems = [
  {
    icon: <Home size={20} />,
    label: 'Dashboard',
    href: '/Insurer',
  },
  {
    icon: <FileText size={20} />,
    label: 'Pending Claims',
    href: '/Insurer/PendingClaims',
  },
  {
    icon: <CheckCircle size={20} />,
    label: 'Approved Claims',
    href: '/Insurer/ApprovedClaims',
  },
  {
    icon: <XCircle size={20} />,
    label: 'Rejected Claims',
    href: '/Insurer/RejectedClaims',
  },
  {
    icon: <BarChart3 size={20} />,
    label: 'Statistics',
    href: '/Insurer/Statistics',
  },
];

const InsurerSideBar = ({ collapsed, setCollapsed }: SidebarStatus) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className={`bg-blue-950 h-screen p-3 flex flex-col transition-all duration-300 fixed ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {!collapsed && (
        <div className="mb-4">
          <div className="font-semibold text-white">InsureChain</div>
          <div className="text-white text-sm mt-1">Claims Management</div>
        </div>
      )}

      {/* Toggle button */}
      <div className="flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-600 hover:text-black"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="mt-6 space-y-2 flex-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-4 text-white hover:bg-blue-700 p-3 rounded-md transition w-full ${
              pathname === item.href ? 'bg-blue-700 font-semibold' : ''
            }`}
            title={collapsed ? item.label : ''}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-auto">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            router.replace('/');
          }}
          className="flex items-center gap-4 text-red-400 hover:bg-red-900/30 p-3 rounded-md transition w-full"
          title={collapsed ? 'Log Out' : ''}
        >
          <LogOut />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );
};

export default InsurerSideBar;