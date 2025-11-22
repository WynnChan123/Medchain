import { encryptWithPublicKey, getAdminPublicKey, getAllUsers, getEncryptedKeyForPatient, getRole, grantAccess, storeEncryptedAESKey } from '@/lib/integration';
import React, { useEffect, useState } from 'react'
import { UserRole } from '../../utils/userRole';
import { X, Check, AlertCircle } from 'lucide-react';
import { decryptAESKey } from '@/lib/decryption';
import { ethers } from 'ethers';


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

interface ShareMedicalRecordModalProps{
  isOpen: boolean;
  onClose: () => void;
  selectedUser: string;
  setSelectedPatient: (patient: string) => void;
  record: medicalDocuments;
  onSuccess?: () => void;
}


const ShareMedicalRecordModal = ({ isOpen, onClose, selectedUser, setSelectedPatient, record, onSuccess}: ShareMedicalRecordModalProps) => {

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(()=> {
    const fetchUserWallet = async() => {
      if(!window.ethereum){
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();   
      console.log(userAddress); 
      setUserAddress(userAddress);
    }

    fetchUserWallet();
  },[]);

  const handleShare = async() => {
    if (!selectedUser) {
      setError("Please select a user to share with.");
      return;
    }
    setError(null);
    try{
      setLoading(true);
      const patientEncryptedKey = await getEncryptedKeyForPatient(record.recordId, userAddress);
      const privateKeyPEM = localStorage.getItem('patientPrivateKey');
      if(!privateKeyPEM){
        setError("Private key not found. Please ensure you are logged in correctly.");
        setLoading(false);
        return;
      }
      const aesKey = await decryptAESKey(patientEncryptedKey, privateKeyPEM);

      const recipientPublicKey = await getAdminPublicKey(selectedUser);
      const encryptedKeyForRecipient = encryptWithPublicKey(aesKey, recipientPublicKey);

      console.log('GOT USER ADDRESS: ', userAddress);
      await grantAccess(userAddress, selectedUser, record.recordId);
      console.log('Granted Access Successfully');

      await storeEncryptedAESKey(userAddress, selectedUser, record.recordId, encryptedKeyForRecipient);
      console.log('Stored encrypted key successfully');

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedPatient('');
      }, 2000);

    }catch(error: any){
      console.error('Failed to share medical record: ', error);
      setError(error.message || "Failed to share record. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=> {
    //Fetch users
    const users = async() => {
      setLoading(true);
      try{
        const users = await getAllUsers();
        const userAddresses = users
          .map((user:any) => user?.walletAddress)
          .filter((addr: string | undefined) => addr!== undefined);

        const roles = await Promise.all(
          userAddresses.map(async (address: string) => {
            const role = await getRole(address);
            return { address, role };
          })
        );

        const walletAddresses = roles
          .filter(({ role }) => role === UserRole.Patient || role === UserRole.Insurer || role === UserRole.HealthcareProvider)
          .map((user: any) => user.address);
        
        // Filter out the current user
        const filteredUsers = walletAddresses.filter((addr: string) => addr.toLowerCase() !== userAddress.toLowerCase());

        setUsers(filteredUsers);
      }catch(error){
        console.log('Error fetching users or roles: ', error);
        setError("Failed to load users.");
      }finally{
        setLoading(false);
      }

    }
    if (isOpen && userAddress) {
        users();
    }
  },[isOpen, userAddress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 h-full">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <h2 className="text-white text-xl font-semibold">
            Share Record with Users
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
          <div className="p-6 space-y-4">
            {success ? (
                <div className="flex flex-col items-center justify-center py-10 text-green-400">
                    <Check size={48} className="mb-4" />
                    <p className="text-lg font-semibold">Record Shared Successfully!</p>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    
                    {loading && users.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                        <p className="text-gray-400 text-sm mt-2">Loading users...</p>
                    </div>
                    ) : (
                    <>
                        <div>
                            <label className="text-gray-300 mb-3 block text-sm font-medium">
                            Select User to Share With:
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {users.length === 0 ? (
                                <p className="text-gray-500 italic text-center py-4">No other users found.</p>
                            ) : (
                                users.map((userAddr) => (
                                <label
                                    key={userAddr}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedUser === userAddr 
                                        ? 'bg-blue-900/30 border-blue-500' 
                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    <input
                                    type="radio"
                                    name="userSelect"
                                    value={userAddr}
                                    checked={selectedUser === userAddr}
                                    onChange={(e) => {
                                        setSelectedPatient(e.target.value);
                                        setError(null);
                                    }}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                                    />
                                    <span className="text-gray-200 font-mono text-sm">
                                        {userAddr}
                                    </span>
                                </label>
                                ))
                            )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-300 hover:text-white mr-3 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={loading || !selectedUser}
                            className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 ${
                                loading || !selectedUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 shadow-lg shadow-blue-900/20'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Sharing...
                                </>
                            ) : (
                                'Share Record'
                            )}
                        </button>
                        </div>
                    </>
                    )}
                </>
            )}
          </div>
      </div>
    </div>
  )
}

export default ShareMedicalRecordModal
