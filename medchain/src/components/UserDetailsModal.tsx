import React, { useEffect, useState } from 'react';
import { X, User, Calendar, Shield, FileText, Clock } from 'lucide-react';
import { getAcknowledgedRequestsByAdmin, getPendingRequestsByAdmin } from '@/lib/integration';
import { fetchAndDecryptDocuments } from '@/lib/decryption';
import { UserRole } from '../../utils/userRole';
import { BigNumber } from 'ethers';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  currentRole: string;
  adminAddress: string;
}

interface RoleUpgradeDetails {
  requestId: number;
  newRole: string;
  timestamp: string;
  admins: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  organization?: string;
  doctorName?: string;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  userAddress,
  currentRole,
  adminAddress
}) => {
  const [loading, setLoading] = useState(true);
  const [roleUpgradeDetails, setRoleUpgradeDetails] = useState<RoleUpgradeDetails | null>(null);
  const [accountCreationDate, setAccountCreationDate] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchUserDetails();
    }
  }, [isOpen, userAddress]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);

      // Try to fetch user profile from backend by wallet address
      const token = localStorage.getItem('token');
      let userFound = false;
      
      if (token) {
        try {
          // First try direct wallet lookup
          const response = await fetch(`http://localhost:8080/api/user/getByWallet/${userAddress}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserName(userData.name || 'Unknown');
            setAccountCreationDate(new Date(userData.createdAt).toLocaleString());
            userFound = true;
          }
        } catch (err) {
          console.log('Direct wallet lookup failed, trying all users...');
        }

        // If not found by direct lookup, fetch all users and match
        if (!userFound) {
          try {
            const allUsersResponse = await fetch('http://localhost:8080/api/user/all', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allUsersResponse.ok) {
              const allUsers = await allUsersResponse.json();
              
              // Find user by matching wallet address
              const matchedUser = allUsers.find((user: any) => 
                user.walletAddresses.some((wallet: string) => 
                  wallet.toLowerCase() === userAddress.toLowerCase()
                )
              );

              if (matchedUser) {
                setUserName(matchedUser.name || 'Unknown');
                setAccountCreationDate(new Date(matchedUser.createdAt).toLocaleString());
                userFound = true;
              }
            }
          } catch (err) {
            console.log('Error fetching all users:', err);
          }
        }
      }

      // If user still not found
      if (!userFound) {
        setUserName('Not Available (User has not logged in)');
        setAccountCreationDate('N/A');
      }

      // For non-patients, fetch role upgrade request details
      if (currentRole !== 'Patient' && currentRole !== 'Unregistered') {
        const [pendingRequests, processedRequests] = await Promise.all([
          getPendingRequestsByAdmin(adminAddress),
          getAcknowledgedRequestsByAdmin(adminAddress)
        ]);

        const allRequests = [...pendingRequests, ...processedRequests];
        const userRequest = allRequests.find((req: any) => 
          req.requester.toLowerCase() === userAddress.toLowerCase()
        );

        if (userRequest) {
          let status: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
          if (userRequest.isProcessed) {
            status = userRequest.isApproved ? 'Approved' : 'Rejected';
          }

          // Fetch documents to get organization details
          let organization = '';
          let doctorName = '';
          try {
            const documents = await fetchAndDecryptDocuments(userRequest.requestId.toNumber());
            if (documents && documents.length > 0) {
              organization = documents[0].metadata.organization || '';
              doctorName = documents[0].metadata.doctorName || '';
            }
          } catch (err) {
            console.error('Error fetching documents:', err);
          }

          setRoleUpgradeDetails({
            requestId: userRequest.requestId.toNumber(),
            newRole: UserRole[userRequest.newRole],
            timestamp: new Date(userRequest.timestamp.toNumber() * 1000).toLocaleString(),
            admins: userRequest.adminAddresses || [],
            status,
            organization,
            doctorName
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <h2 className="text-white text-xl font-semibold flex items-center gap-2">
            <User size={24} />
            User Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-400 text-sm mt-2">Loading user details...</p>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <User size={20} />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="text-gray-400 text-sm">Wallet Address:</span>
                    <p className="text-white font-mono text-sm break-all">{userAddress}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Current Role:</span>
                    <p className="text-blue-400 font-semibold">{currentRole}</p>
                  </div>
                  {userName && userName !== 'Not Available (User has not logged in)' ? (
                    <>
                      <div>
                        <span className="text-gray-400 text-sm">Name:</span>
                        <p className="text-white font-medium">{userName}</p>
                      </div>
                      {accountCreationDate && accountCreationDate !== 'N/A' && (
                        <div>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Calendar size={16} />
                            Account Created:
                          </span>
                          <p className="text-white">{accountCreationDate}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mt-2">
                      <p className="text-yellow-300 text-sm">
                        ℹ️ User profile not available. This user has not logged into the system yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Upgrade Details (for non-patients) */}
              {roleUpgradeDetails && currentRole !== 'Patient' && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Shield size={20} />
                    Role Upgrade Request Details
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <span className="text-gray-400 text-sm">Request ID:</span>
                      <p className="text-blue-400 font-mono">#{roleUpgradeDetails.requestId}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Requested Role:</span>
                      <p className="text-white font-semibold">{roleUpgradeDetails.newRole}</p>
                    </div>
                    {roleUpgradeDetails.organization && (
                      <div>
                        <span className="text-gray-400 text-sm">Organization:</span>
                        <p className="text-white">{roleUpgradeDetails.organization}</p>
                      </div>
                    )}
                    {roleUpgradeDetails.doctorName && (
                      <div>
                        <span className="text-gray-400 text-sm">Doctor Name:</span>
                        <p className="text-green-400">{roleUpgradeDetails.doctorName}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <Clock size={16} />
                        Request Submitted:
                      </span>
                      <p className="text-white">{roleUpgradeDetails.timestamp}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Status:</span>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        roleUpgradeDetails.status === 'Approved' 
                          ? 'bg-green-900/30 text-green-400 border border-green-700'
                          : roleUpgradeDetails.status === 'Rejected'
                          ? 'bg-red-900/30 text-red-400 border border-red-700'
                          : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                      }`}>
                        {roleUpgradeDetails.status}
                      </span>
                    </div>
                    {roleUpgradeDetails.admins.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm">Assigned Admins:</span>
                        <div className="mt-2 space-y-1">
                          {roleUpgradeDetails.admins.map((admin, idx) => (
                            <p key={idx} className="text-white font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                              {admin}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Patient-specific info */}
              {currentRole === 'Patient' && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    <FileText size={16} className="inline mr-2" />
                    This user is a patient. No role upgrade request history available.
                  </p>
                </div>
              )}

              {/* Admin info */}
              {currentRole === 'Admin' && !roleUpgradeDetails && (
                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <p className="text-purple-300 text-sm">
                    <Shield size={16} className="inline mr-2" />
                    This is an admin account. May be the original deployer or promoted admin.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
