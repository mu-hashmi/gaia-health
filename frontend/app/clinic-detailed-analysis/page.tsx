'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Clinic } from '../types';
import { isMedicalDesert, loadPharmacyData } from '../utils/pharmacyData';

interface Analysis {
  clinic: string;
  localDanger: string;
  medicationProblems: string;
  medicalDesert: string;
}

export default function ClinicDetailedAnalysis() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalysis() {
      try {
        const clinicJson = searchParams.get('clinic');
        if (!clinicJson) {
          setError('No clinic data provided');
          setLoading(false);
          return;
        }

        const parsedClinic = JSON.parse(decodeURIComponent(clinicJson)) as Clinic;
        setClinic(parsedClinic);

        const pharmacies = await loadPharmacyData();
        const isDesert = isMedicalDesert(parsedClinic.lat, parsedClinic.lng, pharmacies);

        const response = await fetch('/api/clinic-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinic: parsedClinic,
            isMedicalDesert: isDesert,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analysis');
        }

        const analysisData = await response.json() as Analysis;
        setAnalysis(analysisData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Analysis error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-black text-lg">Loading detailed analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back
            </button>
            <h1 className="text-3xl font-bold text-black">
              {clinic?.name} - Detailed Analysis
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Clinic Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-purple-700 mb-4">Clinic Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-black font-medium">Name:</span>
                  <span className="text-gray-600">{clinic?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black font-medium">Type:</span>
                  <span className="text-gray-600 capitalize">{clinic?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black font-medium">Location:</span>
                  <span className="text-gray-600">
                    {clinic?.lat.toFixed(4)}, {clinic?.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Metrics */}
            <div className="space-y-4">
              {/* Local Danger */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <h3 className="text-xl font-bold text-red-700 mb-3">Local Danger</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {analysis.localDanger}
                </p>
              </div>

              {/* Medical Desert */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                <h3 className="text-xl font-bold text-yellow-700 mb-3">Medical Desert Status</h3>
                <p className="text-gray-700">
                  {analysis.medicalDesert}
                </p>
              </div>

              {/* Medication Problems */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <h3 className="text-xl font-bold text-orange-700 mb-3">Major Medication Problems</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {analysis.medicationProblems}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Analysis generated using LLM for healthcare planning in Malawi
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
