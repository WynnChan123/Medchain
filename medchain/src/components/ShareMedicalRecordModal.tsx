import { encryptWithPublicKey, getAdminPublicKey, getAllPatientAddresses, getEncryptedKeyForPatient, getInsurers, getProviders, grantAccess, storeEncryptedAESKey } from '@/lib/integration';
import React, { useEffect, useState } from 'react'
import { X, Check, AlertCircle, Stethoscope, Building2, User } from 'lucide-react';
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

interface UserData{
  address: string;
  name?: string;
}

type TabName = 'patients' | 'doctors' | 'insurers';

const ShareMedicalRecordModal = ({ isOpen, onClose, selectedUser, setSelectedPatient, record, onSuccess}: ShareMedicalRecordModalProps) => {

  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<UserData[]>([]);
  const [insurers, setInsurers] = useState<UserData[]>([]);
  const [patients, setPatients] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('patients');

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

  useEffect(() => {
    const fetchUsers = async() => {
      if(!isOpen || !userAddress) return;
      
      setLoading(true);
      setError(null);

      try{
        if(activeTab === 'patients' && patients.length === 0){
          const patientAddresses = await getAllPatientAddresses();
          console.log('Fetched patient addresses: ', patientAddresses);
          // Filter out current user - patientAddresses is string[]
          const filteredPatients = patientAddresses.filter(
            (addr: string) => addr.toLowerCase() !== userAddress.toLowerCase()
          );
          setPatients(filteredPatients);
        }else if(activeTab === 'doctors' && doctors.length === 0){
          const result = await getProviders();
          console.log('Fetched doctors result: ', result);
          const formattedDoctors = result
            .filter((doc: UserData) => doc.address.toLowerCase() !== userAddress.toLowerCase());
          setDoctors(formattedDoctors);
        }else if(activeTab === 'insurers' && insurers.length === 0){
          const result = await getInsurers();
          console.log('Fetched insurers result: ', result);
          const formattedInsurers = result
            .filter((ins: UserData) => ins.address.toLowerCase() !== userAddress.toLowerCase());
          setInsurers(formattedInsurers);
        }
      }catch(error){
        console.error('Error fetching users for tab ', activeTab, ': ', error);
        setError(`Failed to load ${activeTab}.`);
      }finally{
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [activeTab, isOpen, userAddress, doctors.length, insurers.length, patients.length]);

  const handleShare = async() => {
    if (!selectedUser) {
      setError("Please select a user to share with.");
      return;
    }
    setError(null);
    
    try{
      setLoading(true);
      const patientEncryptedKey = await getEncryptedKeyForPatient(record.recordId, userAddress);
      
      // Check if private key exists in IndexedDB
      const { hasPrivateKey } = await import('@/lib/keyStorage');
      const hasKey = await hasPrivateKey('userPrivateKey', userAddress);
      
      if(!hasKey){
        setError("Private key not found. Please ensure you are logged in correctly.");
        setLoading(false);
        return;
      }
      
      const aesKey = await decryptAESKey(patientEncryptedKey, userAddress);

      const recipientPublicKey = await getAdminPublicKey(selectedUser);
      const encryptedKeyForRecipient = await encryptWithPublicKey(aesKey, recipientPublicKey);

      if (!encryptedKeyForRecipient || encryptedKeyForRecipient === '0x' || encryptedKeyForRecipient.length <= 2) {
        throw new Error("Failed to generate a valid encrypted key for the recipient. Please try again.");
      }

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

  const getCurrentUsers = (): (UserData | string)[] => {
    switch (activeTab) {
      case 'doctors':
        return doctors;
      case 'insurers':
        return insurers;
      case 'patients':
        return patients; // string[]
      default:
        return [];
    }
  };

  const getTabIcon = (tab: TabName) => {
    switch (tab) {
      case 'doctors':
        return <Stethoscope size={18} />;
      case 'insurers':
        return <Building2 size={18} />;
      case 'patients':
        return <User size={18} />;
    }
  };

  if (!isOpen) return null;

  const currentUsers = getCurrentUsers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 p-4 sm:p-6 flex justify-between items-center">
          <h2 className="text-white text-lg sm:text-xl font-semibold">
            Share Medical Record
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mr-2">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 border-b border-gray-700 px-3 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {(['patients', 'doctors', 'insurers'] as TabName[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError(null);
                  setSelectedPatient('');
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                {getTabIcon(tab)}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 text-green-400">
              <Check size={48} className="mb-4" />
              <p className="text-lg font-semibold">Record Shared Successfully!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg flex items-start gap-3 mb-4">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {loading && currentUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="text-gray-400 text-sm mt-2">Loading {activeTab}...</p>
                </div>
              ) : (
                <div>
                  <label className="text-gray-300 mb-3 block text-sm font-medium">
                    Select {activeTab === 'doctors' ? 'Doctor' : activeTab === 'insurers' ? 'Insurer' : 'Patient'} to Share With:
                  </label>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {currentUsers.length === 0 ? (
                      <p className="text-gray-500 italic text-center py-4">
                        No {activeTab} found.
                      </p>
                    ) : (
                      currentUsers.map((user) => {
                        // Handle both UserData objects and plain strings
                        const address = typeof user === 'string' ? user : user.address;
                        const name = typeof user === 'string' ? undefined : user.name;
                        
                        return (
                          <label
                            key={address}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedUser === address
                                ? 'bg-blue-900/30 border-blue-500'
                                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="userSelect"
                              value={address}
                              checked={selectedUser === address}
                              onChange={(e) => {
                                setSelectedPatient(e.target.value);
                                setError(null);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 focus:ring-offset-gray-800"
                            />
                            <div className="flex-1">
                              {name && (
                                <div className="text-gray-200 font-medium text-sm mb-1">
                                  {name}
                                </div>
                              )}
                              <div className="text-gray-400 font-mono text-xs">
                                {address}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="bg-gray-900 border-t border-gray-700 p-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={loading || !selectedUser}
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 ${
                loading || !selectedUser
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700 shadow-lg shadow-blue-900/20'
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
        )}
      </div>
    </div>
  )
}

export default ShareMedicalRecordModal