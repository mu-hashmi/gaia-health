'use client';

import { useMemo, useEffect } from 'react';
import { Clinic } from '../types';
import { calculateDistance } from '../utils/coverage';

interface ClinicDetailModalProps {
  clinic: Clinic | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onViewDetailedAnalysis?: (clinic: Clinic) => void;
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
}

const COVERAGE_RADIUS_KM = 5;

// Estimate demographics based on typical population distribution
function estimateDemographics(totalPopulation: number) {
  // Women of reproductive age (15-49): approximately 25% of total
  const womenReproductiveAge = Math.round(totalPopulation * 0.25);
  // Children under 5: approximately 15% of total
  const childrenUnder5 = Math.round(totalPopulation * 0.15);
  
  return {
    total: totalPopulation,
    womenReproductiveAge,
    childrenUnder5,
  };
}

export default function ClinicDetailModal({
  clinic,
  isOpen,
  onClose,
  onRemove,
  onViewDetailedAnalysis,
  populationPoints,
}: ClinicDetailModalProps) {
  // Calculate population served by this clinic
  const populationServed = useMemo(() => {
    if (!clinic || populationPoints.length === 0) {
      return { total: 0, womenReproductiveAge: 0, childrenUnder5: 0 };
    }

    let totalPopulation = 0;

    for (const point of populationPoints) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        clinic.lat,
        clinic.lng
      );
      
      if (distance <= COVERAGE_RADIUS_KM) {
        totalPopulation += point.population;
      }
    }

    return estimateDemographics(totalPopulation);
  }, [clinic, populationPoints]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !clinic) return null;

  const getClinicTypeLabel = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'GAIA';
      case 'govt': return 'Government';
      case 'healthcentre': return 'Health Centre';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getOwnershipLabel = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return 'GAIA';
      case 'govt': return 'Government';
      case 'healthcentre': return 'Government';
      case 'other': return 'Other';
      default: return 'Unknown';
    }
  };

  const handleRemove = () => {
    onRemove(clinic.id);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative z-[10000] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-purple-700">{clinic.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-semibold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Clinic Info */}
          <div className="space-y-2 border-b pb-4">
            <div className="flex justify-between">
              <span className="text-black font-medium">Ownership:</span>
              <span className="text-gray-600">{getOwnershipLabel(clinic.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black font-medium">Type:</span>
              <span className="text-gray-600">{getClinicTypeLabel(clinic.type)}</span>
            </div>
          </div>

          {/* Population Served */}
          <div>
            <h3 className="text-lg font-bold text-blue-700 mb-3">Population Served:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-black">Total:</span>
                <span className="font-bold text-black">{populationServed.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Women (reproductive age):</span>
                <span className="font-bold text-black">{populationServed.womenReproductiveAge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Children (under 5):</span>
                <span className="font-bold text-black">{populationServed.childrenUnder5.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-2">
            {onViewDetailedAnalysis && (
              <button
                type="button"
                onClick={() => onViewDetailedAnalysis(clinic)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Detailed Analysis
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Remove Clinic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

