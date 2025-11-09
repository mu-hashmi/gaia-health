'use client';

import { useState, useEffect, useMemo } from 'react';
import type { GeoJsonObject } from 'geojson';
import { Clinic } from '../types';
import { calculateMultiDistrictCoverage } from '../utils/districtStats';

interface GAIAImpactStatsProps {
  clinics: Clinic[];
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
}

const GAIA_DISTRICTS = ['Mangochi', 'Mulanje', 'Phalombe'];

export default function GAIAImpactStats({ clinics, populationPoints }: GAIAImpactStatsProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Load GeoJSON data for district boundaries
    fetch('/api/districts/geojson')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load district boundaries: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => setGeoJsonData(data as GeoJsonObject))
      .catch(err => {
        console.error('Error loading district boundaries:', err);
      });
  }, []);

  // Check if GAIA clinics are present in the clinics list
  const hasGAIAClinics = useMemo(() => {
    return clinics.some(c => c.type === 'gaia');
  }, [clinics]);

  // Calculate impact statistics
  const impactStats = useMemo(() => {
    if (!geoJsonData || populationPoints.length === 0) {
      return null;
    }

    return calculateMultiDistrictCoverage(
      GAIA_DISTRICTS,
      clinics,
      populationPoints,
      geoJsonData
    );
  }, [geoJsonData, clinics, populationPoints]);

  // Only show impact when GAIA clinics are selected/displayed
  if (!hasGAIAClinics) {
    return null;
  }

  if (!impactStats) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-black mb-4">GAIA Impact in Target Districts</h2>
        <p className="text-gray-600 text-sm">Loading district data...</p>
      </div>
    );
  }

  const { totalPopulation, coverageWithAll, coverageWithoutGAIA, gaiaImpact } = impactStats;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-black">GAIA Impact in Target Districts</h2>
        <span className="text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Coverage statistics for <strong>Mangochi, Mulanje, and Phalombe</strong> districts combined:
            </p>
          </div>

          {/* Total Population */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-black mb-1">Total Population in 3 Districts</div>
            <div className="text-2xl font-bold text-blue-700">
              {totalPopulation.toLocaleString()}
            </div>
          </div>

          {/* Coverage with GAIA */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-black mb-1">Coverage with All Clinics (including GAIA)</div>
            <div className="text-2xl font-bold text-green-700">
              {coverageWithAll.coveredPopulation.toLocaleString()} people
            </div>
          </div>

          {/* Coverage without GAIA */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-black mb-1">Coverage without GAIA Clinics</div>
            <div className="text-2xl font-bold text-orange-700">
              {coverageWithoutGAIA.coveredPopulation.toLocaleString()} people
            </div>
          </div>

          {/* Impact Highlight */}
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <div className="text-sm font-semibold text-green-800 mb-2">
              Impact of Adding GAIA Clinics:
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {gaiaImpact.peopleLosingAccess.toLocaleString()} people
            </div>
            <div className="text-sm text-green-600">
              gained healthcare access
            </div>
          </div>

          {/* Additional context */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>
              This demonstrates GAIA's positive impact by showing how many people in these 3 districts 
              gained healthcare access through GAIA clinics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

