'use client';

import { useState } from 'react';
import { Clinic } from '../types';

interface ClinicListProps {
  clinics: Clinic[];
  onRemove: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

export default function ClinicList({ clinics, onRemove }: ClinicListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'type' | 'district'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getClinicTypeColor = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'bg-green-100 text-green-800 border-green-300';
      case 'govt': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'healthcentre': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-black border-gray-300';
    }
  };

  const getClinicTypeLabel = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'GAIA';
      case 'govt': return 'Government';
      case 'healthcentre': return 'Health Centre';
      case 'other': return 'Other';
      default: return type;
    }
  };

  // Sort clinics
  const sortedClinics = [...clinics].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    if (sortField === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortField === 'type') {
      aVal = a.type;
      bVal = b.type;
    } else if (sortField === 'district') {
      aVal = (a.district || '').toLowerCase();
      bVal = (b.district || '').toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedClinics.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClinics = sortedClinics.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSort = (field: 'name' | 'type' | 'district') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clinicsByType = {
    gaia: clinics.filter(c => c.type === 'gaia'),
    govt: clinics.filter(c => c.type === 'govt'),
    healthcentre: clinics.filter(c => c.type === 'healthcentre'),
    other: clinics.filter(c => c.type === 'other'),
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-black mb-4">Clinics ({clinics.length})</h2>
      
      {/* Summary by type */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
        <div className="bg-green-50 p-2 rounded text-center">
          <div className="font-semibold text-green-800">GAIA</div>
          <div className="text-green-600">{clinicsByType.gaia.length}</div>
        </div>
        <div className="bg-blue-50 p-2 rounded text-center">
          <div className="font-semibold text-blue-800">Government</div>
          <div className="text-blue-600">{clinicsByType.govt.length}</div>
        </div>
        <div className="bg-orange-50 p-2 rounded text-center">
          <div className="font-semibold text-orange-800">Health Centre</div>
          <div className="text-orange-600">{clinicsByType.healthcentre.length}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded text-center">
          <div className="font-semibold text-gray-800">Other</div>
          <div className="text-gray-600">{clinicsByType.other.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th 
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('type')}
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('district')}
              >
                District {sortField === 'district' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClinics.map(clinic => (
              <tr key={clinic.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium text-black">{clinic.name}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${getClinicTypeColor(clinic.type)}`}>
                    {getClinicTypeLabel(clinic.type)}
                  </span>
                </td>
                <td className="p-2 text-gray-600">{clinic.district || 'N/A'}</td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => onRemove(clinic.id)}
                    className="text-red-600 hover:text-red-800 font-semibold text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedClinics.length)} of {sortedClinics.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
