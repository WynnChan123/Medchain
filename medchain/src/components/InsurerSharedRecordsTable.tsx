import React, { useEffect, useState } from 'react';
import { Eye, FileText, Loader2, AlertCircle } from 'lucide-react';
import { getSharedRecordsWithDetails } from '@/lib/integration';
import { getUsernamesByWallets } from '@/lib/userUtils';
import PatientRecordViewerModal from './PatientRecordViewerModal';
import { ethers } from 'ethers';
import { GiSkeleton } from 'react-icons/gi';

interface Claim {
  claimId: number;
  patientAddress: string;
  insurerAddress: string;
  medicalRecordID: string;
  requestedAmount: number;
  approvedAmount: number;
  claimType: string;
  description: string;
  status: number;
  notes: string;
  submittedTimestamp: number;
  processedTimestamp: number;
  cid: string;
}

interface InsurerSharedRecordsTableProps {
  walletAddress: string;
  claims: Claim[];
  isVerified?: boolean;
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

const STATUS_MAP = ['Pending', 'Approved', 'Rejected'];
const STATUS_COLORS = [
  'bg-amber-900 text-amber-200 border-amber-800', // Pending
  'bg-green-900 text-green-200 border-green-800', // Approved
  'bg-red-900 text-red-200 border-red-800',       // Rejected
];

const InsurerSharedRecordsTable: React.FC<InsurerSharedRecordsTableProps> = ({ walletAddress, claims, isVerified = true }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SharedRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SharedRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());

  const fetchSharedRecords = async () => {
    if (!walletAddress) return;
    
    // Skip fetching if not verified
    if (!isVerified) {
      setRecords([]);
      return;
    }
    
    try {
      setLoading(true);
      const fetchedRecords = await getSharedRecordsWithDetails(walletAddress);
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
  }, [walletAddress, isVerified]);

  const handleViewRecord = (record: SharedRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.toNumber ? timestamp.toNumber() * 1000 : timestamp);
    return date.toLocaleString();
  };

  const getRelatedClaims = (recordId: string) => {
    return claims.filter(c => c.medicalRecordID === recordId);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">
          Shared Medical Records
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
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Patient</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Record Type</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Related Claims</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Date Shared</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => {
                const relatedClaims = getRelatedClaims(record.recordId);
                
                return (
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
                    <td className="py-3 px-4">
                      {relatedClaims.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {relatedClaims.map(claim => (
                            <span 
                              key={claim.claimId}
                              className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[claim.status]}`}
                            >
                              #{claim.claimId} {STATUS_MAP[claim.status]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm italic">No claims</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !isVerified ? (
          <div className="text-center justify-items-center py-8 text-gray-400">
            <GiSkeleton size={64} className="mx-auto mb-3 opacity-50" />
            <p>Your account is awaiting verification</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>No medical records have been shared with you yet.</p>
          </div>
        )
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

export default InsurerSharedRecordsTable;
