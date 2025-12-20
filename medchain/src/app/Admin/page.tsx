'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle, FileText, ChevronDown, Eye } from 'lucide-react';
import { BigNumber, ethers } from 'ethers';
import { getRole, getPendingRequestsByAdmin, getAcknowledgedRequestsByAdmin, approveUpgrade, rejectRequest, getAllUsers } from '@/lib/integration';
import { fetchAndDecryptDocuments } from '@/lib/decryption';
import { UserRole } from '../../../utils/userRole';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import UserDetailsModal from '@/components/UserDetailsModal';
import useStore from '@/store/userStore';
import { generateAndRegisterUserKey, getUserPublicKey } from '@/lib/userKeys'; // Unified imports only
import { verifyRSAKeyPair } from '@/lib/integration'; // Address-aware verify
import { cleanupLegacyKeys } from '@/lib/keyStorage'; // For one-time cleanup
import CreateAdminModal from '@/components/CreateAdminModal';

interface RoleUpgradeRequest {
  requestId: BigNumber;
  newRole: UserRole;
  isProcessed: boolean;
  isApproved: boolean;
  adminAddresses: string[];
  requester: string;
  timestamp: BigNumber;
  cid: string;
}

interface User {
  walletAddress: string;
  isActive: 'Active' | 'Inactive';
  currentRole: string;
}

const Dashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [pendingRequests, setPendingRequests] = useState<RoleUpgradeRequest[]>([]);
  const [processedRequests, setProcessedRequests] = useState<RoleUpgradeRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPublicKey, setHasPublicKey] = useState<boolean>(false);
  const role = useStore((state) => state.role);
  const [userAddress, setUserAddress] = useState<string>('');
  let signer: ethers.Signer | null = null;
  
  // Document Viewer Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RoleUpgradeRequest | null>(null);
  const [createAdminModalOpen, setCreateAdminModalOpen] = useState(false);
  // User Details Modal State
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);  
      setWalletAddress(address);

      const userRole = await getRole(address);
      console.log('User role:', UserRole[userRole]);

      // NEW: Unified key check and generation for Admin (no old imports/fallbacks)
      if (userRole === UserRole.Admin) {
        // Check if we've already verified keys this session
        const sessionKeyVerified = sessionStorage.getItem(`keyVerified_${address}`);
        
        // Cleanup legacy keys first (one-time)
        await cleanupLegacyKeys(address);
        console.log('🧹 Cleaned up legacy keys for admin', address);
        
        const { hasPrivateKey } = await import('@/lib/keyStorage');
        const hasLocalKey = await hasPrivateKey('userPrivateKey', address); // Address-aware
        let onChainPublicKey = await getUserPublicKey(address); // Unified fetch

        console.log('🔑 Fetched on-chain public key:', onChainPublicKey ? 'Present' : 'Missing');
        console.log('🔑 Has local private key (userPrivateKey):', hasLocalKey);

        if (!hasLocalKey || !onChainPublicKey) {
          console.log('Missing keys - regenerating...');
          console.log('Has local private key:', hasLocalKey);
          console.log('Has on-chain public key:', !!onChainPublicKey);
          
          await generateAndRegisterUserKey(address); // Unified gen (waits for tx)
          console.log('✅ New user keypair generated and registered.');
          
          // Re-fetch post-gen to confirm
          onChainPublicKey = await getUserPublicKey(address);
          if (!onChainPublicKey) {
            console.error('❌ Failed to confirm on-chain key after generation');
            setHasPublicKey(true); // Proceed optimistically
            sessionStorage.setItem(`keyVerified_${address}`, 'true');
            await fetchRequests(address); // Continue to fetch
            return;
          }
          setHasPublicKey(true);
          sessionStorage.setItem(`keyVerified_${address}`, 'true');
        } else if (!sessionKeyVerified) {
          // Only verify if we haven't verified this session
          console.log('✅ Both keys found. Verifying match...');
          
          // Always verify (address-aware)
          const isValid = await verifyRSAKeyPair(onChainPublicKey); // Pass address
          console.log('Keypair verification result:', isValid);
          
          if (!isValid) {
            console.error("❌ RSA keypair verification failed. Keys mismatch.");
            
            // Check for existing requests/data before regen (admin-specific)
            const pending = await getPendingRequestsByAdmin(address);
            if (pending.length > 0) {
              const userChoice = confirm(
                "Key mismatch detected!\n\nLocal private key doesn't match on-chain public key.\n\nRegenerating will lock existing access FOREVER.\n\nContinue and regenerate? (Refresh/reconnect wallet to retry.)"
              );
              if (!userChoice) {
                console.log("❌ User aborted regeneration. Proceeding anyway.");
                setHasPublicKey(true);
                sessionStorage.setItem(`keyVerified_${address}`, 'true');
                await fetchRequests(address); // Proceed to fetch
                return;
              }
            }
            
            console.log("⚠️ Auto-regenerating keys (Old data will be lost)");
            await generateAndRegisterUserKey(address);
            onChainPublicKey = await getUserPublicKey(address);
            localStorage.setItem('userPublicKey', onChainPublicKey || ''); // Unified LS
            setHasPublicKey(true);
            sessionStorage.setItem(`keyVerified_${address}`, 'true');
            alert("Your keys were mismatched and have been automatically regenerated. Old encrypted data is no longer accessible.");
          } else {
            console.log('✅ Keypair verified successfully.');
            // Sync localStorage
            localStorage.setItem('userPublicKey', onChainPublicKey);
            setHasPublicKey(true);
            sessionStorage.setItem(`keyVerified_${address}`, 'true');
          }
        } else {
          // Already verified this session, skip verification
          console.log('✅ Keys already verified this session. Skipping verification.');
          setHasPublicKey(true);
        }
      }

      // Fetch requests after key handling
      await fetchRequests(address);

      // Fetch users (unchanged)
      console.log('Fetching users for admin dashboard...');
      const allUsers = await getAllUsers();

      const usersWithRoles: User[] = await Promise.all(allUsers.map(async (user: User) => {
        const userRole = await getRole(user.walletAddress);
        return{
          ...user,
          currentRole: UserRole[userRole]
        }
      }));

      setUsers(usersWithRoles);
      if (allUsers[0]) {
        await getRole(allUsers[0].walletAddress);
        console.log('First user role check:', await getRole(allUsers[0].walletAddress));
      }
      console.log('Fetched all users for admin dashboard', allUsers);
    };

    init();
  }, []);

  // useEffect(() => {
  //   if (pendingRequests.length > 0) {
  //     console.log('Role requester:', pendingRequests[0].requester);
  //   } else {
  //     console.log('Role requester: <none>');
  //   }
  // }, [pendingRequests]);

  const fetchRequests = async (adminAddress: string) => {
    try {
      setLoading(true);
      const pending = await getPendingRequestsByAdmin(adminAddress);
      const processed = await getAcknowledgedRequestsByAdmin(adminAddress);

      setPendingRequests(pending);
      setProcessedRequests(processed);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async() => {
    try{
      setCreateAdminModalOpen(true);
    }catch (error){
      console.error(error);
    }
  }


  const handleViewDocuments = (request: RoleUpgradeRequest) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  const handleApprove = async (requestId: number, userAddress: string) => {
    try {
      console.log('Approving request:', requestId, userAddress);
      // Fetch documents to get the role name (Company Name or Doctor Name)
      let roleName = '';
      
      const request = pendingRequests.find(r => r.requestId.toNumber() === requestId);
      if (!request) {
        throw new Error('Request not found in local state');
      }

      if (request.newRole === UserRole.Insurer || request.newRole === UserRole.HealthcareProvider) {
        setLoading(true);
        try {
          const documents = await fetchAndDecryptDocuments(requestId);
          if (!documents || documents.length === 0) {
            throw new Error('No documents found. Cannot retrieve required name for approval.');
          }
          
          const metadata = documents[0].metadata;
          
          // Log the entire metadata for debugging
          console.log('=== METADATA DEBUG ===');
          console.log('Full metadata object:', JSON.stringify(metadata, null, 2));
          console.log('metadata.doctorName:', metadata.doctorName);
          console.log('metadata.organization:', metadata.organization);
          console.log('metadata.role:', metadata.role);
          console.log('======================');
          
          if (request.newRole === UserRole.Insurer) {
            roleName = metadata.organization;
            console.log('Insurer - Using organization:', roleName);
          } else if (request.newRole === UserRole.HealthcareProvider) {
            // Try doctorName first, fallback to organization if not found
            roleName = metadata.doctorName || metadata.organization || '';
            console.log('Healthcare Provider - doctorName:', metadata.doctorName);
            console.log('Healthcare Provider - organization:', metadata.organization);
            console.log('Healthcare Provider - Final roleName:', roleName);
          }
          
          if (!roleName) {
             throw new Error('Required name (Organization or Doctor Name) is missing in document metadata. Metadata: ' + JSON.stringify(metadata));
          }
        } catch (err: any) {
          console.error('Error fetching documents for approval:', err);
          throw new Error('Failed to retrieve required name from documents. Please ensure you can view the documents first. Error: ' + err.message);
        } finally {
          setLoading(false);
        }
      }

      await approveUpgrade(requestId, userAddress, roleName);
      
      // Show success message
      alert('Request approved successfully!');
      
      // Refresh data
      await fetchRequests(walletAddress);
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(`Failed to approve request: ${error.message}`);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      console.log('Rejecting request:', requestId);
      await rejectRequest(requestId);
      
      // Show success message
      alert('Request rejected successfully!');
      
      // Refresh data
      await fetchRequests(walletAddress);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(`Failed to reject request: ${error.message}`);
    }
  };

  const getRoleColor = (role: UserRole | string) => {
    // Convert role to string for comparison
    let roleString: string;
    
    if (typeof role === 'number') {
      // It's a UserRole enum value, convert to string
      roleString = UserRole[role];
    } else {
      roleString = role;
    }
    
    // Map role names to colors
    const roleColorMap: Record<string, string> = {
      'Unregistered': 'text-gray-400',
      'Patient': 'text-gray-300',
      'HealthcareProvider': 'text-green-400',
      'Insurer': 'text-blue-400',
      'Admin': 'text-purple-400'
    };
    
    return roleColorMap[roleString] || 'text-gray-400';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.currentRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-xl font-semibold mb-2">
          Admin Dashboard
        </h2>
        <p className="text-white mb-2">
          Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connecting...'}
        </p>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Pending Reviews</p>
            <p className="text-white font-bold text-lg">{pendingRequests.length}</p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Total Users</p>
            <p className="text-white font-bold text-lg">{users.length}</p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Public Key</p>
            <p className="text-white font-bold text-lg">{hasPublicKey ? '✅' : '⏳'}</p>
          </div>
        </div>
      </div>

      {/* Pending Review Requests Table */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-yellow-400" size={24} />
          <h3 className="text-white text-lg font-semibold">
            Pending Review Requests
          </h3>
          <span className="bg-yellow-900/30 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
            {pendingRequests.length}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading requests...</p>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Request ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Requester</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Requested Role</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Submitted</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Documents</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => (
                  <tr key={request.requestId.toNumber()} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="text-blue-400 py-3 px-4 text-sm font-mono">
                      #{Number(request.requestId)}
                    </td>
                    <td className="text-white py-3 px-4 text-sm font-mono">
                      {request.requester?.slice(0, 6)}...{request.requester?.slice(-4)}
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold ${getRoleColor(request.newRole)}`}>
                      {UserRole[request.newRole]}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {new Date(request.timestamp.toNumber() * 1000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => handleViewDocuments(request)}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.requestId.toNumber(), request.requester)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1 transition"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.requestId.toNumber())}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1 transition"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p>No pending requests</p>
          </div>
        )}
      </div>

      {/* Processed Requests Table */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="text-blue-400" size={24} />
          <h3 className="text-white text-lg font-semibold">
            Processed Requests
          </h3>
        </div>

        {processedRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Request ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Requester</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Role</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Status</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Reviewed</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Documents</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map((request) => (
                  <tr key={request.requestId.toNumber()} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="text-blue-400 py-3 px-4 text-sm font-mono">
                      #{Number(request.requestId)}
                    </td>
                    <td className="text-white py-3 px-4 text-sm font-mono">
                      {request.requester?.slice(0, 6)}...{request.requester?.slice(-4)}
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold ${getRoleColor(request.newRole)}`}>
                      {UserRole[request.newRole]}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 text-xs font-medium ${
                        request.isApproved === true 
                          ? ' text-green-400'
                          : ' text-red-400 '
                      }`}>
                        {request.isApproved === true ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle size={12} />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle size={12} />
                            Rejected
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {new Date(request.timestamp.toNumber() * 1000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => handleViewDocuments(request)}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition"
                      >
                        <Eye size={16} />
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
            <p>No processed requests yet</p>
          </div>
        )}
      </div>

      {/* User Management Table */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Users className="text-blue-400" size={24} />
            <h3 className="text-white text-lg font-semibold">User Management</h3>
          </div>
          <div className="flex justify-end">
            <button 
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
              onClick={() => handleOpenModal()}
            >
              + Assign Admin
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option>All Roles</option>
              <option>Patient</option>
              <option>HealthcareProvider</option>
              <option>Insurer</option>
              <option>Admin</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Address</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Current Role</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Status</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="text-white py-3 px-4 text-sm font-mono">
                    {user?.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
                  </td>
                  <td className={`py-3 px-4 text-sm font-semibold ${getRoleColor(user.currentRole)}`}>
                    {user.currentRole}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-700 rounded-full text-xs font-medium">
                      {user.isActive? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsModalOpen(true);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewModalOpen && selectedRequest && (
        <DocumentViewerModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedRequest(null);
          }}
          requestId={selectedRequest.requestId.toNumber()}
          requesterAddress={selectedRequest.requester}
        />
      )}
      
      {/* User Details Modal */}
      {userDetailsModalOpen && selectedUser && (
        <UserDetailsModal
          isOpen={userDetailsModalOpen}
          onClose={() => {
            setUserDetailsModalOpen(false);
            setSelectedUser(null);
          }}
          userAddress={selectedUser.walletAddress}
          currentRole={selectedUser.currentRole}
          adminAddress={walletAddress}
        />
      )}

      {createAdminModalOpen && (
        <CreateAdminModal 
          isOpen={createAdminModalOpen}
          onClose={()=> setCreateAdminModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;