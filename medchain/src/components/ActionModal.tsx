"use client";


//components/ActionModal.tsx
import React, { useState } from 'react'
  
  const ActionModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [approvedAmount, setApprovedAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [modalAction, setModalAction] = useState('');
    const [selectedClaim, setSelectedClaim] = useState(null);
    const formatCurrency = (amount: string) => `$${amount.toLocaleString()}`;
    const handleSubmitAction = () => {
      if(!selectedClaim) return;
      console.log(`${modalAction} claim #${selectedClaim.claimId}`, {
        approvedAmount: modalAction === 'approve' ? approvedAmount : 0,
        notes,
      });
      setShowModal(false);
    }

    return(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-white text-xl font-semibold mb-4">
          {modalAction === 'approve' ? 'Approve Claim' : 'Reject Claim'} #{selectedClaim?.claimId}
        </h3>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-800 p-3 rounded">
            <p className="text-gray-400 text-sm">Requested Amount</p>
            <p className="text-white font-semibold">{formatCurrency(selectedClaim?.requestedAmount)}</p>
          </div>
          {modalAction === 'approve' && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Approved Amount</label>
              <input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} max={selectedClaim?.requestedAmount} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2" placeholder="Enter approved amount" />
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{modalAction === 'approve' ? 'Notes' : 'Rejection Reason'}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 h-24" placeholder={modalAction === 'approve' ? 'Add notes...' : 'Provide rejection reason...'} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSubmitAction} className={`flex-1 px-4 py-2 rounded font-semibold ${modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}>
            {modalAction === 'approve' ? 'Approve' : 'Reject'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold">Cancel</button>
        </div>
      </div>
    </div>
    )
  }


export default ActionModal
