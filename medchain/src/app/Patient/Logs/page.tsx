'use client';

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';
import { fetchAbiFromEtherscan } from '@/lib/integration';
const ACCESS_CONTROL_ADDRESS = process.env.NEXT_PUBLIC_ACCESS_CONTROL || '';

type AccessEvent = {
  type: 'Granted' | 'Revoked';
  patient: string;
  thirdParty: string;
  timestamp: number;
  txHash: string;
};

export default function PatientAccessLogs() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abi, setABI] = useState<any[] | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Provider | null>(
    null
  );

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;
      const _provider = new ethers.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();
      const address = await _signer.getAddress();
      setWalletAddress(address);
      setProvider(_provider);
      setSigner(_signer);
    };

    init();
  }, []);

  useEffect(() => {
    if (!ACCESS_CONTROL_ADDRESS) return;

    async function fetchABI() {
      try {
        setLoading(true);
        setError(null);

        // Use the backend proxy instead of direct Etherscan API
        const fetchedAbi = await fetchAbiFromEtherscan(ACCESS_CONTROL_ADDRESS);
        setABI(fetchedAbi);
      } catch (err: any) {
        console.error('ABI fetch error:', err);
        setError('Could not fetch contract ABI. Please try again later.');
        setABI(null);
      } finally {
        setLoading(false);
      }
    }

    fetchABI();
  }, []);

  useEffect(() => {
    if (!walletAddress || !provider || !abi) return;
    if (!ACCESS_CONTROL_ADDRESS) return;

    setLoading(true);

    const contract = new ethers.Contract(
      ACCESS_CONTROL_ADDRESS,
      abi,
      signer ?? provider
    );

    async function loadLogs() {
      try {
        // Listen to grant events
        const grantEvents = await contract.queryFilter(
          contract.filters.GrantAccess(walletAddress)
        );
        // Listen to revoke events
        const revokeEvents = await contract.queryFilter(
          contract.filters.RevokeAccess(walletAddress)
        );

        const format = (e: any, type: 'Granted' | 'Revoked'): AccessEvent => ({
          type,
          patient: e.args.patientAddress,
          thirdParty: e.args.thirdPartyAddress,
          timestamp: e.args.timestamp.toNumber(),
          txHash: e.transactionHash,
        });

        let all = [
          ...grantEvents.map((e) => format(e, 'Granted')),
          ...revokeEvents.map((e) => format(e, 'Revoked')),
        ];
        // Sort by timestamp
        all.sort((a, b) => b.timestamp - a.timestamp);

        setEvents(all);
      } catch (err) {
        setError('Failed to fetch access logs');
      }
      setLoading(false);
    }

    loadLogs();

    // Subscribe for real-time updates
    const onGrant = ({ patient, thirdParty, timestamp, event }: any) => {
      if (patient !== walletAddress) return;
      setEvents((prev) => [
        {
          type: 'Granted',
          patient,
          thirdParty,
          timestamp: Number(timestamp),
          txHash: event.transactionHash,
        },
        ...prev,
      ]);
    };
    const onRevoke = ({ patient, thirdParty, timestamp, event }: any) => {
      if (patient !== walletAddress) return;
      setEvents((prev) => [
        {
          type: 'Revoked',
          patient,
          thirdParty,
          timestamp: Number(timestamp),
          txHash: event.transactionHash,
        },
        ...prev,
      ]);
    };
    contract.on('GrantAccess', onGrant);
    contract.on('RevokeAccess', onRevoke);

    return () => {
      contract.off('GrantAccess', onGrant);
      contract.off('RevokeAccess', onRevoke);
    };
  }, [walletAddress, provider, abi, ACCESS_CONTROL_ADDRESS]);

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <h2 className="text-white text-lg font-semibold mb-4">
        Your medical record access log
      </h2>

      {/* Configuration Error */}
      {!ACCESS_CONTROL_ADDRESS ? (
        <div className="mb-4 rounded-xl border border-yellow-500 bg-yellow-500/20 px-4 py-3 text-yellow-300">
          <strong className="font-semibold">Configuration Error:</strong> Access
          Control contract address is not configured.
        </div>
      ) : null}

      {/* ABI Fetch Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500 bg-red-500/20 px-4 py-3 text-red-300">
          <strong className="font-semibold">Error:</strong> {error}
          <div className="mt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <span className="text-lg opacity-80 text-white">Loading logs…</span>
        </div>
      ) : !abi ? ( // If not loading, but ABI is null (meaning ABI fetch failed)
        <div className="text-center py-10 text-gray-400">
          <p>
            Unable to load access logs. Please check the error message above.
          </p>
        </div>
      ) : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Access
                </th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Third Party
                </th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Date
                </th>
                <th className="text-left text-gray-400 py-3 px-4 text-sm">
                  Transaction
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-6">
                    No access events found.
                  </td>
                </tr>
              ) : (
                events.map((event, i) => (
                  <tr
                    key={event.txHash + i}
                    className={
                      event.type === 'Revoked'
                        ? 'text-red-400'
                        : 'text-green-400'
                    }
                  >
                    <td className="py-3 px-4">{event.type}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono">
                        {event.thirdParty.slice(0, 6)}...
                        {event.thirdParty.slice(-4)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-400"
                      >
                        View Tx
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
