'use client';

import Button from '@/components/Button';
import OrganizationTable from '@/components/OrganizationTable';
import React from 'react';
import { useRouter } from 'next/navigation';

const Dashboard = () => {
  const router = useRouter();
  return (
    <div>
      <div className="w-full h-[420px] bg-white rounded-lg overflow-x-auto text-xs shadow p-6 flex-1 overflow-y-hidden">
        <div className="flex justify-end">
          <button
            className="flex justify-items-end bg-gray-500 text-white rounded-lg px-4 py-2"
            onClick={() => router.push('/Admin/Organization')}
          >
            View All
          </button>
        </div>
        <OrganizationTable itemsPerPage={3} />
      </div>
    </div>
  );
};

export default Dashboard;
