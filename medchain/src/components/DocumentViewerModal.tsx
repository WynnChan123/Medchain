// components/DocumentViewerModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import {
  fetchAndDecryptDocuments,
  base64ToBlob,
  downloadFile,
} from '@/lib/decryption';
import { BigNumber } from 'ethers';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  requesterAddress: string;
}

interface DecryptedDocument {
  name: string;
  file: {
    name: string;
    type: string;
    base64: string;
  };
  metadata: {
    role: string;
    organization: string;
    additionalInfo: string;
    patient: string;
    timestamp: string;
  };
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requesterAddress,
}) => {
  const [documents, setDocuments] = useState<DecryptedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DecryptedDocument | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, requestId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const decryptedDocs = await fetchAndDecryptDocuments(requestId);
      setDocuments(decryptedDocs);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to decrypt documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (doc: DecryptedDocument) => {
    // Clear previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const blob = base64ToBlob(doc.file.base64, doc.file.type);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setSelectedDoc(doc);
  };

  const handleDownload = (doc: DecryptedDocument) => {
    const blob = base64ToBlob(doc.file.base64, doc.file.type);
    downloadFile(blob, doc.file.name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-white text-xl font-semibold">
              Request #{requestId} - Documents
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Requester: {requesterAddress.slice(0, 6)}...
              {requesterAddress.slice(-4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
              <p className="text-gray-400">Decrypting documents...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && documents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document List */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold mb-4">Documents</h3>
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-600 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="text-blue-400" size={24} />
                        <div>
                          <h4 className="text-white font-medium">
                            {doc.file.name}
                          </h4>
                          <p className="text-gray-400 text-xs">{doc.file.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Organization:</span>
                        <span className="text-white">
                          {doc.metadata.organization}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Role Requested:</span>
                        <span className="text-blue-400 capitalize">
                          {doc.metadata.role}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Additional Info:</span>
                        <p className="text-white mt-1">
                          {doc.metadata.additionalInfo}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Panel */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 sticky top-0">
                <h3 className="text-white font-semibold mb-4">Preview</h3>
                {selectedDoc && previewUrl ? (
                  <div className="space-y-4">
                    <div className="bg-gray-900 rounded p-2 max-h-[500px] overflow-auto">
                      {selectedDoc.file.type.startsWith('image/') ? (
                        <img
                          src={previewUrl}
                          alt={selectedDoc.file.name}
                          className="w-full h-auto rounded"
                        />
                      ) : selectedDoc.file.type === 'application/pdf' ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-[500px] rounded"
                          title={selectedDoc.file.name}
                        />
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <FileText size={48} className="mx-auto mb-3 opacity-50" />
                          <p>Preview not available for this file type</p>
                          <button
                            onClick={() => handleDownload(selectedDoc)}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                          >
                            Download to View
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Select a document to preview</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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

export default DocumentViewerModal;
