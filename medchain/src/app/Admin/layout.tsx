'use client';

import React, { useState, useEffect } from 'react'
import AdminSideBar from '../../components/Sidebar/AdminSideBar';
import TopBar from '../../components/Topbar';

const AdminLayout = ({children}: {children: React.ReactNode}) => {
    const [token, setToken] = useState('');
    const [userName, setUserName] = useState('');
    
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
      <AdminSideBar />
      <div className="flex-1">
        <TopBar userName={userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
