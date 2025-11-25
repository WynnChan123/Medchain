'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Eye, FileText, Clock, Share2 } from 'lucide-react';
import useStore from '@/store/userStore';
import ActionCard from '@/components/ActionCard';
import RoleUpgradeModal from '@/components/RoleUpgradeModal';
import { ethers } from 'ethers';
import { getAdminPublicKey, getPatientRecordIDs, getRole, checkWhoHasAccess } from '@/lib/integration';
import { UserRole } from '../../../utils/userRole';
import { generateAndRegisterAdminKey } from '@/lib/adminKeys';
import { generateAndRegisterPatientKey, getPatientPublicKey } from '@/lib/patientKeys';
import PatientRecordViewerModal from '@/components/PatientRecordViewerModal';
import { fetchAndDecryptPatientRecord } from '@/lib/decryption';
import ShareMedicalRecordModal from '@/components/ShareMedicalRecordModal';
import SharedDocumentsTable from '@/components/SharedDocumentsTable';

interface medicalDocuments{
  recordId: string;
  cid: string;
  file: {
    name: string;
    type: string;
    base64: string;
  };
  metadata: {
    requestId: string
    recordType: string;
    timestamp: any; 
    [key: string]: any;
  };
}

interface SharedRecord {
  provider: string;
  address: string;
  recordId: string;
}


