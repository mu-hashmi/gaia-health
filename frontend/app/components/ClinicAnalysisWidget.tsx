'use client';

import { useEffect, useState } from 'react';
import { Clinic } from '../types';

interface AnalysisResult {
  childrenPercentage: number | string;
  conflictRisks: {
    war: boolean;
    highCrime: boolean;
    gangViolence: boolean;
    description: string;
  };
  medicationDesert: {
    isMedicationDesert: boolean;
    nearestPharmacyDistance: number | string;
    description: string;
  };
  majorHealthIssues: string[];
  summary: string;
  isLoading: boolean;
  error: string | null;
}

export default function ClinicAnalysisWidget({ clinic }: { clinic: Clinic }) {
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    childrenPercentage: 0,
    conflictRisks: {
      war: false,
      highCrime: false,
      gangViolence: false,
      description: '',
    },
    medicationDesert: {
      isMedicationDesert: false,
      nearestPharmacyDistance: 0,
      description: '',
    },
    majorHealthIssues: [],
    summary: '',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function analyzeClinic() {
      try {
        setAnalysis(prev => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch('/api/clinic-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clinicId: clinic.id,
            clinicName: clinic.name,
            district: clinic.district,
            lat: clinic.lat,
            lng: clinic.lng,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze clinic');
        }

        const data = await response.json();
        setAnalysis(prev => ({
          ...prev,
          ...data,
          isLoading: false,
        }));
      } catch (err) {
        setAnalysis(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'An error occurred',
        }));
      }
    }

    analyzeClinic();
  }, [clinic.id, clinic.name, clinic.district, clinic.lat, clinic.lng]);

  if (analysis.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing clinic...</p>
        </div>
      </div>
    );
  }

  if (analysis.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Error</h3>
        <p className="text-red-700">{analysis.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">Clinic Analysis Summary</h2>
        <p className="text-blue-800 text-lg leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Children Demographics */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">👶</span>
            Child Population
          </h3>
          <div className="bg-white rounded-lg p-4">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {typeof analysis.childrenPercentage === 'string'
                ? analysis.childrenPercentage
                : `${analysis.childrenPercentage.toFixed(1)}%`}
            </div>
            <p className="text-gray-700">of population are children (0-17 years)</p>
          </div>
        </div>

        {/* Medication Desert Status */}
        <div className={`rounded-lg p-6 border ${
          analysis.medicationDesert.isMedicationDesert
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💊</span>
            <span className={analysis.medicationDesert.isMedicationDesert ? 'text-red-900' : 'text-green-900'}>
              Medication Desert Status
            </span>
          </h3>
          <div className="bg-white rounded-lg p-4">
            <p className={`text-lg font-bold mb-2 ${
              analysis.medicationDesert.isMedicationDesert ? 'text-red-600' : 'text-green-600'
            }`}>
              {analysis.medicationDesert.isMedicationDesert ? '⚠️ Yes - Medication Desert' : '✓ No - Adequate Pharmacy Access'}
            </p>
            <p className="text-gray-700 text-sm">
              Nearest pharmacy: {typeof analysis.medicationDesert.nearestPharmacyDistance === 'string'
                ? analysis.medicationDesert.nearestPharmacyDistance
                : `${analysis.medicationDesert.nearestPharmacyDistance.toFixed(1)}km away`}
            </p>
            <p className="text-gray-600 text-sm mt-2">{analysis.medicationDesert.description}</p>
          </div>
        </div>

        {/* Conflict & Safety Risks */}
        <div className={`rounded-lg p-6 border ${
          analysis.conflictRisks.war || analysis.conflictRisks.highCrime || analysis.conflictRisks.gangViolence
            ? 'bg-orange-50 border-orange-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <span className={
              analysis.conflictRisks.war || analysis.conflictRisks.highCrime || analysis.conflictRisks.gangViolence
                ? 'text-orange-900'
                : 'text-green-900'
            }>
              Conflict & Safety Assessment
            </span>
          </h3>
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">War/Armed Conflict:</span>
              <span className={`font-bold ${analysis.conflictRisks.war ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.conflictRisks.war ? '🔴 High Risk' : '🟢 Low Risk'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">High Crime:</span>
              <span className={`font-bold ${analysis.conflictRisks.highCrime ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.conflictRisks.highCrime ? '🔴 High Risk' : '🟢 Low Risk'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Gang Violence:</span>
              <span className={`font-bold ${analysis.conflictRisks.gangViolence ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.conflictRisks.gangViolence ? '🔴 High Risk' : '🟢 Low Risk'}
              </span>
            </div>
            <div className="border-t pt-3 mt-3">
              <p className="text-gray-600 text-sm">{analysis.conflictRisks.description}</p>
            </div>
          </div>
        </div>

        {/* Major Health Issues */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
          <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            Major Health Issues
          </h3>
          <div className="bg-white rounded-lg p-4">
            {analysis.majorHealthIssues.length > 0 ? (
              <ul className="space-y-2">
                {analysis.majorHealthIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-indigo-600 font-bold mt-1">•</span>
                    <span className="text-gray-700">{issue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No major health issues identified</p>
            )}
          </div>
        </div>
      </div>

      {/* Clinic Information */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Clinic Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Clinic Name</p>
            <p className="font-semibold text-gray-900">{clinic.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-semibold text-gray-900">{clinic.type.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">District</p>
            <p className="font-semibold text-gray-900">{clinic.district || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Coordinates</p>
            <p className="font-semibold text-gray-900">{clinic.lat.toFixed(4)}, {clinic.lng.toFixed(4)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
