import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import FileUploadField from './FileUploadField';
import {
  getAdminPublicKey,
  getAdmins,
  requestRoleUpgrade,
  submitRoleUpgradeRequest,
} from '@/lib/integration';
import { ethers } from 'ethers';
import { print } from '../../utils/toast';
import { ToastContainer, toast } from 'react-toastify';

interface RoleUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}

const RoleUpgradeModal: React.FC<RoleUpgradeModalProps> = ({
  isOpen,
  onClose,
  selectedRole,
  setSelectedRole,
}) => {
  const [files, setFiles] = useState<{
    license: File | null;
    id: File | null;
    proof: File | null;
  }>({
    license: null,
    id: null,
    proof: null,
  });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [organization, setOrganization] = useState('');
  const [admins, setAdmins] = useState<string[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string[]>([]);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setAdditionalInfo('');
      setOrganization('');
      setFiles({ license: null, id: null, proof: null });
      setSelectedAdmin([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      getAdmins()
        .then(setAdmins)
        .catch((err) => console.error('Failed to fetch admins', err));
    }
  }, [isOpen]);

  useEffect(() => {
    const admins = getAdmins();
    console.log('Admins from contract:', admins);
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(
          window.ethereum as ethers.providers.ExternalProvider
        );
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setAddress(userAddress);
      }
    };
    if (isOpen) fetchAddress();
  }, [isOpen]);

  const handleSubmit = async () => {
    try {
      if (!selectedRole) {
        print('Please ensure a role is selected', 'warning', ()=> {});
        return;
      } else if (selectedAdmin.length === 0) {
        print('Please select an admin', 'warning', ()=> {});
        return;
      } else if (!files.id || !files.license || !files.proof) {
        print('Please ensure all files are attached', 'warning', ()=> {});
        return;
      } else {
        console.log('No error so far');
        console.log(selectedRole); //admin logged
        console.log(typeof files.id); //object logged
        console.log(typeof organization); //string logged
        console.log(typeof selectedAdmin); //object logged
        const adminPublicKeys = await Promise.all(
          selectedAdmin.map(async (addr) => await getAdminPublicKey(addr))
        );
        console.log(typeof adminPublicKeys); //object logged
        console.log(adminPublicKeys);

        await submitRoleUpgradeRequest(
          address,
          { id: files.id, license: files.license, proof: files.proof },
          {
            role: selectedRole,
            organization: organization,
            additionalInfo: additionalInfo,
          },
          selectedAdmin,
          adminPublicKeys
        );
        print('You successfully requested for a role upgrade!', 'success', () =>
          onClose()
        );
      }
    } catch (err: any) {
      console.error('Error submitting request: ', err);

      // Clean up the error message
      let errorMessage = 'Failed to submit request';

      if (err.reason) {
        errorMessage = err.reason.replace('execution reverted: ', '');
        print(errorMessage, 'error', () => {});

        console.log('Error message:', errorMessage);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 h-full">
      <ToastContainer />
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-white text-xl font-semibold">
            Request Role Upgrade
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Role Selection */}
          <div>
            <label className="text-white mb-3 block">
              I want to register as:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                <input
                  type="radio"
                  name="role"
                  value="healthcare"
                  checked={selectedRole === 'healthcare'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white">
                  Healthcare Provider (Doctor/Nurse)
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                <input
                  type="radio"
                  name="role"
                  value="insurance"
                  checked={selectedRole === 'insurance'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white">Insurance Provider</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-white">Admin</span>
              </label>
            </div>
          </div>

          {/* File Uploads */}
          <div>
            <h3 className="text-white font-semibold mb-3">
              Verification Documents Required:
            </h3>
            <div className="space-y-3">
              <FileUploadField
                label="Medical License / Insurance License"
                file={files.license}
                onChange={(e) =>
                  setFiles({ ...files, license: e.target.files?.[0] || null })
                }
              />
              <FileUploadField
                label="Government ID"
                file={files.id}
                onChange={(e) =>
                  setFiles({ ...files, id: e.target.files?.[0] || null })
                }
              />
              <FileUploadField
                label="Proof of Practice/Organization"
                file={files.proof}
                onChange={(e) =>
                  setFiles({ ...files, proof: e.target.files?.[0] || null })
                }
              />
            </div>
          </div>

          {/* Hospital/Organization field */}
          <div>
            <label className="text-white mb-2 block">Organization Name:</label>
            <textarea
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Hospital/Organization name"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={1}
            />
          </div>

          <div>
            <label className="text-white mb-2 block">
              Select Admin Reviewers:
            </label>
            <div className="space-y-2">
              {admins.length === 0 ? (
                <p className="text-gray-400">No admins available.</p>
              ) : (
                admins.map((adminAddr) => (
                  <label
                    key={adminAddr}
                    className="flex items-center gap-2 text-white"
                  >
                    <input
                      type="checkbox"
                      value={adminAddr}
                      checked={selectedAdmin.includes(adminAddr)}
                      onChange={(e) => {
                        const { checked, value } = e.target;
                        setSelectedAdmin((prev: any) =>
                          checked
                            ? [...prev, value]
                            : prev.filter((a: any) => a !== value)
                        );
                      }}
                    />
                    {adminAddr.slice(0, 6)}...{adminAddr.slice(-4)}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <label className="text-white mb-2 block">
              Additional Information:
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="License number, years of practice, specialty..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={4}
            />
          </div>

          {/* Status Info */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-200 text-sm mb-1">
              <strong>Status:</strong> Your request will be reviewed by admins
            </p>
            <p className="text-blue-300 text-sm">
              Typical review time: 2-3 business days
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text
              -white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedRole}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleUpgradeModal;
