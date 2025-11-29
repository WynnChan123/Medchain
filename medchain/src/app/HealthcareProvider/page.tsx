'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Settings, Eye, FileText, Plus, X, Clock } from 'lucide-react';
import useStore from '@/store/userStore';
import FileUploadField from '@/components/FileUploadField';
import ActionCard from '@/components/ActionCard';
import RoleUpgradeModal from '@/components/RoleUpgradeModal';
import { BigNumber, ethers } from 'ethers';
import {
  getCreatedRecords,
  getRole,
  getSharedRecordsWithDetails,
  verifyRSAKeyPair,
} from '@/lib/integration';
import { UserRole } from '../../../utils/userRole';
import SharedDocumentsTable from '@/components/SharedDocumentsTable';
import PatientRecordViewerModal from '@/components/PatientRecordViewerModal';
import { useRouter } from 'next/navigation';
import { generateAndRegisterUserKey, getUserPublicKey } from '@/lib/userKeys';

interface SharedRecord {
  recordId: string;
  patientAddress: string;
  metadata: {
    recordType: string;
    timestamp: any;
    [key: string]: any;
  };
  file: {
    name: string;
    type: string;
  };
  sharedTimestamp?: any;
}

interface MedicalRecord {
  medicalRecordID: string;
  recordType: string;
  createdAt: BigNumber;
  cid: string;
  patientAddress: string;
}

const HealthcareProviderDashboard = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const role = useStore((state) => state.role);
  const [secondRole, setSecondRole] = useState('');
  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);
  const [sharedRecords, setSharedRecords] = useState<SharedRecord[]>([]);
  const [createdRecords, setCreatedRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const router = useRouter();

useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const userRole = await getRole(userAddress);

      console.log('User role:', userRole);

      if (userRole !== UserRole.HealthcareProvider) {
        console.log('User is not a Healthcare Provider');
        return;
      }

      // Set role IMMEDIATELY
      setSecondRole('Healthcare Provider');

      // Unified key check and generation (mirrors patient dashboard)
      const { hasPrivateKey } = await import('@/lib/keyStorage');
      const hasLocalKey = await hasPrivateKey('userPrivateKey', userAddress); // Unified ID
      let onChainPublicKey = await getUserPublicKey(userAddress); // Unified fetch

      console.log('🔑 Fetched on-chain public key:', onChainPublicKey ? 'Present' : 'Missing');
      console.log('🔑 Has local private key (userPrivateKey):', hasLocalKey);

      if (!hasLocalKey || !onChainPublicKey) {
        console.log('Missing keys - regenerating...');
        console.log('Has local private key:', hasLocalKey);
        console.log('Has on-chain public key:', !!onChainPublicKey);
        
        await generateAndRegisterUserKey(userAddress); // Unified gen (waits for tx)
        console.log('✅ New user keypair generated and registered.');
        
        // Re-fetch post-gen to confirm
        onChainPublicKey = await getUserPublicKey(userAddress);
        if (!onChainPublicKey) {
          console.error('❌ Failed to confirm on-chain key after generation');
          setHasPublicKey(true); // Proceed optimistically
          await fetchSharedRecords(userAddress); // Continue to fetch
          return;
        }
        setHasPublicKey(true);
      } else {
        console.log('✅ Both keys found. Verifying match...');
        
        // Always verify (no localStorage skip)
        const isValid = await verifyRSAKeyPair(onChainPublicKey); // Unified: Defaults to 'userPrivateKey'
        console.log('Keypair verification result:', isValid);
        
        if (!isValid) {
          console.error("❌ RSA keypair verification failed. Keys mismatch.");
          
          // Check for existing records before auto-regen (doctor-specific, e.g., created records)
          const created = await getCreatedRecords(userAddress);
          if (created && created.length > 0) {
            const userChoice = confirm(
              "Key mismatch detected!\n\nLocal private key doesn't match on-chain public key.\n\nRegenerating will lock existing records FOREVER.\n\nContinue and regenerate? (Refresh/reconnect wallet to retry.)"
            );
            if (!userChoice) {
              console.log("❌ User aborted regeneration. Proceeding anyway (decryptions may fail).");
              setHasPublicKey(true);
              await fetchSharedRecords(userAddress); // Proceed to fetch
              return;
            }
          }
          
          console.log("⚠️ Auto-regenerating keys (Old data will be lost)");
          await generateAndRegisterUserKey(userAddress);
          onChainPublicKey = await getUserPublicKey(userAddress);
          localStorage.setItem('userPublicKey', onChainPublicKey || '');
          setHasPublicKey(true);
          alert("Your keys were mismatched and have been automatically regenerated. Old encrypted data is no longer accessible.");
        } else {
          console.log('✅ Keypair verified successfully.');
          // Sync localStorage
          localStorage.setItem('userPublicKey', onChainPublicKey);
          setHasPublicKey(true);
        }
      }

      // Fetch shared records after key handling (always, but safe now)
      await fetchSharedRecords(userAddress);
    };

    init();
  }, []);

  // Extracted fetch function (for clarity and reuse)
  const fetchSharedRecords = async (userAddress: string) => {
    try {
      console.log('📋 Fetching shared records…');
      const records = await getSharedRecordsWithDetails(userAddress);
      setSharedRecords(records);
      console.log(`✅ Fetched ${records.length} shared records`);
    } catch (err) {
      console.error('❌ Failed to fetch shared records:', err);
      console.warn('This may be due to mismatched RSA keys or decryption issues.');
    }
  };

  useEffect(() => {
    // Get wallet address from your Connect component or Web3 provider
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts[0]) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch((error) => {
          console.error('Failed to get wallet address:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchMedicalRecords();
    }
  }, [walletAddress]);

  const fetchMedicalRecords = async () => {
    console.log('My wallet address: ', walletAddress);
    try {
      const records = await getCreatedRecords(walletAddress);
      console.log('My records created (RAW): ', records);
      if (records && records.length > 0) {
        console.log('First record keys:', Object.keys(records[0]));
        console.log('First record values:', records[0]);
        console.log('First record patient:', records[0].patient);
        console.log('First record patientAddress:', records[0].patientAddress);
        console.log('First record [4]:', records[0][4]); // Check if it's at a specific index
      }
      setCreatedRecords(records);
    } catch (error) {
      console.error('Error fetching created records:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-xl font-semibold mb-2">
          Doctor's Dashboard
        </h2>
        <p className="text-white mb-2">
          Wallet:{' '}
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : 'Connecting...'}
        </p>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Records Shared With You</p>
            <p className="text-white font-bold text-lg">
              {sharedRecords.length}
            </p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Total Created Records</p>
            <p className="text-white font-bold text-lg">
              {createdRecords.length}
            </p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Public Key</p>
            <p className="text-white font-bold text-lg">
              {hasPublicKey ? '✅' : '⏳'}
            </p>
          </div>
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
            href="/HealthcareProvider/Upload"
          />
          <ActionCard
            icon={<Settings size={24} />}
            title="Edit Your Profile"
            description="Manage your account settings"
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
            Created Medical Records
          </h3>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
            onClick={() => router.push('/HealthcareProvider/Upload')}
          >
            <Plus size={16} />
            Create Record
          </button>
        </div>

        {createdRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Record ID
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Patient
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Type
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {createdRecords.map((record) => (
                  <tr
                    key={record.medicalRecordID}
                    className="border-b border-gray-800 hover:bg-gray-800"
                  >
                    <td className="text-white py-3 px-4 text-sm">
                      {record.medicalRecordID}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {record.patientAddress
                        ? `${record.patientAddress.slice(
                            0,
                            6
                          )}...${record.patientAddress.slice(-4)}`
                        : 'Unknown'}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {record.recordType}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {new Date(
                        record.createdAt.toNumber() * 1000
                      ).toLocaleString()}
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
      <SharedDocumentsTable walletAddress={walletAddress} />

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

      {/* View Record Modal */}
      {isViewModalOpen && selectedRecord && (
        <PatientRecordViewerModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedRecord(null);
          }}
          recordId={selectedRecord.medicalRecordID}
          patientAddress={selectedRecord.patientAddress}
        />
      )}
    </div>
  );
};

export default HealthcareProviderDashboard;
