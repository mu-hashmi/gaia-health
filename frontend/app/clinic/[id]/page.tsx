'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clinic } from '../../types';
import Link from 'next/link';
import ClinicAnalysisWidget from '../../components/ClinicAnalysisWidget';

export default function ClinicAnalysisPage() {
  const params = useParams();
  const clinicId = params.id as string;
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClinic() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load all clinics and find the one by ID
        const response = await fetch('/api/clinics');
        
        if (!response.ok) {
          setError('Failed to load clinic data');
          return;
        }

        const clinics = await response.json();
        const foundClinic = clinics.find((c: Clinic) => c.id === clinicId);
        
        if (!foundClinic) {
          setError('Clinic not found');
          return;
        }

        setClinic(foundClinic);
      } catch (err) {
        console.error('Error loading clinic:', err);
        setError('An error occurred while loading the clinic');
      } finally {
        setIsLoading(false);
      }
    }

    if (clinicId) {
      loadClinic();
    }
  }, [clinicId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center animate-fadeIn">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinic analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error || 'Clinic not found'}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 animate-fadeIn">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-block transition-colors"
              >
                ← Back to Map
              </Link>
              <h1 className="text-3xl font-bold text-black">
                Clinic Analysis
              </h1>
              <p className="text-black mt-1">
                {clinic.name} - {clinic.district || 'Unknown District'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClinicAnalysisWidget clinic={clinic} />
      </main>
    </div>
  );
}

