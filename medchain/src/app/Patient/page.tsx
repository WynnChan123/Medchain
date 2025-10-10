'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Settings, Eye, FileText, Plus, X, Clock } from 'lucide-react';
import useStore from '@/store/userStore';


const PatientDashboard = () => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showPendingBanner, setShowPendingBanner] = useState(false);
  const role = useStore((state) => state.role)
  
  useEffect(() => {
    // Get wallet address from your Connect component or Web3 provider
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts[0]) {
            setWalletAddress(`${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
          }
        });
    }
  }, []);

  // Mock data - replace with actual blockchain data
  const medicalRecords = [
    { id: 'LAB_001', type: 'Blood Test', date: '2025-01-15', status: 'Complete' },
    { id: 'XRAY_002', type: 'X-Ray', date: '2025-01-10', status: 'Complete' },
  ];

  const sharedWith = [
    { provider: 'Dr. Smith', address: '0x456...789', recordId: 'LAB_001' },
    { provider: 'Dr. Jones', address: '0x789...abc', recordId: 'XRAY_002' },
  ];

  return (
    <div className="space-y-6">
      {/* Pending Banner */}
      {showPendingBanner && (
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 flex items-start gap-4">
          <Clock className="text-yellow-400 mt-1" size={20} />
          <div className="flex-1">
            <h3 className="text-yellow-100 font-semibold mb-1">⏳ Role Upgrade Pending</h3>
            <p className="text-yellow-200 text-sm mb-2">
              Your request to become a Healthcare Provider is under review. You'll be notified once an admin approves.
            </p>
            <p className="text-yellow-300 text-xs mb-3">Submitted: {new Date().toLocaleDateString()}</p>
            <div className="flex gap-3">
              <button className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm">
                View Details
              </button>
              <button 
                onClick={() => setShowPendingBanner(false)}
                className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-xl font-semibold mb-2">
          Welcome back, {walletAddress || '0x1234...5678'}
        </h2>
        <p className="text-blue-200 mb-4">Current Role: {role}</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-blue-100 text-sm">Want to become a Healthcare Provider or Insurer?</p>
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-4 py-2 bg-white text-blue-900 rounded-lg font-medium hover:bg-blue-50 transition flex items-center gap-2 text-sm"
          >
            Request Role Upgrade →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard 
            icon={<Upload size={24} />}
            title="Add Medical Record"
            description="Upload new medical documents"
            buttonText="+ Upload"
          />
          <ActionCard 
            icon={<Settings size={24} />}
            title="Manage Access"
            description="Control who sees your records"
            buttonText="Settings"
          />
          <ActionCard 
            icon={<Eye size={24} />}
            title="View Access History"
            description="See who accessed your data"
            buttonText="View Log"
          />
        </div>
      </div>

      {/* Medical Records */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">My Medical Records</h3>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add Record
          </button>
        </div>
        
        {medicalRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Record ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Type</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Date</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicalRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="text-white py-3 px-4 text-sm">{record.id}</td>
                    <td className="text-gray-300 py-3 px-4 text-sm">{record.type}</td>
                    <td className="text-gray-300 py-3 px-4 text-sm">{record.date}</td>
                    <td className="py-3 px-4">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
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
            <p>No records yet - Add your first medical record</p>
          </div>
        )}
      </div>

      {/* Shared With */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Shared With</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Provider</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Records Shared</th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sharedWith.map((share, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="text-white py-3 px-4 text-sm">
                    {share.provider} <span className="text-gray-500 text-xs">({share.address})</span>
                  </td>
                  <td className="text-gray-300 py-3 px-4 text-sm">{share.recordId}</td>
                  <td className="py-3 px-4">
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Upgrade Modal */}
      {showRoleModal && (
        <RoleUpgradeModal 
          onClose={() => setShowRoleModal(false)}
          onSubmit={(role) => {
            setShowPendingBanner(true);
            setShowRoleModal(false);
          }}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />
      )}
    </div>
  );
};

// Action Card Component
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, buttonText }) => (
  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-blue-600 transition">
    <div className="text-blue-400 mb-3">{icon}</div>
    <h4 className="text-white font-semibold mb-2">{title}</h4>
    <p className="text-gray-400 text-sm mb-4">{description}</p>
    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
      {buttonText}
    </button>
  </div>
);

// Role Upgrade Modal Component
interface RoleUpgradeModalProps {
  onClose: () => void;
  onSubmit: (role: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}

const RoleUpgradeModal: React.FC<RoleUpgradeModalProps> = ({ onClose, onSubmit, selectedRole, setSelectedRole }) => {
  const [files, setFiles] = useState<{license: File | null; id: File | null; proof: File | null}>({
    license: null,
    id: null,
    proof: null
  });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [organization, setOrganization] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 h-full">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-white text-xl font-semibold">Request Role Upgrade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Role Selection */}
          <div>
            <label className="text-white mb-3 block">I want to register as:</label>
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
                <span className="text-white">Healthcare Provider (Doctor/Nurse)</span>
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
            <h3 className="text-white font-semibold mb-3">Verification Documents Required:</h3>
            <div className="space-y-3">
              <FileUploadField 
                label="Medical License / Insurance License"
                file={files.license}
                onChange={(e) => setFiles({...files, license: e.target.files?.[0] || null})}
              />
              <FileUploadField 
                label="Government ID"
                file={files.id}
                onChange={(e) => setFiles({...files, id: e.target.files?.[0] || null})}
              />
              <FileUploadField 
                label="Proof of Practice/Organization"
                file={files.proof}
                onChange={(e) => setFiles({...files, proof: e.target.files?.[0] || null})}
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

          {/* Additional Information */}
          <div>
            <label className="text-white mb-2 block">Additional Information:</label>
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
              onClick={() => onSubmit(selectedRole)}
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

// File Upload Field Component
interface FileUploadFieldProps {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({ label, file, onChange }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <label className="text-white text-sm mb-2 block">{label}</label>
    <div className="flex items-center gap-3">
      <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm">
        Choose File
        <input type="file" onChange={onChange} className="hidden" />
      </label>
      <span className="text-gray-400 text-sm">
        {file ? file.name : 'No file chosen'}
      </span>
    </div>
  </div>
);

export default PatientDashboard;