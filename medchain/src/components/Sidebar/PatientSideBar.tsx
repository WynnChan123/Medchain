'use client';

import React from 'react';
import {
  LayoutDashboard,
  LogOut,
  Eye,
  Logs,
  ChevronLeft,
  ChevronRight,
  House,
} from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useRouter, usePathname } from 'next/navigation';


export const menuItems = [
  {
    icon: <House size={20} />,
    label: 'Home Page',
    href: '/Patient',
  }
];

const UserSideBar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className={`bg-blue-950 h-screen p-3 flex flex-col transition-all duration-300 ${
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
            className={`flex items-center gap-4 text-white hover:font-bold hover:bg-blue-200 p-2 rounded-md transition ${
              pathname === item.href ? `bg-blue-200` : ''
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

export default UserSideBar;
