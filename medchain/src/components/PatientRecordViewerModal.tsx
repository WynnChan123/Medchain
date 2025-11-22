import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, X } from 'lucide-react';
import {
  base64ToBlob,
  downloadFile,
  fetchAndDecryptPatientRecord,
} from '@/lib/decryption';
import { fetchAndDecryptSharedRecord } from '@/lib/integration';
import { ethers } from 'ethers';
import useStore from '@/store/userStore';
import { UserRole } from '../../utils/userRole';

interface PatientRecordViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  patientAddress: string;
}

interface PatientRecordDocument {
  recordId: string;
  cid: string;
  file: {
    name: string;
    type: string;
    base64: string;
  };
  metadata: {
    recordType?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

const PatientRecordViewerModal: React.FC<PatientRecordViewerModalProps> = ({
  isOpen,
  onClose,
  recordId,
  patientAddress,
}) => {
  const [document, setDocument] = useState<PatientRecordDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const role = useStore((state) => state.role);

useEffect(() => {
  if (!isOpen) {
    return;
  }

  if (!recordId) {
    setError('No record selected.');
    return;
  }

  const loadRecord = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found. Please install MetaMask.");
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      let decryptedRecord;
      
      // If the user is a Healthcare Provider or Admin, use the shared record decryption
      if (role === 'HealthcareProvider' || role === 'Admin' || role === 'Insurer') {
        console.log('🏥 Decrypting as shared record (Doctor/Admin)...');
        console.log('Patient address:', patientAddress);
        console.log('Record ID:', recordId);
        console.log('Doctor address:', userAddress);
        
        // This function does everything: gets key, decrypts key, fetches doc, decrypts doc
        decryptedRecord = await fetchAndDecryptSharedRecord(
          patientAddress,
          recordId,
          userAddress
        );
        
        console.log('✅ Shared record decrypted successfully');
      } else {
        // Patient viewing their own record
        console.log('👤 Decrypting as patient record...');
        decryptedRecord = await fetchAndDecryptPatientRecord(
          userAddress,
          recordId
        );
        console.log('✅ Patient record decrypted successfully');
      }

      setDocument(decryptedRecord);
    } catch (err: any) {
      console.error('❌ Failed to load patient record:', err);
      setError(err?.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  loadRecord();
}, [isOpen, patientAddress, recordId, role]);

  useEffect(() => {
    if (!document?.file?.base64) {
      return;
    }

    try {
      const blob = base64ToBlob(document.file.base64, document.file.type);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Unable to create preview URL:', err);
      setPreviewUrl(null);
    }
  }, [document]);

  useEffect(() => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setDocument(null);
      setError(null);
    }
  }, [isOpen, previewUrl]);

  if (!isOpen) {
    return null;
  }

  const formattedTimestamp = useMemo(() => {
    if (!document?.metadata?.timestamp) {
      return 'Unknown';
    }
    const date = new Date(document.metadata.timestamp);
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }, [document?.metadata?.timestamp]);

  const handleDownload = () => {
    if (!document?.file?.base64) {
      return;
    }
    const blob = base64ToBlob(document.file.base64, document.file.type);
    downloadFile(blob, document.file.name || `${recordId}.bin`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-white text-xl font-semibold">Medical Record</h2>
            {recordId && (
              <p className="text-gray-400 text-sm mt-1">Record ID: {recordId}</p>
            )}

          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
              <p className="text-gray-400">Decrypting record...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && document && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
                  <h3 className="text-white font-semibold">Record Details</h3>
                  <div className="text-sm text-gray-300 space-y-2">
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="ml-2 text-white">
                        {document.metadata.recordType || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <span className="ml-2 text-white">{formattedTimestamp}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">File name:</span>
                      <span className="ml-2 text-white">
                        {document.file.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">File type:</span>
                      <span className="ml-2 text-white">
                        {document.file.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h3 className="text-white font-semibold mb-4">Preview</h3>
                  {previewUrl && document.file.type.startsWith('image/') && (
                    <img
                      src={previewUrl}
                      alt={document.file.name}
                      className="w-full h-auto max-h-[500px] object-contain rounded"
                    />
                  )}
                  {previewUrl && document.file.type === 'application/pdf' && (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[500px] rounded"
                      title={document.file.name}
                    />
                  )}
                  {(!previewUrl ||
                    (!document.file.type.startsWith('image/') &&
                      document.file.type !== 'application/pdf')) && (
                    <div className="text-center py-12 text-gray-400">
                      <FileText size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Preview not available for this file type.</p>
                      <button
                        onClick={handleDownload}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        Download to view
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-800 border-t border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientRecordViewerModal;



