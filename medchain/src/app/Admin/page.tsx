'use client';

import Button from '@/components/Button';
import OrganizationTable from '@/components/OrganizationTable';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminPublicKey, getRole } from '@/lib/integration';
import { ethers } from 'ethers';
import { UserRole } from '../../../utils/userRole';
import { generateAndRegisterAdminKey } from '@/lib/adminKeys';

const Dashboard = () => {

  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);

  useEffect(()=> {
    const init= async() => {
      if(!window.ethereum){
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const userRole = await getRole(userAddress);

      if(userRole == UserRole.Admin){
        const publicKey = await getAdminPublicKey(userAddress);
        if(!publicKey){
          console.log('No public key generated has been generated for admin, creating one...');
          await generateAndRegisterAdminKey();
          console.log('Generated a public key for admin');
        }else{
          const trimKey = publicKey.trim();
          if(trimKey.startsWith('-----BEGIN PUBLIC KEY-----')){
            console.log('Admin already has an existing public key');
            setHasPublicKey(true);
          }else{
            console.log('Converting key to PEM format');
            await generateAndRegisterAdminKey();
            setHasPublicKey(true);
          }
        }
      }
    }

    init();
  },[]);


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
