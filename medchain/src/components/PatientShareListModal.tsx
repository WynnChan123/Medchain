import { addMedicalRecord, encryptWithPublicKey, fileToBase64, getAllUsers, getRole } from '@/lib/integration';
import { X, Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { UserRole } from '../../utils/userRole';
import { print } from '../../utils/toast';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { getUserPublicKey } from '@/lib/userKeys';

interface PatientShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatient: string;
  setSelectedPatient: (patient: string) => void;
  setFiles: Array<{id: number, file: File, name: string, size: string, type: string}>;
}

const PatientShareListModal: React.FC<PatientShareListModalProps> = ({
  isOpen,
  onClose,
  selectedPatient,
  setSelectedPatient,
  setFiles,
}) => {
  const [patients, setPatients] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [recordType, setRecordType] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const users = await getAllUsers();
        //Extract wallet addresses of users
        const userAddresses = users
          .map((user: any) => user?.walletAddress)
          .filter((addr: string | undefined) => addr !== undefined);

        // Fetch roles of users
        const roles = await Promise.all(
          userAddresses.map(async (address: string) => {
            const role = await getRole(address);
            return { address, role };
          })
        );

        //Keep only patients
        const patientAddresses = roles
          .filter(({ role }) => role === UserRole.Patient)
          .map((user: any) => user.address);

        setPatients(patientAddresses);
      } catch (error) {
        console.error('Error fetching users or roles:', error);
        setError('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

const handleShare = async() => {
  if (!selectedPatient || !recordType.trim()) {
    setError('Please select a patient and enter a record type');
    return;
  }

  setError(null);
  setLoading(true);

  try {
    const medicalRecordID = `REC-${Date.now()}`; 

    //convert to base64
    const files = setFiles;
    const base64 = await fileToBase64(files[0].file);
    //aes encrypt json payload
    const payload = JSON.stringify({
      file: { fileName: files[0].name, fileType: files[0].type, base64: base64 },
      metadata: {
        patient: selectedPatient,
        timestamp: new Date().toISOString(),
        requestId: medicalRecordID,
        recordType: recordType
      }
    });
    //upload to pinata to get cid
    const aesKey = CryptoJS.lib.WordArray.random(32);
    const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);
    const encrypted = CryptoJS.AES.encrypt(payload, aesKeyHex).toString();
    
    const uploadResponse = await fetch('${API_URL}/api/upload/uploadToPinata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        encryptedData: encrypted,
        metadata: {
          patient: selectedPatient,
          timestamp: new Date().toISOString(),
          requestId: medicalRecordID,
        },
      }),
    });

    const result = await uploadResponse.json();
    const cid = result.cid;
    //encrypt the aes key with patient's public key
    const patientPublicKey = await getUserPublicKey(selectedPatient);
    if (!patientPublicKey) throw new Error('Patient has no public key registered');

    // encryptWithPublicKey now returns hex directly
    const encryptedKeyForPatient = await encryptWithPublicKey(aesKeyHex, patientPublicKey);
    // Verify format
    if (!encryptedKeyForPatient.startsWith('0x')) {
      throw new Error('Encrypted key is not in hex format');
    }

    // add medical record on chain
    await addMedicalRecord(selectedPatient, medicalRecordID, cid, encryptedKeyForPatient, recordType);
    setSuccess(true);
    print('Record shared successfully!', 'success', () => {});
    
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setSelectedPatient('');
      setRecordType('');
    }, 2000);

  } catch(error: any) {
    console.error('Error sharing record: ', error);
    setError(error.message || 'Failed to share record. Please try again.');
    print(error.message || 'Failed to share record', 'error', () => {});
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 h-full">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-white text-xl font-semibold">
            Share Record with Patient
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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
                  <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg flex items-start gap-3 mb-4">
                    <X size={20} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="text-gray-400 text-sm mt-2">
                      {patients.length === 0 ? 'Loading patients...' : 'Sharing record...'}
                    </p>
                  </div>
                ) : (
                  <>
                <label className="text-white mb-2 block">
                  Select Patient to Share:
                </label>
                <div className="space-y-2">
                  {patients.length === 0 ? (
                    <p className="text-gray-400">No patients exist.</p>
                  ) : (
                    patients.map((patientAddr) => (
                      <label
                        key={patientAddr}
                        className="flex items-center gap-2 text-white"
                      >
                        <input
                          type="checkbox"
                          value={patientAddr}
                          checked={selectedPatient == patientAddr}
                          onChange={(e) => {
                            const { checked, value } = e.target;
                            setSelectedPatient(checked ? value : '');
                            setError(null);
                          }}
                        />
                        {patientAddr.slice(0, 6)}...{patientAddr.slice(-4)}
                      </label>
                    ))
                  )}
                </div>
                <div>
                  <label className="text-white mb-2 block">Record Type</label>
                  <input
                    type="text"
                    value={recordType}
                    onChange={(e)=> setRecordType(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., Lab Report, Prescription"
                  />
                </div>
                </>
                )}
              </>
            )}
          </div>
          {!success && (
            <div className="p-6 flex gap-4 justify-end pt-4">
              <button
                onClick={handleShare}
                disabled={loading || !selectedPatient || recordType.trim() === ''}
                className="w-fit px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sharing...
                  </>
                ) : (
                  'Share →'
                )}
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default PatientShareListModal;
