'use client';

import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { getClaimsByInsurer, getClaimDetails, getRole } from '@/lib/integration';
import { ethers } from 'ethers';
import { GiSkeleton } from 'react-icons/gi';
import { UserRole } from '../../../../utils/userRole';

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

const RejectedPage = () => {
  const [rejectedClaims, setRejectedClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  useEffect(() => {
    const fetchClaims = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          
          // Check verification status from blockchain
          const userRole = await getRole(address);
          const userIsVerified = userRole === UserRole.Insurer;
          setIsVerified(userIsVerified);
          
          if (!userIsVerified) {
            console.log('User is not verified yet (no Insurer role)');
            setLoading(false);
            return;
          }
          
          const claimIds = await getClaimsByInsurer(address);
          const details = await getClaimDetails(claimIds);
          
          const rejected = details
            .map((c: any) => ({
              ...c,
              claimId: c.claimId.toNumber(),
              requestedAmount: c.requestedAmount.toNumber(),
              approvedAmount: c.approvedAmount.toNumber(),
              status: c.status,
              submittedTimestamp: c.submittedTimestamp.toNumber(),
              processedTimestamp: c.processedTimestamp.toNumber(),
            }))
            .filter((c: any) => c.status === 2); // 2 = Rejected
            
          setRejectedClaims(rejected);
        } catch (error) {
          console.error('Error fetching rejected claims:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchClaims();
  }, []);

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString();
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-lg p-6 border border-red-700">
        <h2 className="text-white text-xl font-semibold mb-2">
          Rejected Claims Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-red-800 px-4 py-3 rounded-lg">
            <p className="text-red-200 text-sm">Total Rejected</p>
            <p className="text-white font-bold text-2xl">
              {rejectedClaims.length}
            </p>
          </div>
          <div className="bg-red-800 px-4 py-3 rounded-lg">
            <p className="text-red-200 text-sm">Total Rejected Amount</p>
            <p className="text-white font-bold text-2xl">
              {formatCurrency(
                rejectedClaims.reduce((sum, c) => sum + c.requestedAmount, 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Rejected Claims</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading rejected claims...</div>
        ) : rejectedClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">ID</th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Patient
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Type
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Description
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Requested Amount
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Submitted
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Rejected On
                  </th>
                  <th className="text-left text-gray-400 py-3 px-4 text-sm">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {rejectedClaims.map((claim) => (
                  <tr
                    key={claim.claimId}
                    className="border-b border-gray-800 hover:bg-gray-800"
                  >
                    <td className="text-white py-3 px-4 text-sm">
                      #{claim.claimId}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {formatAddress(claim.patientAddress)}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {claim.claimType}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm max-w-xs truncate">
                      {claim.description}
                    </td>
                    <td className="text-red-400 py-3 px-4 text-sm font-semibold">
                      {formatCurrency(claim.requestedAmount)}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {formatDate(claim.submittedTimestamp)}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm">
                      {formatDate(claim.processedTimestamp)}
                    </td>
                    <td className="text-gray-300 py-3 px-4 text-sm max-w-xs">
                      <span className="truncate">{claim.notes}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          isVerified ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={64} className="mx-auto mb-3 opacity-50" />
              <p>No rejected claims found</p>
            </div>
          ) : (
            <div className="text-center justify-items-center py-8 text-gray-400">
              <GiSkeleton size={64} className="mx-auto mb-3 opacity-50" />
              <p>Your account is awaiting verification</p>
            </div>
          )
        )}
      </div>

      {/* Detailed Rejection Reasons */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">
          Rejection Details
        </h3>
        <div className="space-y-4">
          {rejectedClaims.map((claim) => (
            <div
              key={claim.claimId}
              className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-600"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 mt-1" size={20} />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">
                        Claim #{claim.claimId}
                      </p>
                      <p className="text-gray-400 text-sm">{claim.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Patient: {formatAddress(claim.patientAddress)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-semibold">
                        {formatCurrency(claim.requestedAmount)}
                      </p>
                      <span className="text-gray-500 text-xs">Requested</span>
                    </div>
                  </div>

                  <div className="bg-red-900/20 p-3 rounded mt-3">
                    <p className="text-red-300 text-xs font-semibold mb-1">
                      REJECTION REASON:
                    </p>
                    <p className="text-red-200 text-sm">{claim.notes}</p>
                  </div>

                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                    <div>
                      <span className="text-gray-500">Submitted:</span>{' '}
                      {formatDate(claim.submittedTimestamp)}
                    </div>
                    <div>
                      <span className="text-gray-500">Rejected:</span>{' '}
                      {formatDate(claim.processedTimestamp)}
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      {claim.claimType}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RejectedPage;