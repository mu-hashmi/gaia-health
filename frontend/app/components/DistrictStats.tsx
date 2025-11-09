'use client';

import { useState, useMemo } from 'react';
import { Clinic } from '../types';
import { calculateCoverage } from '../utils/coverage';

interface DistrictStatsProps {
  clinics: Clinic[];
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
  districts: Array<{ name: string; id: number }>;
}

interface DistrictCoverage {
  district: string;
  clinics: Clinic[];
  coverage: {
    totalPopulation: number;
    coveredPopulation: number;
    uncoveredPopulation: number;
    coveragePercentage: number;
  };
}

export default function DistrictStats({ clinics, populationPoints, districts }: DistrictStatsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoize expensive calculations - only recalculate when clinics or populationPoints change
  const districtCoverages = useMemo(() => {
    // Group clinics by district
    const clinicsByDistrict = new Map<string, Clinic[]>();
    clinics.forEach(clinic => {
      if (clinic.district) {
        const existing = clinicsByDistrict.get(clinic.district) || [];
        clinicsByDistrict.set(clinic.district, [...existing, clinic]);
      }
    });

    // Calculate coverage for each district
    return Array.from(clinicsByDistrict.entries())
      .map(([district, districtClinics]) => {
        // Filter population points that belong to this district
        // Note: This is a simplified approach. In a real implementation,
        // you would use point-in-polygon to determine which points belong to which district
        const districtPopulation = populationPoints; // For now, use all points
        const coverage = calculateCoverage(districtClinics, districtPopulation);
        
        return {
          district,
          clinics: districtClinics,
          coverage,
        };
      })
      .sort((a, b) => b.coverage.coveragePercentage - a.coverage.coveragePercentage);
  }, [clinics, populationPoints]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-black">District Coverage</h2>
        <span className="text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {districtCoverages.length === 0 ? (
            <p className="text-gray-600 text-sm">No district data available</p>
          ) : (
            districtCoverages.map(({ district, clinics: districtClinics, coverage }) => (
              <div key={district} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-black">{district}</h3>
                  <span className="text-sm font-bold text-blue-600">
                    {coverage.coveragePercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Clinics: </span>
                    <span className="font-medium">{districtClinics.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Covered: </span>
                    <span className="font-medium">{coverage.coveredPopulation.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Pop: </span>
                    <span className="font-medium">{coverage.totalPopulation.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Uncovered: </span>
                    <span className="font-medium text-red-600">{coverage.uncoveredPopulation.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

