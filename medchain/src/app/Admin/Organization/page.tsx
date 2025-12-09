'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Stethoscope, Shield, Search } from 'lucide-react';
import { getAcknowledgedRequestsByAdmin, getRole } from '@/lib/integration';
import { fetchAndDecryptDocuments } from '@/lib/decryption';
import { UserRole } from '../../../../utils/userRole';
import { BigNumber, ethers } from 'ethers';

interface Organization {
  name: string;
  type: 'Healthcare Provider' | 'Insurer';
  walletAddress: string;
  approvedDate: string;
  requestId: number;
  doctorName?: string; // For healthcare providers
}

const OrganizationPage = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Healthcare Provider' | 'Insurer'>('All');
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      await fetchOrganizations(address);
    };

    init();
  }, []);

  const fetchOrganizations = async (adminAddress: string) => {
    try {
      setLoading(true);
      
      // Get all processed (approved) requests
      const processedRequests = await getAcknowledgedRequestsByAdmin(adminAddress);
      
      // Filter only approved requests for Healthcare Providers and Insurers
      const approvedRequests = processedRequests.filter(
        (req: any) => 
          req.isApproved === true && 
          (req.newRole === UserRole.HealthcareProvider || req.newRole === UserRole.Insurer)
      );

      console.log('Approved healthcare/insurer requests:', approvedRequests);

      // Fetch documents to get organization names
      const orgsWithDetails = await Promise.all(
        approvedRequests.map(async (request: any) => {
          try {
            const documents = await fetchAndDecryptDocuments(request.requestId.toNumber());
            
            if (documents && documents.length > 0) {
              const metadata = documents[0].metadata;
              
              return {
                name: metadata.organization || 'Unknown Organization',
                type: request.newRole === UserRole.HealthcareProvider 
                  ? 'Healthcare Provider' as const
                  : 'Insurer' as const,
                walletAddress: request.requester,
                approvedDate: new Date(request.timestamp.toNumber() * 1000).toLocaleDateString(),
                requestId: request.requestId.toNumber(),
                doctorName: metadata.doctorName || undefined
              };
            }
            
            return null;
          } catch (error) {
            console.error(`Error fetching documents for request ${request.requestId}:`, error);
            return null;
          }
        })
      );

      // Filter out null values and set organizations
      const validOrgs = orgsWithDetails.filter((org): org is Organization => org !== null);
      setOrganizations(validOrgs);
      
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.doctorName && org.doctorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'All' || org.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const healthcareProviders = filteredOrganizations.filter(org => org.type === 'Healthcare Provider');
  const insurers = filteredOrganizations.filter(org => org.type === 'Insurer');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 shadow-lg border border-blue-700">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={32} className="text-white" />
          <h2 className="text-white text-2xl font-semibold">
            Organization Management
          </h2>
        </div>
        <p className="text-blue-200">
          View all registered healthcare providers and insurance companies
        </p>
        <div className="flex gap-4 mt-4 text-sm">
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Healthcare Providers</p>
            <p className="text-white font-bold text-lg">{healthcareProviders.length}</p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <p className="text-white">Insurance Companies</p>
            <p className="text-white font-bold text-lg">{insurers.length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by organization name, doctor name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option>All</option>
            <option>Healthcare Provider</option>
            <option>Insurer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 text-sm mt-4">Loading organizations...</p>
        </div>
      ) : (
        <>
          {/* Healthcare Providers Table */}
          {(typeFilter === 'All' || typeFilter === 'Healthcare Provider') && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Stethoscope className="text-green-400" size={24} />
                <h3 className="text-white text-lg font-semibold">
                  Healthcare Providers
                </h3>
                <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  {healthcareProviders.length}
                </span>
              </div>

              {healthcareProviders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Organization</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Doctor Name</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Wallet Address</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Approved Date</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Request ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthcareProviders.map((org, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="text-white py-3 px-4 text-sm font-medium">
                            {org.name}
                          </td>
                          <td className="text-green-400 py-3 px-4 text-sm">
                            {org.doctorName || 'N/A'}
                          </td>
                          <td className="text-gray-300 py-3 px-4 text-sm font-mono">
                            {org.walletAddress.slice(0, 6)}...{org.walletAddress.slice(-4)}
                          </td>
                          <td className="text-gray-300 py-3 px-4 text-sm">
                            {org.approvedDate}
                          </td>
                          <td className="text-blue-400 py-3 px-4 text-sm font-mono">
                            #{org.requestId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Stethoscope size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No healthcare providers found</p>
                </div>
              )}
            </div>
          )}

          {/* Insurance Companies Table */}
          {(typeFilter === 'All' || typeFilter === 'Insurer') && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-blue-400" size={24} />
                <h3 className="text-white text-lg font-semibold">
                  Insurance Companies
                </h3>
                <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                  {insurers.length}
                </span>
              </div>

              {insurers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Company Name</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Wallet Address</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Approved Date</th>
                        <th className="text-left text-gray-400 py-3 px-4 text-sm">Request ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurers.map((org, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="text-white py-3 px-4 text-sm font-medium">
                            {org.name}
                          </td>
                          <td className="text-gray-300 py-3 px-4 text-sm font-mono">
                            {org.walletAddress.slice(0, 6)}...{org.walletAddress.slice(-4)}
                          </td>
                          <td className="text-gray-300 py-3 px-4 text-sm">
                            {org.approvedDate}
                          </td>
                          <td className="text-blue-400 py-3 px-4 text-sm font-mono">
                            #{org.requestId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Shield size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No insurance companies found</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrganizationPage;