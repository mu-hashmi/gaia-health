'use client';

import { useState, useMemo } from 'react';
import { Clinic } from '../types';
import { calculateDistance } from '../utils/coverage';

// Fast bounding box check to avoid expensive Haversine calculations
function isWithinBoundingBox(
  pointLat: number,
  pointLng: number,
  clinicLat: number,
  clinicLng: number,
  radiusKm: number
): boolean {
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos(clinicLat * Math.PI / 180));
  return Math.abs(pointLat - clinicLat) <= latRadius && 
         Math.abs(pointLng - clinicLng) <= lngRadius;
}

// Optimized check if point is covered by clinic
function isPointCoveredByClinic(
  pointLat: number,
  pointLng: number,
  clinicLat: number,
  clinicLng: number,
  radiusKm: number
): boolean {
  if (isWithinBoundingBox(pointLat, pointLng, clinicLat, clinicLng, radiusKm)) {
    const distance = calculateDistance(pointLat, pointLng, clinicLat, clinicLng);
    return distance <= radiusKm;
  }
  return false;
}

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

  // Memoize all expensive calculations - only recalculate when clinics or populationPoints change
  const { clinicCoverages, totals } = useMemo(() => {
    // Calculate unique coverage per clinic type (no double counting) - optimized
    const calculateUniqueCoverageByType = (type: Clinic['type']) => {
      const typeClinics = clinics.filter(c => c.type === type);
      if (typeClinics.length === 0) return 0;
      
      const coveredPoints = new Set<string>();
      let totalPopulation = 0;

      for (const point of populationPoints) {
        // Check if this point is covered by any clinic of this type
        let isCovered = false;
        for (const clinic of typeClinics) {
          if (isPointCoveredByClinic(point.lat, point.lng, clinic.lat, clinic.lng, coverageRadius)) {
            isCovered = true;
            break; // Early exit
          }
        }

        if (isCovered) {
          // Use lat,lng as unique identifier to avoid double counting
          const pointKey = `${point.lat},${point.lng}`;
          if (!coveredPoints.has(pointKey)) {
            coveredPoints.add(pointKey);
            totalPopulation += point.population;
          }
        }
      }

      return totalPopulation;
    };

    // Calculate unique coverage for grand total (no double counting across all clinics) - optimized
    const calculateUniqueCoverageTotal = () => {
      if (clinics.length === 0) return 0;
      
      const coveredPoints = new Set<string>();
      let totalPopulation = 0;

      for (const point of populationPoints) {
        // Check if this point is covered by any clinic
        let isCovered = false;
        for (const clinic of clinics) {
          if (isPointCoveredByClinic(point.lat, point.lng, clinic.lat, clinic.lng, coverageRadius)) {
            isCovered = true;
            break; // Early exit
          }
        }

        if (isCovered) {
          const pointKey = `${point.lat},${point.lng}`;
          if (!coveredPoints.has(pointKey)) {
            coveredPoints.add(pointKey);
            totalPopulation += point.population;
          }
        }
      }

      return totalPopulation;
    };

    // Calculate population covered by each clinic individually - optimized
    // This shows the population within each clinic's radius (may overlap with others)
    const clinicCoverages: ClinicCoverage[] = clinics.map(clinic => {
      let population = 0;
      for (const point of populationPoints) {
        if (isPointCoveredByClinic(point.lat, point.lng, clinic.lat, clinic.lng, coverageRadius)) {
          population += point.population;
        }
      }
      return { clinic, population };
    });

    // Calculate unique totals (no double counting)
    const totals = {
      gaia: calculateUniqueCoverageByType('gaia'),
      govt: calculateUniqueCoverageByType('govt'),
      cham: calculateUniqueCoverageByType('cham'),
      total: calculateUniqueCoverageTotal(),
    };

    return { clinicCoverages, totals };
  }, [clinics, populationPoints, coverageRadius]);

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

