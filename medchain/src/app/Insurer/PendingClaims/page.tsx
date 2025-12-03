'use client';

import { getClaimDetails, getClaimsByInsurer, approveClaim, rejectClaim, getClaimFiles } from '@/lib/integration';
import { ethers } from 'ethers';
import { Check, FileText, X, Eye } from 'lucide-react';
import React, { useState } from 'react';

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

const PendingClaimsPage = () => {
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilesModal, setViewFilesModal] = useState(false);
  const [claimFiles, setClaimFiles] = useState<{photos: any[], documents: any[]}>({photos: [], documents: []});
  const [loadingFiles, setLoadingFiles] = useState(false);

  const fetchClaims = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        const claimIds = await getClaimsByInsurer(address);
        const details = await getClaimDetails(claimIds);
        
        const pending = details
          .map((c: any) => ({
            ...c,
            claimId: c.claimId.toNumber(),
            requestedAmount: c.requestedAmount.toNumber(),
            approvedAmount: c.approvedAmount.toNumber(),
            status: c.status,
            submittedTimestamp: c.submittedTimestamp.toNumber(),
            processedTimestamp: c.processedTimestamp.toNumber(),
          }))
          .filter((c: any) => c.status === 0); // 0 = Pending
          
        setPendingClaims(pending);
      } catch (error) {
        console.error('Error fetching pending claims:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  React.useEffect(() => {
    fetchClaims();
  }, []);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString();
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleClaimAction = (claim: any, action: string) => {
    setSelectedClaim(claim);
    setModalAction(action);
    setApprovedAmount(
      action === 'approve' ? claim.requestedAmount.toString() : ''
    );
    setNotes('');
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedClaim) return;
    
    try {
      if (modalAction === 'approve') {
        await approveClaim(selectedClaim.claimId, Number(approvedAmount), notes);
      } else {
        await rejectClaim(selectedClaim.claimId, notes);
      }
      
      setShowModal(false);
      alert(`Claim #${selectedClaim.claimId} ${modalAction}d successfully!`);
      fetchClaims(); // Refresh list
    } catch (error) {
      console.error(`Error ${modalAction}ing claim:`, error);
      alert(`Failed to ${modalAction} claim. See console for details.`);
    }
  };

  const handleViewFiles = async (claim: Claim) => {
    setSelectedClaim(claim);
    setViewFilesModal(true);
    setLoadingFiles(true);
    setClaimFiles({ photos: [], documents: [] });

    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const insurerAddress = await signer.getAddress();
        
        const files = await getClaimFiles(claim.cid, insurerAddress);
        if (files) {
          setClaimFiles(files);
        }
      }
    } catch (error) {
      console.error('Error fetching claim files:', error);
      alert('Failed to decrypt claim files. Ensure you are the authorized insurer.');
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white text-2xl font-semibold">Pending Claims</h2>
          <p className="text-gray-400 text-sm mt-1">
            Review and process pending insurance claims
          </p>
        </div>
        <div className="bg-amber-900 px-4 py-2 rounded-lg">
          <p className="text-amber-200 text-sm">Awaiting Review</p>
          <p className="text-white font-bold text-2xl">{pendingClaims.length}</p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">All Pending Claims</h3>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading pending claims...</div>
        ) : pendingClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Patient
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Type</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Description
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Amount
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Date</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingClaims.map((claim) => (
                  <tr
                    key={claim.claimId}
                    className="border-b border-gray-800 hover:bg-gray-800 transition"
                  >
                    <td className="text-white py-3 px-4 text-sm font-semibold">
                      #{claim.claimId}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {formatAddress(claim.patientAddress)}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">
                        {claim.claimType}
                      </span>
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm max-w-xs">
                      {claim.description}
                    </td>
                    <td className="text-white py-3 px-4 text-sm font-semibold">
                      {formatCurrency(claim.requestedAmount)}
                    </td>
                    <td className="text-gray-400 py-3 px-4 text-sm">
                      {formatDate(claim.submittedTimestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFiles(claim)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="View Files"
                        >
                          <Eye size={14} /> Files
                        </button>
                        <button
                          onClick={() => handleClaimAction(claim, 'approve')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleClaimAction(claim, 'reject')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <FileText size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No pending claims found</p>
            <p className="text-sm mt-2">All claims have been processed</p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`p-2 rounded-full ${
                  modalAction === 'approve' ? 'bg-green-900' : 'bg-red-900'
                }`}
              >
                {modalAction === 'approve' ? (
                  <Check className="text-green-300" size={24} />
                ) : (
                  <X className="text-red-300" size={24} />
                )}
              </div>
              <div>
                <h3 className="text-white text-xl font-semibold">
                  {modalAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
                </h3>
                <p className="text-gray-400 text-sm">
                  Claim #{selectedClaim.claimId}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Patient Info */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Patient Address</p>
                    <p className="text-white text-sm font-mono">
                      {formatAddress(selectedClaim.patientAddress)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Claim Type</p>
                    <p className="text-white text-sm">{selectedClaim.claimType}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">Description</p>
                <p className="text-white text-sm">{selectedClaim.description}</p>
              </div>

              {/* Amount */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">Requested Amount</p>
                <p className="text-white font-bold text-2xl">
                  {formatCurrency(selectedClaim.requestedAmount)}
                </p>
              </div>

              {/* Approved Amount Input (if approving) */}
              {modalAction === 'approve' && (
                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    Approved Amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    max={selectedClaim.requestedAmount}
                    className="w-full bg-gray-800 text-white border border-gray-600 focus:border-blue-500 rounded-lg px-4 py-3 text-lg font-semibold outline-none transition"
                    placeholder="0"
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Maximum: {formatCurrency(selectedClaim.requestedAmount)}
                  </p>
                </div>
              )}

              {/* Notes/Reason */}
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  {modalAction === 'approve' ? 'Notes (Optional)' : 'Rejection Reason'}{' '}
                  {modalAction === 'reject' && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-600 focus:border-blue-500 rounded-lg px-4 py-3 h-28 outline-none transition resize-none"
                  placeholder={
                    modalAction === 'approve'
                      ? 'Add approval notes (optional)...'
                      : 'Provide a detailed rejection reason...'
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitAction}
                disabled={
                  (modalAction === 'approve' && !approvedAmount) ||
                  (modalAction === 'reject' && !notes)
                }
                className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {modalAction === 'approve' ? '✓ Approve Claim' : '✗ Reject Claim'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Files Modal */}
      {viewFilesModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-3xl w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white text-xl font-semibold">Claim Documents</h3>
              <button onClick={() => setViewFilesModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            {loadingFiles ? (
              <div className="text-center py-12 text-gray-400">Decrypting files...</div>
            ) : (
              <div className="space-y-6">
                {/* Photos */}
                <div>
                  <h4 className="text-white font-semibold mb-3">Photos</h4>
                  {claimFiles.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {claimFiles.photos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={`data:${photo.type};base64,${photo.content}`} 
                            alt={photo.name}
                            className="w-full h-40 object-cover rounded-lg border border-gray-700"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <a 
                              href={`data:${photo.type};base64,${photo.content}`} 
                              download={photo.name}
                              className="text-white bg-blue-600 px-3 py-1 rounded text-sm"
                            >
                              Download
                            </a>
                          </div>
                          <p className="text-gray-400 text-xs mt-1 truncate">{photo.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No photos attached.</p>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <h4 className="text-white font-semibold mb-3">Documents</h4>
                  {claimFiles.documents.length > 0 ? (
                    <div className="space-y-2">
                      {claimFiles.documents.map((doc, idx) => (
                        <div key={idx} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-blue-400" size={20} />
                            <span className="text-gray-200 text-sm">{doc.name}</span>
                          </div>
                          <a 
                            href={`data:${doc.type};base64,${doc.content}`} 
                            download={doc.name}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No documents attached.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingClaimsPage;