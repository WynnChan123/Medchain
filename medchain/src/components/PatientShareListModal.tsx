import { addMedicalRecord, encryptWithPublicKey, fileToBase64, getAdminPublicKey, getAllUsers, getRole } from '@/lib/integration';
import { X } from 'lucide-react';
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

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const users = await getAllUsers();
        console.log('Fetched users:', users);
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
        throw error;
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

const handleShare = async() => {
  try {
    console.log('Sharing record with patient: ', selectedPatient);
    const medicalRecordID = `REC-${Date.now()}`; 

    //convert to base64
    const files = setFiles;
    const base64 = await fileToBase64(files[0].file);
    console.log('Converted file to base64');

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
    console.log('Created JSON payload for encryption');

    //upload to pinata to get cid
    const aesKey = CryptoJS.lib.WordArray.random(32);
    const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);
    const encrypted = CryptoJS.AES.encrypt(payload, aesKeyHex).toString();
    
    const uploadResponse = await fetch('http://localhost:8080/api/upload/uploadToPinata', {
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
    console.log('Uploaded encrypted payload to IPFS, CID: ', cid);

    //encrypt the aes key with patient's public key
    const patientPublicKey = await getUserPublicKey(selectedPatient);
    if (!patientPublicKey) throw new Error('Patient has no public key registered');

    // encryptWithPublicKey now returns hex directly
    const encryptedKeyForPatient = await encryptWithPublicKey(aesKeyHex, patientPublicKey);
    console.log('Encrypted key for patient:', encryptedKeyForPatient);

    // Verify format
    if (!encryptedKeyForPatient.startsWith('0x')) {
      throw new Error('Encrypted key is not in hex format');
    }

    // add medical record on chain
    await addMedicalRecord(selectedPatient, medicalRecordID, cid, encryptedKeyForPatient, recordType);
    console.log('Successfully shared record with patient: ', selectedPatient);
    print('Record shared successfully!', 'success', () => onClose());
  } catch(error) {
    console.error('Error sharing record: ', error);
    throw error;
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Loading patients...</p>
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
          </div>
          <div className="p-6 flex gap-4 justify-end pt-4">
            <button
              onClick={handleShare}
              disabled={!selectedPatient || recordType.trim() === ''}
              className="w-fit px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share →
            </button>
          </div>
      </div>
    </div>
  );
};

export default PatientShareListModal;
