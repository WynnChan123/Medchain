'use client';

import React, { useState, useEffect } from 'react'
import TopBar from '../../components/Topbar';
import PatientSideBar from '@/components/Sidebar/PatientSideBar';


const PatientLayout = ({children}: {children: React.ReactNode}) => {
    const [token, setToken] = useState('');
    const [userName, setUserName] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    useEffect(() => {
      const storedToken = localStorage.getItem('token') || '';
      setToken(storedToken);

      if (storedToken) {
        fetch('http://localhost:8080/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.name) {
              setUserName(data.name);
            }
          })
          .catch((err) => {
          });
      }
    }, []);

  return (
    <div className="flex min-h-screen bg-gray-800">
      {/* Sidebar - Desktop: always visible, Mobile: drawer */}
      <PatientSideBar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 
        ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}
        w-full lg:w-auto`}
      >
        <TopBar 
          userName={userName} 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default PatientLayout
