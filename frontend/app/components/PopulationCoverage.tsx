'use client';

import { useState } from 'react';
import { Clinic } from '../types';
import { calculateDistance } from '../utils/coverage';

interface PopulationCoverageProps {
  clinics: Clinic[];
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
  coverageRadius?: number;
}

interface ClinicCoverage {
  clinic: Clinic;
  population: number;
}

export default function PopulationCoverage({ 
  clinics, 
  populationPoints, 
  coverageRadius = 5 
}: PopulationCoverageProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate unique coverage per clinic type (no double counting)
  const calculateUniqueCoverageByType = (type: Clinic['type']) => {
    const typeClinics = clinics.filter(c => c.type === type);
    const coveredPoints = new Set<string>();
    let totalPopulation = 0;

    populationPoints.forEach(point => {
      // Check if this point is covered by any clinic of this type
      const isCovered = typeClinics.some(clinic => {
        const distance = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
        return distance <= coverageRadius;
      });

      if (isCovered) {
        // Use lat,lng as unique identifier to avoid double counting
        const pointKey = `${point.lat},${point.lng}`;
        if (!coveredPoints.has(pointKey)) {
          coveredPoints.add(pointKey);
          totalPopulation += point.population;
        }
      }
    });

    return totalPopulation;
  };

  // Calculate unique coverage for grand total (no double counting across all clinics)
  const calculateUniqueCoverageTotal = () => {
    const coveredPoints = new Set<string>();
    let totalPopulation = 0;

    populationPoints.forEach(point => {
      // Check if this point is covered by any clinic
      const isCovered = clinics.some(clinic => {
        const distance = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
        return distance <= coverageRadius;
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

  // Calculate population covered by each clinic individually
  // This shows the population within each clinic's radius (may overlap with others)
  const clinicCoverages: ClinicCoverage[] = clinics.map(clinic => {
    let population = 0;
    populationPoints.forEach(point => {
      const distance = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
      if (distance <= coverageRadius) {
        population += point.population;
      }
    });
    return { clinic, population };
  });

  // Calculate unique totals (no double counting)
  const totals = {
    gaia: calculateUniqueCoverageByType('gaia'),
    govt: calculateUniqueCoverageByType('govt'),
    cham: calculateUniqueCoverageByType('cham'),
    total: calculateUniqueCoverageTotal(),
  };

  const getClinicTypeColor = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'bg-green-100 text-green-800 border-green-300';
      case 'govt': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cham': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-black border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-black">Population Coverage</h2>
        <span className="text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Totals by category */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">GAIA Total</div>
              <div className="text-xl font-bold text-green-700">
                {totals.gaia.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Government Total</div>
              <div className="text-xl font-bold text-blue-700">
                {totals.govt.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">CHAM Total</div>
              <div className="text-xl font-bold text-purple-700">
                {totals.cham.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Grand Total</div>
              <div className="text-xl font-bold text-gray-700">
                {totals.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Per clinic breakdown */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clinicCoverages
              .sort((a, b) => b.population - a.population)
              .map(({ clinic, population }) => (
                <div
                  key={clinic.id}
                  className={`p-2 border rounded-lg ${getClinicTypeColor(clinic.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{clinic.name}</span>
                    <span className="font-bold">{population.toLocaleString()}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

