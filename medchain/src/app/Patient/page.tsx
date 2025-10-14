'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Settings, Eye, FileText, Plus, X, Clock } from 'lucide-react';
import useStore from '@/store/userStore';
import FileUploadField from '@/components/FileUploadField';
import ActionCard from '@/components/ActionCard';
import RoleUpgradeModal from '@/components/RoleUpgradeModal';
import { ethers } from 'ethers';
import { getAdminPublicKey, getRole } from '@/lib/integration';
import { UserRole } from '../../../utils/userRole';
import { generateAndRegisterAdminKey } from '@/lib/adminKeys';

const PatientDashboard = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showPendingBanner, setShowPendingBanner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const role = useStore((state) => state.role);
  const [secondRole, setSecondRole] = useState('');
  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const userRole = await getRole(userAddress);

      if (userRole == UserRole.Admin && UserRole.Patient) {
        setSecondRole('Admin');
        const publicKey = await getAdminPublicKey(userAddress);
        if (!publicKey) {
          console.log('No key found, generating a new key for new admin');
          await generateAndRegisterAdminKey();
          setHasPublicKey(true);
          console.log('Successfully generated a new key');
        } else {
          console.log('Admin already has a public key');
          setHasPublicKey(true);
        }
      } else {
        console.log('User is only a patient');
      }
    };

    init();
  }, []);

  useEffect(() => {
    // Get wallet address from your Connect component or Web3 provider
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts[0]) {
            setWalletAddress(
              `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
            );
          }
        });
    }
  }, []);

  // Mock data - replace with actual blockchain data
  const medicalRecords = [
    {
      id: 'LAB_001',
      type: 'Blood Test',
      date: '2025-01-15',
      status: 'Complete',
    },
    { id: 'XRAY_002', type: 'X-Ray', date: '2025-01-10', status: 'Complete' },
  ];

  const sharedWith = [
    { provider: 'Dr. Smith', address: '0x456...789', recordId: 'LAB_001' },
    { provider: 'Dr. Jones', address: '0x789...abc', recordId: 'XRAY_002' },
  ];

  return (
    <div className="space-y-6">
      {/* Pending Banner */}
      {showPendingBanner && (
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 flex items-start gap-4">
          <Clock className="text-yellow-400 mt-1" size={20} />
          <div className="flex-1">
            <h3 className="text-yellow-100 font-semibold mb-1">
              ⏳ Role Upgrade Pending
            </h3>
            <p className="text-yellow-200 text-sm mb-2">
              Your request to become a Healthcare Provider is under review.
              You'll be notified once an admin approves.
            </p>
            <p className="text-yellow-300 text-xs mb-3">
              Submitted: {new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm">
                View Details
              </button>
              <button
                onClick={() => setShowPendingBanner(false)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-xl font-semibold mb-2">
          Welcome back, {walletAddress || '0x1234...5678'}
        </h2>
        <p className="text-blue-200 mb-4">Current Role: {secondRole== ""? role: secondRole}</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-blue-100 text-sm">
            Want to become a Healthcare Provider or Insurer?
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white text-blue-900 rounded-lg font-medium hover:bg-blue-50 transition flex items-center gap-2 text-sm"
          >
            Request Role Upgrade →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={<Upload size={24} />}
            title="Add Medical Record"
            description="Upload new medical documents"
            buttonText="+ Upload"
          />
          <ActionCard
            icon={<Settings size={24} />}
            title="Manage Access"
            description="Control who sees your records"
            buttonText="Settings"
          />
          <ActionCard
            icon={<Eye size={24} />}
            title="View Access History"
            description="See who accessed your data"
            buttonText="View Log"
          />
        </div>
      </div>

      {/* Medical Records */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">
            My Medical Records
          </h3>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add Record
          </button>
        </div>

        {medicalRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Record ID
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Type
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Date
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {medicalRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-800 hover:bg-gray-800"
                  >
                    <td className="text-white py-3 px-4 text-sm">
                      {record.id}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {record.type}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {record.date}
                    </td>
                    <td className="py-3 px-4">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>No records yet - Add your first medical record</p>
          </div>
        )}
      </div>

      {/* Shared With */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Shared With</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Provider
                </th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Records Shared
                </th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sharedWith.map((share, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-800 hover:bg-gray-800"
                >
                  <td className="text-white py-3 px-4 text-sm">
                    {share.provider}{' '}
                    <span className="text-gray-500 text-xs">
                      ({share.address})
                    </span>
                  </td>
                  <td className="text-gray-300 py-3 px-4 text-sm">
                    {share.recordId}
                  </td>
                  <td className="py-3 px-4">
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Upgrade Modal */}
      {isModalOpen && (
        <RoleUpgradeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRole('');
          }}
          // onSubmit={() => {
          //   setShowPendingBanner(true);
          //   setIsModalOpen(false);
          // }}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
