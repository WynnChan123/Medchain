'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Eye,
  Logs,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useRouter, usePathname } from 'next/navigation';


export const menuItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/Admin' },
  {
    icon: <Building2 size={20} />,
    label: 'Organization',
    href: '/Admin/Organization',
  },
  {
    icon: <Users size={20} />,
    label: 'User Management',
    href: '/Admin/User-management',
  },
  {
    icon: <Eye size={20} />,
    label: 'Access Control',
    href: '/Admin/Access-control',
  },
];

export interface SidebarStatus{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const AdminSideBar = ({ collapsed, setCollapsed}: SidebarStatus) => {
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
          <div className="font-semibold text-white">MedChain</div>
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
      <div className="mt-6 space-y-4 flex-1">
        {menuItems.map((item, index) => (
          <a
            key={index}
            href={item.href}
            data-tooltip-id={`tooltip-${index}`}
            data-tooltip-content={collapsed ? item.label : ''}
            className={`flex items-center gap-4 text-white hover:font-bold hover:bg-blue-400 p-2 rounded-md transition ${
              pathname === item.href ? `bg-blue-600` : ''
            }`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
            {collapsed && (
              <div>
                <Tooltip id={`tooltip-${index}`} place="right" />
              </div>
            )}
          </a>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-auto">
        <button
          onClick={ ()=> 
            {
              localStorage.removeItem('token');
              router.replace('/');
            }
          }
          data-tooltip-id="logout-tooltip"
          data-tooltip-content={collapsed ? 'Log Out' : ''}
          className="flex items-center gap-4 text-red-600 hover:bg-red-100 p-2 rounded-md transition w-full"
        >
          <LogOut />
          {!collapsed && <span>Log Out</span>}
          {collapsed && <Tooltip id="logout-tooltip" place="right" />}
        </button>
      </div>
    </div>
  );
};

export default AdminSideBar;
