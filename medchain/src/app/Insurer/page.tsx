'use client';

import React, { useEffect, useState } from 'react';
import { getClaimsByInsurer, getClaimDetails, getInsurerStatistics, getRole } from '@/lib/integration';
import InsurerSharedRecordsTable from '@/components/InsurerSharedRecordsTable';
import { GiSkeleton } from 'react-icons/gi';
import { ethers } from 'ethers';
import { UserRole } from '../../../utils/userRole';
import useStore from '@/store/userStore';

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

const STATUS_MAP = ['Pending', 'Approved', 'Rejected'];

const InsurerDashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalRequestedAmount: 0,
    totalApprovedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const setRole = useStore((state) => state.setRole);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const userAddress = await signer.getAddress();
          setWalletAddress(userAddress);
          
          // Check verification status from blockchain
          const userRole = await getRole(userAddress);
          const userIsVerified = userRole === UserRole.Insurer;
          setIsVerified(userIsVerified);
          
          // Set role in store for Topbar navigation
          // Set 'Insurer' for both verified insurers AND unverified users with pending requests
          // This allows profile navigation to work correctly
          setRole('Insurer');
          
          if (!userIsVerified) {
            setLoading(false);
            return;
          }
          
          // Only fetch data if verified
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts[0]) {
            // Fetch Claims
            const claimIds = await getClaimsByInsurer(accounts[0]);
            const details = await getClaimDetails(claimIds);
            
            // Transform BigNumbers
            const formattedClaims = details.map((c: any) => ({
              ...c,
              claimId: c.claimId.toNumber(),
              requestedAmount: c.requestedAmount.toNumber(),
              approvedAmount: c.approvedAmount.toNumber(),
              status: c.status,
              submittedTimestamp: c.submittedTimestamp.toNumber(),
              processedTimestamp: c.processedTimestamp.toNumber(),
            }));
            
            // Sort by ID desc
            setClaims(formattedClaims.reverse());

            // Fetch Stats
            const statistics = await getInsurerStatistics(accounts[0]);
            if (statistics) {
              setStats({
                totalClaims: statistics.totalClaims.toNumber(),
                pendingClaims: statistics.pendingClaims.toNumber(),
                approvedClaims: statistics.approvedClaims.toNumber(),
                rejectedClaims: statistics.rejectedClaims.toNumber(),
                totalRequestedAmount: statistics.totalRequestedAmount.toNumber(),
                totalApprovedAmount: statistics.totalApprovedAmount.toNumber(),
              });
            }
          }
        } catch (error) {
          console.error('Failed to load dashboard data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, []);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <h2 className="text-white text-xl font-semibold mb-2">Insurer Dashboard</h2>
        <p className="text-blue-200 mb-4">
          Wallet: {walletAddress ? formatAddress(walletAddress) : 'Connecting...'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-700 px-4 py-3 rounded-lg">
            <p className="text-blue-200 text-sm">Total Claims</p>
            <p className="text-white font-bold text-2xl">{stats.totalClaims}</p>
          </div>
          <div className="bg-amber-600 px-4 py-3 rounded-lg">
            <p className="text-amber-100 text-sm">Pending</p>
            <p className="text-white font-bold text-2xl">{stats.pendingClaims}</p>
          </div>
          <div className="bg-green-600 px-4 py-3 rounded-lg">
            <p className="text-green-100 text-sm">Approved</p>
            <p className="text-white font-bold text-2xl">{stats.approvedClaims}</p>
          </div>
          <div className="bg-red-600 px-4 py-3 rounded-lg">
            <p className="text-red-100 text-sm">Rejected</p>
            <p className="text-white font-bold text-2xl">{stats.rejectedClaims}</p>
          </div>
        </div>
      </div>

      {/* Shared Records Table */}
      <InsurerSharedRecordsTable walletAddress={walletAddress} claims={claims} isVerified={isVerified} />

      {/* Recent Claims */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Recent Claims</h3>
        {loading ? (
          <p className="text-gray-400">Loading claims...</p>
        ) : claims.length === 0 ? (
          isVerified ? (
            <p className="text-gray-400">No claims found.</p>
          ) : (
            <div className="text-center justify-items-center py-8 text-gray-400">
              <GiSkeleton size={64} className="mx-auto mb-3 opacity-50" />
              <p>Your account is awaiting verification</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {claims.slice(0, 3).map((claim) => (
              <div
                key={claim.claimId}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-semibold">Claim #{claim.claimId}</p>
                    <p className="text-gray-400 text-sm">{claim.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Patient: {formatAddress(claim.patientAddress)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {formatCurrency(claim.requestedAmount)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                        claim.status === 0 // Pending
                          ? 'bg-amber-900 text-amber-200'
                          : claim.status === 1 // Approved
                          ? 'bg-green-900 text-green-200'
                          : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {STATUS_MAP[claim.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsurerDashboard;