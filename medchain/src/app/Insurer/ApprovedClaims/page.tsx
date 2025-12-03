'use client';

import { FileText, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getClaimsByInsurer, getClaimDetails } from '@/lib/integration';
import { ethers } from 'ethers';

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

const ApprovedClaimsPage = () => {
  const [approvedClaims, setApprovedClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          
          const claimIds = await getClaimsByInsurer(address);
          const details = await getClaimDetails(claimIds);
          
          const approved = details
            .map((c: any) => ({
              ...c,
              claimId: c.claimId.toNumber(),
              requestedAmount: c.requestedAmount.toNumber(),
              approvedAmount: c.approvedAmount.toNumber(),
              status: c.status,
              submittedTimestamp: c.submittedTimestamp.toNumber(),
              processedTimestamp: c.processedTimestamp.toNumber(),
            }))
            .filter((c: any) => c.status === 1); // 1 = Approved
            
          setApprovedClaims(approved);
        } catch (error) {
          console.error('Error fetching approved claims:', error);
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

  const totalRequested = approvedClaims.reduce(
    (sum, c) => sum + c.requestedAmount,
    0
  );
  const totalApproved = approvedClaims.reduce(
    (sum, c) => sum + c.approvedAmount,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-white text-2xl font-semibold">Approved Claims</h2>
        <p className="text-gray-400 text-sm mt-1">
          Successfully processed insurance claims
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-900 to-green-800 p-5 rounded-lg border border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-300" size={24} />
            <p className="text-green-200 text-sm font-medium">Total Approved</p>
          </div>
          <p className="text-white font-bold text-3xl">
            {approvedClaims.length}
          </p>
          <p className="text-green-300 text-xs mt-1">Claims processed</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-5 rounded-lg border border-blue-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-300" size={24} />
            <p className="text-blue-200 text-sm font-medium">Total Requested</p>
          </div>
          <p className="text-white font-bold text-3xl">
            {formatCurrency(totalRequested)}
          </p>
          <p className="text-blue-300 text-xs mt-1">Amount claimed</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 p-5 rounded-lg border border-emerald-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-emerald-300" size={24} />
            <p className="text-emerald-200 text-sm font-medium">Total Approved</p>
          </div>
          <p className="text-white font-bold text-3xl">
            {formatCurrency(totalApproved)}
          </p>
          <p className="text-emerald-300 text-xs mt-1">Amount disbursed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-5 rounded-lg border border-purple-700">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-purple-300" size={24} />
            <p className="text-purple-200 text-sm font-medium">Approval Rate</p>
          </div>
          <p className="text-white font-bold text-3xl">
            {totalRequested > 0 ? Math.round((totalApproved / totalRequested) * 100) : 0}%
          </p>
          <p className="text-purple-300 text-xs mt-1">Of requested amount</p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-white text-lg font-semibold">All Approved Claims</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400">Loading approved claims...</div>
        ) : approvedClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Claim ID
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Patient
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Type
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Description
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Requested
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Approved
                  </th>
                  <th className="text-left text-gray-400 py-4 px-6 text-sm font-semibold">
                    Processed
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvedClaims.map((claim, index) => (
                  <tr
                    key={claim.claimId}
                    className={`border-b border-gray-800 hover:bg-gray-800 transition ${
                      index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span className="text-white font-semibold">
                        #{claim.claimId}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300 font-mono text-sm">
                        {formatAddress(claim.patientAddress)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
                        {claim.claimType}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <span className="text-gray-300 text-sm">
                        {claim.description}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm">
                        {formatCurrency(claim.requestedAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-green-400 font-bold text-sm">
                        {formatCurrency(claim.approvedAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-400 text-sm">
                        {formatDate(claim.processedTimestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <FileText size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No approved claims found</p>
          </div>
        )}
      </div>

      {/* Detailed Approval Cards */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-6">Approval Details</h3>
        <div className="space-y-4">
          {approvedClaims.map((claim) => {
            const approvalPercentage = claim.requestedAmount > 0 
              ? Math.round((claim.approvedAmount / claim.requestedAmount) * 100)
              : 0;
            const isFullApproval = approvalPercentage === 100;

            return (
              <div
                key={claim.claimId}
                className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-green-600 transition"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-bold text-lg">
                        Claim #{claim.claimId}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isFullApproval
                            ? 'bg-green-900 text-green-200'
                            : 'bg-yellow-900 text-yellow-200'
                        }`}
                      >
                        {isFullApproval ? '100% Approved' : `${approvalPercentage}% Partial`}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{claim.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Type: {claim.claimType} • Patient:{' '}
                      {formatAddress(claim.patientAddress)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Approval Progress</span>
                    <span className="text-green-400 font-semibold">
                      {approvalPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isFullApproval ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${approvalPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amount Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-gray-400 text-xs mb-1">Requested</p>
                    <p className="text-white font-bold text-lg">
                      {formatCurrency(claim.requestedAmount)}
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-gray-400 text-xs mb-1">Approved</p>
                    <p className="text-green-400 font-bold text-lg">
                      {formatCurrency(claim.approvedAmount)}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {claim.notes && (
                  <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                    <p className="text-green-300 text-xs font-semibold mb-1">
                      APPROVAL NOTES:
                    </p>
                    <p className="text-green-100 text-sm">{claim.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400">
                  <div>
                    <span className="text-gray-500">Submitted:</span>{' '}
                    {formatDate(claim.submittedTimestamp)}
                  </div>
                  <div>
                    <span className="text-gray-500">Processed:</span>{' '}
                    {formatDate(claim.processedTimestamp)}
                  </div>
                  <div>
                    <span className="text-gray-500">Record ID:</span>{' '}
                    {claim.medicalRecordID}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApprovedClaimsPage;