import React, { useEffect, useState } from 'react';
import { Eye, FileText, Loader2 } from 'lucide-react';
import { getSharedRecordsWithDetails } from '@/lib/integration';
import { getUsernamesByWallets } from '@/lib/userUtils';
import PatientRecordViewerModal from './PatientRecordViewerModal';
import { ethers } from 'ethers';

interface SharedDocumentsTableProps {
  walletAddress: string;
}

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

const SharedDocumentsTable: React.FC<SharedDocumentsTableProps> = ({ walletAddress }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SharedRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SharedRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());

    // Get the full wallet address from MetaMask
  useEffect(() => {
    const getFullAddress = async () => {
      if (!window.ethereum) {
        console.error('MetaMask not found');
        return;
      }
      
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        console.log('✅ Full wallet address:', address);
        setFullAddress(address);
      } catch (error) {
        console.error('❌ Error getting wallet address:', error);
      }
    };

    getFullAddress();
  }, []);

  const fetchSharedRecords = async () => {
    if (!fullAddress) return;
    
    try {
      setLoading(true);
      const fetchedRecords = await getSharedRecordsWithDetails(fullAddress);
      setRecords(fetchedRecords);
      
      // Fetch usernames for all patient addresses
      const patientAddresses = fetchedRecords.map(r => r.patientAddress);
      if (patientAddresses.length > 0) {
        const usernameMap = await getUsernamesByWallets(patientAddresses);
        setUsernames(usernameMap);
      }
    } catch (error) {
      console.error('Error fetching shared records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedRecords();
  }, [walletAddress]);

  const handleViewRecord = (record: SharedRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle BigNumber or regular timestamp
    const date = new Date(timestamp.toNumber ? timestamp.toNumber() * 1000 : timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">
          Documents Shared With Me
        </h3>
        <button 
          onClick={fetchSharedRecords}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" size={24} />
          <p className="text-gray-400 text-sm">Loading shared documents...</p>
        </div>
      ) : records.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Sharer (Patient)</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Record Type</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Date Shared</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={`${record.recordId}-${idx}`} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="text-white py-3 px-4 text-sm font-mono">
                    {usernames.get(record.patientAddress) 
                      ? `${record.patientAddress.slice(0, 6)}...${record.patientAddress.slice(-4)} (${usernames.get(record.patientAddress)})`
                      : `${record.patientAddress.slice(0, 6)}...${record.patientAddress.slice(-4)}`
                    }
                  </td>
                  <td className="text-gray-300 py-3 px-4 text-sm">
                    {record.metadata?.recordType || 'Unknown'}
                  </td>
                  <td className="text-gray-300 py-3 px-4 text-sm">
                    {formatDate(record.sharedTimestamp || record.metadata?.timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleViewRecord(record)}
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
          <p>No documents have been shared with you yet.</p>
        </div>
      )}

      {isViewModalOpen && selectedRecord && (
        <PatientRecordViewerModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          recordId={selectedRecord.recordId}
          patientAddress={selectedRecord.patientAddress}
        />
      )}
    </div>
  );
};

export default SharedDocumentsTable;
