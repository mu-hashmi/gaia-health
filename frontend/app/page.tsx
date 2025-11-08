'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Clinic, CoverageStats } from './types';
import { mockClinics, mockPopulationPoints } from './data/mockData';
import { calculateCoverage } from './utils/coverage';
import CoverageStatsComponent from './components/CoverageStats';
import ClinicList from './components/ClinicList';
import AddClinicModal from './components/AddClinicModal';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), { ssr: false });

export default function Home() {
  const [clinics, setClinics] = useState<Clinic[]>(mockClinics);
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [previousStats, setPreviousStats] = useState<CoverageStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Calculate coverage whenever clinics change
  useEffect(() => {
    const stats = calculateCoverage(clinics, mockPopulationPoints);
    setPreviousStats(coverageStats);
    setCoverageStats(stats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics]);

  const handleRemoveClinic = (id: string) => {
    setClinics(clinics.filter(clinic => clinic.id !== id));
  };

  const handleMapClick = (lat: number, lng: number) => {
    setClickedLocation({ lat, lng });
    setIsModalOpen(true);
  };

  const handleAddClinic = (name: string, type: Clinic['type'], lat: number, lng: number) => {
    const newClinic: Clinic = {
      id: `${type}-${Date.now()}`,
      name,
      type,
      lat,
      lng,
    };
    setClinics([...clinics, newClinic]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            GAIA Health: Healthcare Access Visualization
          </h1>
          <p className="text-gray-600 mt-1">
            Data-driven resource allocation for equitable healthcare in Malawi
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800">Healthcare Access Map</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click on the map to add a new clinic. Circles show 5km coverage radius.
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span>GAIA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span>Government</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span>CHAM</span>
                  </div>
                </div>
              </div>
              <div className="h-[600px] w-full">
                <Map clinics={clinics} onMapClick={handleMapClick} disableInteractions={isModalOpen} />
              </div>
            </div>
          </div>

          {/* Sidebar - Stats and Clinic List */}
          <div className="space-y-6">
            {coverageStats && (
              <CoverageStatsComponent stats={coverageStats} previousStats={previousStats || undefined} />
            )}
            <ClinicList clinics={clinics} onRemove={handleRemoveClinic} />
          </div>
        </div>
      </main>

      {clickedLocation && (
        <AddClinicModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setClickedLocation(null);
          }}
          onAdd={handleAddClinic}
          lat={clickedLocation.lat}
          lng={clickedLocation.lng}
        />
      )}
    </div>
  );
}
