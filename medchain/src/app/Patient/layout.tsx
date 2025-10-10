'use client';

import React, { useState, useEffect } from 'react'
import TopBar from '../../components/Topbar';
import PatientSideBar from '@/components/Sidebar/PatientSideBar';


const PatientLayout = ({children}: {children: React.ReactNode}) => {
    const [token, setToken] = useState('');
    const [userName, setUserName] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    
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
            console.log(err);
          });
      }
    }, []);
  return (
    <div className="flex min-h-screen bg-gray-800">
      <PatientSideBar collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div className={`flex-1 ${collapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        <TopBar userName={userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default PatientLayout
