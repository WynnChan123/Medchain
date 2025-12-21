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
  Upload,
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useRouter, usePathname } from 'next/navigation';

export interface SidebarStatus{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const menuItems = [
  {
    icon: <House size={20} />,
    label: 'Home Page',
    href: '/HealthcareProvider'
  },
  {
    icon: <Upload size={20} />,
    label: 'Upload Records',
    href: '/HealthcareProvider/Upload'
  }
];

const HealthcareProviderSideBar = ({ collapsed, setCollapsed, isMobileOpen = false, onMobileClose }: SidebarStatus) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className={`bg-blue-950 h-screen p-3 flex flex-col transition-all duration-300 
        fixed lg:fixed top-0 left-0 z-40
        ${collapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {!collapsed && (
        <div className="mb-4">
          <div className="font-semibold text-white text-lg">MedChain</div>
        </div>
      )}
      
      <div className="hidden lg:flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <a
            key={index}
            href={item.href}
            onClick={(e) => {
              if (onMobileClose && window.innerWidth < 1024) {
                onMobileClose();
              }
            }}
            data-tooltip-id={`tooltip-${index}`}
            data-tooltip-content={collapsed ? item.label : ''}
            className={`flex items-center gap-4 text-white hover:font-bold hover:bg-blue-600 p-3 rounded-md transition ${
              pathname === item.href ? `bg-blue-600 font-semibold` : ''
            }`}
          >
            {item.icon}
            {!collapsed && <span className="text-sm">{item.label}</span>}
            {collapsed && (
              <div>
                <Tooltip id={`tooltip-${index}`} place="right" />
              </div>
            )}
          </a>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-blue-800">
        <button
          onClick={ ()=> 
            {
              localStorage.removeItem('token');
              router.replace('/');
              if (onMobileClose) onMobileClose();
            }
          }
          data-tooltip-id="logout-tooltip"
          data-tooltip-content={collapsed ? 'Log Out' : ''}
          className="flex items-center gap-4 text-red-400 hover:bg-red-900 hover:text-red-300 p-3 rounded-md transition w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Log Out</span>}
          {collapsed && <Tooltip id="logout-tooltip" place="right" />}
        </button>
      </div>
    </div>
  );
};

export default HealthcareProviderSideBar;
