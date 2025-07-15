'use client';

import React, { useState } from 'react';

interface TableSize {
  itemsPerPage: number;
}

const OrganizationTable: React.FC<TableSize> = ({ itemsPerPage }) => {
  const data = [
    {
      id: 1,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 2,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 3,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 4,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 5,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 6,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 7,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 8,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 9,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
      id: 10,
      name: 'Sunway Medical Centre',
      type: 'Hospital',
      createdAt: '2025-06-18 10:42:41.277',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    },
  ];
  const [currentPage, setCurrentPage] = useState(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    // if (page < 1 || page > Math.ceil(data.length / itemsPerPage)){
    //   return;
    // };

    setCurrentPage(page);
  };

  return (
    <div className="w-full h-full overflow-auto p-4">
      <table className="table-auto w-full text-left border-collapse border border-gray-300">
        <thead className="bg-blue-100 w-full">
          <tr>
            <th className="px-6 py-3 font-medium text-gray-700">ID</th>
            <th className="px-6 py-3 font-medium text-gray-700">Name</th>
            <th className="px-6 py-3 font-medium text-gray-700">Type</th>
            <th className="px-6 py-3 font-medium text-gray-700">Created At</th>
            <th className="px-6 py-3 font-medium text-gray-700">
              Public Key Address
            </th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((Organization) => (
            <tr
              key={Organization.id}
              className="border-b hover:bg-gray-50 space-x-3"
            >
              <td className="px-6 py-3">{Organization.id}</td>
              <td className="px-6 py-3">{Organization.name}</td>
              <td className="px-6 py-3">{Organization.type}</td>
              <td className="px-6 py-3">{Organization.createdAt}</td>
              <td className="px-6 py-3">{Organization.address}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
        >
          Previous
        </button>
        <div className="text-gray-700">
          Page {currentPage} of {Math.ceil(data.length / itemsPerPage)}
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === Math.ceil(data.length / itemsPerPage)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default OrganizationTable;
