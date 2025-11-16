'use client';

import { useEffect, useState } from 'react';
import { Clinic } from '../types';

interface AnalysisData {
  analysis: string;
  isMedicalDesert: boolean;
  nearbyPharmaciesCount: number;
  hasPharmacyData: boolean;
}

export default function ClinicAnalysisWidget({ clinic }: { clinic: Clinic }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/clinic-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: clinic.lat,
            lng: clinic.lng,
            clinicName: clinic.name,
            district: clinic.district,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analysis');
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching clinic analysis:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.id]);

  const formatAnalysis = (text: string) => {
    // Split by numbered headers (format: "1. Header Name")
    const sections = text.split(/(?=^\d+\.\s+[^\n]+)/m);
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      // Extract title
      let titleMatch = section.match(/^\d+\.\s+([^\n]+?)(?:\n|$)/m);
      if (!titleMatch) {
        titleMatch = section.match(/\*\*(\d+\.\s+[^*]+?)\*\*/);
      }
      const title = titleMatch ? titleMatch[1].trim().replace(/^(\d+\.\s+)/, '$1') : '';
      // Remove title from content
      let content = section.replace(/^\d+\.\s+[^\n]+\n?/m, '').trim();
      content = content.replace(/\*\*\d+\.\s+[^*]+\*\*\s*/g, '').trim();
      
      if (!title && !content) return null;
      
      // Format bullet points - should only be one per section
      const lines = content.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               trimmed !== '•' && 
               trimmed !== '-' && 
               trimmed !== '**.' &&
               !trimmed.match(/^[-•]\s*\.?\s*$/);
      });
      
      // Take only the first bullet point (as per requirement)
      const firstLine = lines[0]?.trim() || '';
      if (!firstLine) return null;
      
      let formattedLine = firstLine.replace(/^[-•]\s*/, '');
      formattedLine = formattedLine.replace(/\*\*/g, '').trim();
      
      if (!formattedLine || formattedLine === '.' || formattedLine === '**') {
        return null;
      }
      
      // Ensure it ends with a period if it's a sentence (unless it's N/A)
      if (formattedLine && !formattedLine.match(/[.!?]$/) && formattedLine.toUpperCase() !== 'N/A') {
        formattedLine = formattedLine + '.';
      }
      
      return (
        <div key={index} className="mb-6">
          {title && (
            <h4 className="font-bold text-2xl text-gray-800 mb-4">{title}</h4>
          )}
          <p className="mb-2 text-sm text-gray-700">
            • {formattedLine}
          </p>
        </div>
      );
    }).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Analyzing location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
        <p className="text-red-800 text-sm font-semibold mb-1">Error</p>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-black mb-2">{clinic.name}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <p>
            <span className="font-semibold">Coordinates:</span> {clinic.lat.toFixed(6)}, {clinic.lng.toFixed(6)}
          </p>
          {clinic.district && (
            <p>
              <span className="font-semibold">District:</span> {clinic.district}
            </p>
          )}
        </div>
      </div>

      {analysis && (
        <div>
          {/* Status Badges */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                analysis.isMedicalDesert
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : analysis.hasPharmacyData
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              }`}
            >
              {analysis.isMedicalDesert
                ? '⚠️ Medical Desert'
                : analysis.hasPharmacyData
                ? '✓ Pharmacy Nearby'
                : '⚠️ Pharmacy Data Unavailable'}
            </span>
            {analysis.hasPharmacyData && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                {analysis.nearbyPharmaciesCount} Pharmacy{analysis.nearbyPharmaciesCount !== 1 ? 'ies' : ''} within 5km
              </span>
            )}
          </div>

          {/* Analysis Content */}
          <div className="border-t pt-4">
            <div className="prose prose-sm max-w-none">
              {formatAnalysis(analysis.analysis)}
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => window.location.reload()}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              Refresh Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
