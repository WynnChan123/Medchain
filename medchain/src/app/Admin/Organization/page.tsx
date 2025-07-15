'use client';

import InputField from '@/components/InputField';
import MyModal from '@/components/MyModal';
import OrganizationTable from '@/components/OrganizationTable';
import React, { useEffect, useState } from 'react';

const OrganizationPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [organizationAddress, setOrganizationAddress] = useState('');

  const closeModal = () => setModalOpen(false);

  useEffect(()=> {
    if(!modalOpen){
      setOrganizationName('');
      setOrganizationType('');
      setOrganizationAddress('');
    }
  },[modalOpen]);

  return (
    <div>
      {modalOpen && (
        <MyModal isClose={closeModal} isOpen={modalOpen}>
          <div className="text-white">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-row items-center space-x-7">
                <div>Name:</div>
                <InputField
                  id="field1"
                  label="Enter Organization Name"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center space-x-10">
                <div>Type:</div>
                <InputField
                  id="field2"
                  label="Enter Organization Type"
                  type="text"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center space-x-4">
                <div>Address:</div>
                <InputField
                  id="field3"
                  label="Enter Organization Address"
                  type="text"
                  value={organizationAddress}
                  onChange={(e) => setOrganizationAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-row justify-center space-x-10 p-5">
                <button className="bg-green-400 rounded-lg p-3">Create</button>
                <button className="bg-orange-400 rounded-lg p-3" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        </MyModal>
      )}
      <div className="bg-white w-full h-full flex-1 rounded-lg">
        <div className="flex justify-end p-5">
          <button
            className="bg-gray-500 rounded-lg text-white px-4 py-2"
            onClick={() => setModalOpen(true)}
          >
            Create Organization
          </button>
        </div>
        <OrganizationTable itemsPerPage={7} />
      </div>
    </div>
  );
};

export default OrganizationPage;