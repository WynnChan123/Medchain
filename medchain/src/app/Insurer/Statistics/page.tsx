'use client';

import { BarChart3, DollarSign, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getInsurerStatistics, getRole } from '@/lib/integration';
import { GiSkeleton } from 'react-icons/gi';
import { UserRole } from '../../../../utils/userRole';

const StatisticsPage = () => {
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

  useEffect(() => {
    const fetchStats = async () => {
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
            setLoading(false);
            return;
          }

          const statistics = await getInsurerStatistics(address);
          
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
        } catch (error) {
          console.error('Error fetching statistics:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  if (loading) {
    return <div className="text-white text-center py-12">Loading statistics...</div>;
  }
  
  if (!isVerified) {
    return (
      <div className="space-y-6">
        <h2 className="text-white text-2xl font-semibold">Statistics Overview</h2>
        <div className="bg-gray-900 rounded-lg p-12 border border-gray-700">
          <div className="text-center justify-items-center text-gray-400">
            <GiSkeleton size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Your account is awaiting verification</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-white text-2xl font-semibold">Statistics Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 rounded-lg border border-blue-700">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-blue-300" size={24} />
            <p className="text-blue-200 text-sm">Total Requested</p>
          </div>
          <p className="text-white text-3xl font-bold">{formatCurrency(stats.totalRequestedAmount)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900 to-green-800 p-6 rounded-lg border border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-300" size={24} />
            <p className="text-green-200 text-sm">Total Approved</p>
          </div>
          <p className="text-white text-3xl font-bold">{formatCurrency(stats.totalApprovedAmount)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-lg border border-purple-700">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-purple-300" size={24} />
            <p className="text-purple-200 text-sm">Approval Rate</p>
          </div>
          <p className="text-white text-3xl font-bold">
            {stats.totalClaims > 0 ? Math.round((stats.approvedClaims / stats.totalClaims) * 100) : 0}%
          </p>
        </div>
      </div>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-4">Claim Distribution</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Approved Claims</span>
              <span className="text-green-400">{stats.approvedClaims} claims</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className="bg-green-600 h-3 rounded-full" style={{width: `${stats.totalClaims > 0 ? (stats.approvedClaims / stats.totalClaims) * 100 : 0}%`}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Pending Claims</span>
              <span className="text-amber-400">{stats.pendingClaims} claims</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className="bg-amber-600 h-3 rounded-full" style={{width: `${stats.totalClaims > 0 ? (stats.pendingClaims / stats.totalClaims) * 100 : 0}%`}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Rejected Claims</span>
              <span className="text-red-400">{stats.rejectedClaims} claims</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div className="bg-red-600 h-3 rounded-full" style={{width: `${stats.totalClaims > 0 ? (stats.rejectedClaims / stats.totalClaims) * 100 : 0}%`}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;