const PatientDashboard = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showPendingBanner, setShowPendingBanner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const role = useStore((state) => state.role);
  const [secondRole, setSecondRole] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<medicalDocuments | null>(null);
  const [viewDocumentModal, setViewDocumentModal] = useState<boolean>(false);
  const [medicalRecords, setMedicalRecords] = useState<medicalDocuments[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<medicalDocuments | undefined>();
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [sharedWith, setSharedWith] = useState<SharedRecord[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

useEffect(() => {
  const init = async () => {
    if (!window.ethereum) {
      return;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();
    const userRole = await getRole(userAddress);

    console.log('User role:', userRole);

    if (userRole === UserRole.Admin) {
      setSecondRole('Admin');
      
      // Check BOTH on-chain public key AND local private key (IndexedDB)
      const { hasPrivateKey } = await import('@/lib/keyStorage');
      const hasLocalKey = await hasPrivateKey('adminPrivateKey');
      const onChainPublicKey = await getAdminPublicKey(userAddress);
      
      if (!hasLocalKey || !onChainPublicKey) {
        console.log('Missing keys - regenerating...');
        console.log('Has local private key:', hasLocalKey);
        console.log('Has on-chain public key:', !!onChainPublicKey);
        
        await generateAndRegisterAdminKey();
        setHasPublicKey(true);
      } else {
        console.log('✅ Both keys found');
        setHasPublicKey(true);
      }
    } else {
      // Check BOTH on-chain public key AND local private key for patient (IndexedDB)
      const { hasPrivateKey } = await import('@/lib/keyStorage');
      const hasLocalKey = await hasPrivateKey('patientPrivateKey');
      const onChainPublicKey = await getPatientPublicKey(userAddress);
      
      if (!hasLocalKey || !onChainPublicKey) {
        console.log('Missing patient keys - regenerating...');
        console.log('Has local private key:', hasLocalKey);
        console.log('Has on-chain public key:', !!onChainPublicKey);
        
        await generateAndRegisterPatientKey();
        setHasPublicKey(true);
      } else {
        console.log('✅ Both patient keys found. Verifying match...');
        
        // Check if on-chain key matches our local public key (if stored)
        const localPublicKey = localStorage.getItem('patientPublicKey');
        if (localPublicKey && localPublicKey.trim() !== onChainPublicKey.trim()) {
            console.warn("⚠️ On-chain public key does not match local public key.");
            console.warn("This likely means the blockchain node is stale or the key was updated recently.");
            console.warn("Skipping verification to avoid regeneration loop.");
            setHasPublicKey(true);
        } else {
            // Verify that the local private key matches the on-chain public key
            const { verifyRSAKeyPair } = await import('@/lib/integration');
            const isValid = await verifyRSAKeyPair(onChainPublicKey, 'patientPrivateKey');
            
            if (!isValid) {
                console.error("❌ RSA keypair verification failed. Keys mismatch.");
                console.log("⚠️ Auto-regenerating keys to restore access (Old data will be lost)");
                
                await generateAndRegisterPatientKey();
                setHasPublicKey(true);
                alert("Your keys were mismatched and have been automatically regenerated. Old encrypted data is no longer accessible.");
            } else {
                console.log('✅ Keypair verified successfully.');
                setHasPublicKey(true);
            }
        }
      }
      
      // Only try to fetch records if we have the private key (and it's valid/regenerated)
      if (hasLocalKey || !hasLocalKey) { // Always try after handling regeneration
        await fetchMedicalRecords(userAddress);
      }
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
        })
        .catch((error) => {
          console.error('Failed to get wallet address:', error);
          setWalletAddress('Error fetching address');
        });
    }
  }, []);

  const handleViewRecord = (record: medicalDocuments) => {
    setSelectedDocument(record);
    setViewDocumentModal(true);
    console.log('Success')
  } 

  const fetchMedicalRecords = async(patientAddress: string) => {
    setLoading(true);
    try {
      const recordIDs = await getPatientRecordIDs(patientAddress);
      const records = await Promise.all(
        recordIDs.map(async (recordId: string) => {
          try {
            const record = await fetchAndDecryptPatientRecord(patientAddress, recordId);
            return record;
          } catch (err) {
            console.error(`Failed to fetch/decrypt record ${recordId}:`, err);
            return null;
          }
        })
      );
      
      // Filter out failed records
      const validRecords = records.filter((r) => r !== null) as medicalDocuments[];
      console.log('Fetched medical records: ', validRecords);
      setMedicalRecords(validRecords);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      setFetchError("Failed to load medical records.");
    } finally {
      setLoading(false);
    }
  }

  const fetchSharedAccess = async () => {
    if (medicalRecords.length === 0) return;
    
    setLoadingShared(true);
    try {
      const allShared: SharedRecord[] = [];
      
      for (const record of medicalRecords) {
        const accessList = await checkWhoHasAccess(record.recordId);
        
        for (const address of accessList) {
          // Skip if address is empty or zero address (though contract should handle this)
          if (!address || address === ethers.constants.AddressZero) continue;
          
          // Try to get role to show a better name
          let roleName = 'User';
          try {
             const r = await getRole(address);
             if (r === UserRole.HealthcareProvider) roleName = 'Doctor';
             else if (r === UserRole.Insurer) roleName = 'Insurer';
             else if (r === UserRole.Patient) roleName = 'Patient';
             else if (r === UserRole.Admin) roleName = 'Admin';
          } catch (e) {
            console.warn(`Could not fetch role for ${address}`);
          }

          allShared.push({
            provider: roleName,
            address: address,
            recordId: record.recordId
          });
        }
      }
      
      setSharedWith(allShared);
    } catch (error) {
      console.error("Error fetching shared access:", error);
    } finally {
      setLoadingShared(false);
    }
  };

  useEffect(() => {
    if (medicalRecords.length > 0) {
      fetchSharedAccess();
    }
  }, [medicalRecords]);

  const handleShareToUser = async(record: medicalDocuments) => {
    setSelectedDocument(record);
    setShareModalOpen(true);
  }

  const handleShareSuccess = () => {
    fetchSharedAccess();
  };

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
          {/* <ActionCard
            icon={<Upload size={24} />}
            title="Add Medical Record"
            description="Upload new medical documents"
            buttonText="+ Upload"
            href="/Patient/Upload"
          /> */}
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
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading records...</div>
        ) : medicalRecords.length > 0 ? (
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
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Share
                  </th>
                </tr>
              </thead>
<tbody>
  {medicalRecords.map((record) => (
    <tr
      key={record.recordId}
      className="border-b border-gray-800 hover:bg-gray-800"
    >
      <td className="text-white py-3 px-4 text-sm">
        {record.metadata.requestId}
      </td>
      <td className="text-gray-300 py-3 px-4 text-sm">
        {record.metadata.recordType}
      </td>
      <td className="text-gray-300 py-3 px-4 text-sm">
        {/* Fixed: Access timestamp from metadata and handle different formats */}
        {record.metadata?.timestamp 
          ? (typeof record.metadata.timestamp === 'object' && record.metadata.timestamp.toNumber
              ? new Date(record.metadata.timestamp.toNumber() * 1000).toLocaleString()
              : new Date(record.metadata.timestamp).toLocaleString())
          : 'N/A'}
      </td>
      <td className="py-3 px-4">
        <button 
          onClick={() => handleViewRecord(record)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          View
        </button>
      </td>
      <td className="py-3 px-4">
        <button 
          onClick={() => handleShareToUser(record)}
          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition"
        >
          <Share2 />
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
            <p>No records yet</p>
          </div>
        )}
      </div>

      {/* Shared With */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Shared With</h3>
        {loadingShared ? (
          <div className="text-center py-4 text-gray-400">Loading shared access info...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Role
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Address
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Record ID
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sharedWith.length > 0 ? (
                  sharedWith.map((share, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-800 hover:bg-gray-800"
                    >
                      <td className="text-white py-3 px-4 text-sm">
                        {share.provider}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm font-mono">
                        {share.address.slice(0, 6)}...{share.address.slice(-4)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        {share.recordId}
                      </td>
                      <td className="py-3 px-4">
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm opacity-50 cursor-not-allowed" title="Revoke not implemented yet">
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-500">
                      You haven't shared any records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Shared Documents Table */}
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

      {viewDocumentModal && (
        <PatientRecordViewerModal 
        isOpen={viewDocumentModal}
        onClose={()=> setViewDocumentModal(false)}
        recordId={selectedDocument?.recordId ?? null}
        patientAddress={walletAddress}
        />
      )}

      {isShareModalOpen && selectedDocument && (
        <ShareMedicalRecordModal 
          isOpen={isShareModalOpen}
          onClose={() => setShareModalOpen(false)}
          selectedUser={selectedUser}
          setSelectedPatient={setSelectedUser}
          record = {selectedDocument}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
