'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Eye, FileText, Clock, Share2 } from 'lucide-react';
import useStore from '@/store/userStore';
import ActionCard from '@/components/ActionCard';
import RoleUpgradeModal from '@/components/RoleUpgradeModal';
import { ethers } from 'ethers';
import {
  getAdminPublicKey,
  getPatientRecordIDs,
  getRole,
  checkWhoHasAccess,
  verifyRSAKeyPair,
  revokeAccess,
  getClaimsByPatient,
  getClaimDetails,
} from '@/lib/integration';
import { UserRole } from '../../../utils/userRole';
import PatientRecordViewerModal from '@/components/PatientRecordViewerModal';
import { fetchAndDecryptPatientRecord } from '@/lib/decryption';
import ShareMedicalRecordModal from '@/components/ShareMedicalRecordModal';
import SharedDocumentsTable from '@/components/SharedDocumentsTable';
import { useRouter } from 'next/navigation';
import { generateAndRegisterUserKey, getUserPublicKey } from '@/lib/userKeys';
import SubmitClaimModal from '@/components/SubmitClaimModal';

interface medicalDocuments {
  recordId: string;
  cid: string;
  file: {
    name: string;
    type: string;
    base64: string;
  };
  metadata: {
    requestId: string;
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
  const [walletAddress, setWalletAddress] = useState('');
  const role = useStore((state) => state.role);
  const [secondRole, setSecondRole] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<medicalDocuments | null>(
    null
  );
  const [viewDocumentModal, setViewDocumentModal] = useState<boolean>(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [medicalRecords, setMedicalRecords] = useState<medicalDocuments[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<
    medicalDocuments | undefined
  >();
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [sharedWith, setSharedWith] = useState<SharedRecord[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const router = useRouter();

useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const userRole = await getRole(userAddress);
      // NEW: Unified key logic for all roles (Admin branch kept for specific data fetch)
      const { hasPrivateKey } = await import('@/lib/keyStorage');
      const hasLocalKey = await hasPrivateKey('userPrivateKey', userAddress); // Unified ID
      let onChainPublicKey = await getUserPublicKey(userAddress); // Unified fetch
      if (!hasLocalKey || !onChainPublicKey) {
        await generateAndRegisterUserKey(userAddress); // Unified gen (waits for tx)
        // Re-fetch post-gen to confirm
        onChainPublicKey = await getUserPublicKey(userAddress);
        if (!onChainPublicKey) {
          console.error('❌ Failed to confirm on-chain key after generation');
          setHasPublicKey(true); // Proceed optimistically
          await fetchMedicalRecords(userAddress); // Continue to fetch
          return;
        }
        setHasPublicKey(true);
      } else {
        // Always verify (no localStorage skip)
        const isValid = await verifyRSAKeyPair(onChainPublicKey); // Unified: Defaults to 'userPrivateKey'
        if (!isValid) {
          console.error("❌ RSA keypair verification failed. Keys mismatch.");
          
          // Check for existing records before auto-regen to avoid data loss
          const recordIDs = await getPatientRecordIDs(userAddress);
          if (recordIDs.length > 0) {
            const userChoice = confirm(
              "Key mismatch detected!\n\nLocal private key doesn't match on-chain public key (possibly from a key update on another device).\n\nRegenerating will create new keys but make old encrypted records INACCESSIBLE FOREVER.\n\nContinue and regenerate? (Or refresh page/reconnect wallet to retry verification.)"
            );
            if (!userChoice) {
              setHasPublicKey(true);
              await fetchMedicalRecords(userAddress); // Proceed to fetch
              return; // Exit early
            }
          }
          await generateAndRegisterUserKey(userAddress);
          onChainPublicKey = await getUserPublicKey(userAddress);
          localStorage.setItem('userPublicKey', onChainPublicKey || '');
          setHasPublicKey(true);
          alert("Your keys were mismatched and have been automatically regenerated. Old encrypted data is no longer accessible.");
        } else {
          // Sync localStorage
          localStorage.setItem('userPublicKey', onChainPublicKey);
          setHasPublicKey(true);
        }
      }

      // Fetch records after key handling (always, but safe now)
      await fetchMedicalRecords(userAddress);
    };

    init();
  }, []);

    useEffect(()=> {
      const fetchUserWallet = async() => {
        if(!window.ethereum){
          return;
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();   
        setUserAddress(userAddress);
      }
  
      fetchUserWallet();
    },[]);

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
  };

  const handleSubmitClaim = (record: medicalDocuments) => {
    setSelectedDocument(record);
    setIsClaimModalOpen(true);
  }

  const fetchMedicalRecords = async (patientAddress: string) => {
    setLoading(true);
    try {
      const recordIDs = await getPatientRecordIDs(patientAddress);
      const records = await Promise.all(
        recordIDs.map(async (recordId: string) => {
          try {
            const record = await fetchAndDecryptPatientRecord(
              patientAddress,
              recordId
            );
            return record;
          } catch (err) {
            console.error(`Failed to fetch/decrypt record ${recordId}:`, err);
            return null;
          }
        })
      );

      // Filter out failed records
      const validRecords = records.filter(
        (r) => r !== null
      ) as medicalDocuments[];
      setMedicalRecords(validRecords);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setFetchError('Failed to load medical records.');
    } finally {
      setLoading(false);
    }
  };

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
            recordId: record.recordId,
          });
        }
      }

      setSharedWith(allShared);
    } catch (error) {
      console.error('Error fetching shared access:', error);
    } finally {
      setLoadingShared(false);
    }
  };

  useEffect(() => {
    if (medicalRecords.length > 0) {
      fetchSharedAccess();
    }
  }, [medicalRecords]);

  useEffect(() => {
    const fetchClaims = async () => {
      if (!userAddress) return;
      setLoadingClaims(true);
      try {
        const claimIds = await getClaimsByPatient(userAddress);
        const details = await getClaimDetails(claimIds);
        
        const formatted = details.map((c: any) => ({
          ...c,
          claimId: c.claimId.toNumber(),
          requestedAmount: c.requestedAmount.toNumber(),
          approvedAmount: c.approvedAmount.toNumber(),
          status: c.status,
          submittedTimestamp: c.submittedTimestamp.toNumber(),
        }));
        
        setMyClaims(formatted.reverse());
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setLoadingClaims(false);
      }
    };
    
    fetchClaims();
  }, [userAddress]);

  const handleShareToUser = async (record: medicalDocuments) => {
    setSelectedDocument(record);
    setShareModalOpen(true);
  };

  const handleShareSuccess = () => {
    fetchSharedAccess();
  };

  const handleRevokeAccess = async (walletAddress: string, medicalRecordID: string) => {
    await revokeAccess(userAddress, walletAddress, medicalRecordID);
    fetchSharedAccess();
  }

  return (
    <div className="space-y-6">

      {/* Welcome Card - Responsive */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-4 sm:p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-lg sm:text-xl font-semibold mb-2">
          Welcome back, {walletAddress || '0x1234...5678'}
        </h2>
        <p className="text-blue-200 text-sm sm:text-base mb-4">
          Current Role: {secondRole == '' ? role : secondRole}
        </p>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <div>
        <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* <ActionCard
            icon={<Upload size={24} />}
            title="Add Medical Record"
            description="Upload new medical documents"
            buttonText="+ Upload"
            href="/Patient/Upload"
          /> */}
          <ActionCard
            icon={<Settings size={24} />}
            title="Edit Your Profile"
            description="Manage your account settings"
            buttonText="Settings"
            onClick={() => router.push('/Patient/Profile')}
          />
          <ActionCard
            icon={<Eye size={24} />}
            title="View Access History"
            description="See who accessed your data"
            buttonText="View Log"
            onClick={() => router.push('/Patient/ViewAccessLogs')}
          />
        </div>
      </div>

      {/* Medical Records - Responsive Table */}
      <div className="bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-white text-base sm:text-lg font-semibold">
            My Medical Records
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">
            Loading records...
          </div>
        ) : medicalRecords.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      Record ID
                    </th>
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      Type
                    </th>
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      Actions
                    </th>
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                      Share
                    </th>
                    <th className="text-left text-gray-400 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden lg:table-cell">
                      Claims
                    </th>
                  </tr>
                </thead>
              <tbody>
                {medicalRecords.map((record) => (
                  <tr
                    key={record.recordId}
                    className="border-b border-gray-800 hover:bg-gray-800"
                  >
                    <td className="text-white py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <span className="block truncate max-w-[80px] sm:max-w-none">{record.metadata.requestId}</span>
                    </td>
                    <td className="text-gray-300 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <span className="inline-block px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
                        {record.metadata.recordType}
                      </span>
                    </td>
                    <td className="text-gray-300 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden md:table-cell">
                      {/* Fixed: Access timestamp from metadata and handle different formats */}
                      {record.metadata?.timestamp
                        ? typeof record.metadata.timestamp === 'object' &&
                          record.metadata.timestamp.toNumber
                          ? new Date(
                              record.metadata.timestamp.toNumber() * 1000
                            ).toLocaleString()
                          : new Date(record.metadata.timestamp).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <button
                        onClick={() => handleViewRecord(record)}
                        className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs sm:text-sm whitespace-nowrap"
                      >
                        View
                      </button>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">
                      <button
                        onClick={() => handleShareToUser(record)}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs sm:text-sm transition"
                      >
                        <Share2 size={16} />
                      </button>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">
                      <button
                        onClick={() => handleSubmitClaim(record)}
                        className="px-2 sm:px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap"
                      >
                        <FileText size={14} /> Submit Claim
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
          <div className="text-center py-4 text-gray-400">
            Loading shared access info...
          </div>
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
                        <button
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm cursor-pointer"
                          onClick={()=> handleRevokeAccess(share.address, share.recordId)}
                        >
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

      {/* My Claims */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">My Claims</h3>
        {loadingClaims ? (
          <div className="text-center py-4 text-gray-400">Loading claims...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Type</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Description</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Amount</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Status</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Notes</th>
                </tr>
              </thead>
              <tbody>
                {myClaims.length > 0 ? (
                  myClaims.map((claim) => (
                    <tr key={claim.claimId} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="text-white py-3 px-4 text-sm">#{claim.claimId}</td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">{claim.claimType}</span>
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm max-w-xs truncate">{claim.description}</td>
                      <td className="text-white py-3 px-4 text-sm font-semibold">${claim.requestedAmount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          claim.status === 0 ? 'bg-amber-900 text-amber-200' :
                          claim.status === 1 ? 'bg-green-900 text-green-200' :
                          'bg-red-900 text-red-200'
                        }`}>
                          {claim.status === 0 ? 'Pending' : claim.status === 1 ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="text-gray-400 py-3 px-4 text-sm italic max-w-xs truncate">{claim.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">No claims submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared Documents Table */}
      <SharedDocumentsTable walletAddress={walletAddress} />

      {viewDocumentModal && (
        <PatientRecordViewerModal
          isOpen={viewDocumentModal}
          onClose={() => setViewDocumentModal(false)}
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
          record={selectedDocument}
          onSuccess={handleShareSuccess}
        />
      )}

      {isClaimModalOpen && selectedDocument && (
        <SubmitClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          record={selectedDocument}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
