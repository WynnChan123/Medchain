'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, FileText, AlertCircle, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { ethers } from 'ethers';
import { submitClaim, getInsurers } from '@/lib/integration';
import { print } from '../../utils/toast';

interface SubmitClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    recordId: string;
    cid: string;
    metadata: {
      requestId: string;
      recordType: string;
      [key: string]: any;
    };
  };
  onSuccess?: () => void;
}

const CLAIM_TYPES = [
  'Consultation',
  'Surgery',
  'Diagnostic',
  'Treatment',
  'Hospitalization',
  'Emergency',
  'Prescription',
  'Laboratory',
  'Radiology',
  'Therapy',
];

interface Insurer {
  address: string;
  name?: string; // optional if added later
}

const SubmitClaimModal: React.FC<SubmitClaimModalProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess,
}) => {
  const [insurers, setInsurers] = useState<{ address: string; name: string }[]>([]);
  const [loadingInsurers, setLoadingInsurers] = useState(false);
  const [insurerAddress, setInsurerAddress] = useState('');
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [claimType, setClaimType] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Refs for file inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Fetch insurers when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchInsurers = async () => {
        setLoadingInsurers(true);
        try {
          const insurerAddresses = await getInsurers();
          const formattedInsurers = insurerAddresses.map((i: Insurer) => ({
            address: i.address,
            name: `${i.name} ${i.address.slice(0, 6)}...${i.address.slice(-4)}`,
          }));
          setInsurers(formattedInsurers);
        } catch (err) {
          console.error('Failed to fetch insurers:', err);
          setError('Failed to load insurers. Please try again.');
        } finally {
          setLoadingInsurers(false);
        }
      };

      fetchInsurers();
      
      // Reset form
      setInsurerAddress('');
      setRequestedAmount(0);
      setClaimType('');
      setDescription('');
      setPhotos([]);
      setDocuments([]);
      setError('');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'document') => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (type === 'photo') {
        setPhotos((prev) => [...prev, ...newFiles]);
      } else {
        setDocuments((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const removeFile = (index: number, type: 'photo' | 'document') => {
    if (type === 'photo') {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      // Reset the file input to allow re-uploading the same file
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    } else {
      setDocuments((prev) => prev.filter((_, i) => i !== index));
      // Reset the file input to allow re-uploading the same file
      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, type: 'photo' | 'document') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (type === 'photo') {
        // Filter for images if needed, but for now accept all dropped
        setPhotos((prev) => [...prev, ...newFiles]);
      } else {
        setDocuments((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!insurerAddress) {
      setError('Please select an insurer');
      return;
    }
    if (!requestedAmount || requestedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!claimType) {
      setError('Please select a claim type');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (!window.ethereum) {
        setError('MetaMask or Web3 wallet not detected. Please install a wallet extension.');
        setIsSubmitting(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
    
      const tx = await submitClaim(
        insurerAddress,
        record.recordId, 
        requestedAmount,
        claimType,
        description,
        { photos, documents } // Pass files object
      );
      await tx.wait(); // Wait for transaction confirmation
      setSuccess(true);
      print('Claim submitted successfully!', 'success', ()=> {});
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
        onSuccess?.();
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting claim:', err);
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-full">
              <FileText className="text-blue-300" size={24} />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Submit Insurance Claim</h2>
              <p className="text-gray-400 text-sm">Record: {record.metadata.requestId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-20 text-green-400">
              <Check size={64} className="mb-4" />
              <p className="text-2xl font-semibold">Claim Submitted Successfully!</p>
              <p className="text-gray-400 text-sm mt-2">Closing modal...</p>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-400 mt-0.5" size={20} />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

          {/* Record Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-semibold mb-3">Medical Record Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Record ID</p>
                <p className="text-white font-mono">{record.recordId}</p>
              </div>
              <div>
                <p className="text-gray-400">Type</p>
                <p className="text-white">{record.metadata.recordType}</p>
              </div>
            </div>
          </div>

          {/* Select Insurer */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Select Insurer <span className="text-red-400">*</span>
            </label>
            <select
              value={insurerAddress}
              onChange={(e) => setInsurerAddress(e.target.value)}
              disabled={loadingInsurers}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none disabled:opacity-50"
            >
              <option value="" disabled>
                {loadingInsurers ? 'Loading insurers...' : '-- Choose an insurer --'}
              </option>
              {insurers.map((insurer) => (
                <option key={insurer.address} value={insurer.address}>
                  {insurer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Claim Type */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Claim Type <span className="text-red-400">*</span>
            </label>
            <select
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:border-purple-500 outline-none"
            >
              <option value="" disabled>-- Select claim type --</option>
              {CLAIM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Amount */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Requested Amount (USD) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 outline-none text-lg font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Claim Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about your claim (e.g., procedure performed, diagnosis, treatment received)..."
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 h-32 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Photos */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Photos (Proof)
              </label>
              <div 
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer bg-gray-800/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'photo')}
                onClick={() => photoInputRef.current?.click()}
              >
                <ImageIcon className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-gray-300 text-sm">Drag & drop photos</p>
                <p className="text-gray-500 text-xs mt-1">or click to browse</p>
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  onChange={(e) => handleFileChange(e, 'photo')} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
              </div>
              {/* File List */}
              {photos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {photos.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ImageIcon size={14} className="text-blue-400 flex-shrink-0" />
                        <span className="text-gray-300 text-xs truncate">{file.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(idx, 'photo'); }} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Documents (Invoices/Reports)
              </label>
              <div 
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer bg-gray-800/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'document')}
                onClick={() => docInputRef.current?.click()}
              >
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-gray-300 text-sm">Drag & drop documents</p>
                <p className="text-gray-500 text-xs mt-1">or click to browse</p>
                <input 
                  type="file" 
                  ref={docInputRef} 
                  onChange={(e) => handleFileChange(e, 'document')} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt" 
                  multiple 
                />
              </div>
              {/* File List */}
              {documents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {documents.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-purple-400 flex-shrink-0" />
                        <span className="text-gray-300 text-xs truncate">{file.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(idx, 'document'); }} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-400 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="text-blue-200 font-semibold mb-1">Before submitting:</p>
              <ul className="text-blue-300 space-y-1 list-disc list-inside">
                <li>Ensure the insurer has access to your medical record</li>
                <li>Double-check the requested amount</li>
                <li>Attach all relevant proof (photos/invoices)</li>
              </ul>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting Claim...
                </>
              ) : (
                'Submit Claim'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitClaimModal;