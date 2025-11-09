'use client';

import { Clinic } from '../types';
import { calculateCoverage, calculateDistance } from '../utils/coverage';

interface DistrictModalProps {
  isOpen: boolean;
  onClose: () => void;
  districtName: string;
  clinics: Clinic[];
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
}

export default function DistrictModal({
  isOpen,
  onClose,
  districtName,
  clinics,
  populationPoints,
}: DistrictModalProps) {
  if (!isOpen) return null;

  // Filter clinics for this district
  const districtClinics = clinics.filter(c => c.district === districtName);

  // Group clinics by type
  const clinicsByType = {
    gaia: districtClinics.filter(c => c.type === 'gaia'),
    govt: districtClinics.filter(c => c.type === 'govt'),
    healthcentre: districtClinics.filter(c => c.type === 'healthcentre'),
    other: districtClinics.filter(c => c.type === 'other'),
  };

  // Calculate coverage for this district
  // Note: This is a simplified calculation. In a real implementation,
  // you would filter population points by checking if they're within the district polygon
  const coverage = calculateCoverage(districtClinics, populationPoints);

  // Calculate unique coverage per clinic type (no double counting)
  const calculateUniqueCoverageByType = (type: Clinic['type']) => {
    const typeClinics = districtClinics.filter(c => c.type === type);
    const coveredPoints = new Set<string>();
    let totalPopulation = 0;

    populationPoints.forEach(point => {
      const isCovered = typeClinics.some(clinic => {
        const distance = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
        return distance <= 5; // 5km radius
      });

      if (isCovered) {
        const pointKey = `${point.lat},${point.lng}`;
        if (!coveredPoints.has(pointKey)) {
          coveredPoints.add(pointKey);
          totalPopulation += point.population;
        }
      }
    });

    return totalPopulation;
  };

  const coverageByType = {
    gaia: calculateUniqueCoverageByType('gaia'),
    govt: calculateUniqueCoverageByType('govt'),
    healthcentre: calculateUniqueCoverageByType('healthcentre'),
    other: calculateUniqueCoverageByType('other'),
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">{districtName} District</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Coverage Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-3">Coverage Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Population</div>
                <div className="text-2xl font-bold text-blue-700">
                  {coverage.totalPopulation.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Covered Population</div>
                <div className="text-2xl font-bold text-green-700">
                  {coverage.coveredPopulation.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Uncovered Population</div>
                <div className="text-2xl font-bold text-red-700">
                  {coverage.uncoveredPopulation.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Coverage Percentage</div>
                <div className="text-2xl font-bold text-purple-700">
                  {coverage.coveragePercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Clinics by Type */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-3">Clinics by Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">GAIA</div>
                <div className="text-xl font-bold text-green-700">{clinicsByType.gaia.length}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {coverageByType.gaia.toLocaleString()} covered
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Government</div>
                <div className="text-xl font-bold text-blue-700">{clinicsByType.govt.length}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {coverageByType.govt.toLocaleString()} covered
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Health Centre</div>
                <div className="text-xl font-bold text-orange-700">{clinicsByType.healthcentre.length}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {coverageByType.healthcentre.toLocaleString()} covered
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Other</div>
                <div className="text-xl font-bold text-gray-700">{clinicsByType.other.length}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {coverageByType.other.toLocaleString()} covered
                </div>
              </div>
            </div>
          </div>

          {/* Clinic List */}
          {districtClinics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-black mb-3">
                Clinics ({districtClinics.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {districtClinics.map(clinic => {
                  const getTypeColor = (type: Clinic['type']) => {
                    switch (type) {
                      case 'gaia': return 'bg-green-100 text-green-800 border-green-300';
                      case 'govt': return 'bg-blue-100 text-blue-800 border-blue-300';
                      case 'healthcentre': return 'bg-orange-100 text-orange-800 border-orange-300';
                      case 'other': return 'bg-gray-100 text-gray-800 border-gray-300';
                      default: return 'bg-gray-100 text-black border-gray-300';
                    }
                  };
                  return (
                    <div
                      key={clinic.id}
                      className={`p-2 border rounded-lg ${getTypeColor(clinic.type)}`}
                    >
                      <div className="font-medium text-sm">{clinic.name}</div>
                      <div className="text-xs capitalize">{clinic.type}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {districtClinics.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No clinics found in this district
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

