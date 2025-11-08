'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Clinic, CoverageStats } from './types';
import { mockClinics, mockPopulationPoints } from './data/mockData';
import { calculateCoverage } from './utils/coverage';
import { generateRecommendations, RecommendedLocation } from './utils/recommendations';
import CoverageStatsComponent from './components/CoverageStats';
import ClinicList from './components/ClinicList';
import AddClinicModal from './components/AddClinicModal';
import Recommendations from './components/Recommendations';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), { ssr: false });

type TabType = 'current' | 'hypothetical';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('current');
  const [currentClinics, setCurrentClinics] = useState<Clinic[]>(mockClinics);
  const [hypotheticalClinics, setHypotheticalClinics] = useState<Clinic[]>(mockClinics);
  const [currentStats, setCurrentStats] = useState<CoverageStats | null>(null);
  const [hypotheticalStats, setHypotheticalStats] = useState<CoverageStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedLocation[]>([]);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);

  // Calculate coverage for current clinics
  useEffect(() => {
    const stats = calculateCoverage(currentClinics, mockPopulationPoints);
    setCurrentStats(stats);
  }, [currentClinics]);

  // Calculate coverage for hypothetical clinics
  useEffect(() => {
    const stats = calculateCoverage(hypotheticalClinics, mockPopulationPoints);
    setHypotheticalStats(stats);
  }, [hypotheticalClinics]);

  const handleRemoveClinic = (id: string) => {
    if (currentTab === 'current') {
      setCurrentClinics(currentClinics.filter(clinic => clinic.id !== id));
    } else {
      setHypotheticalClinics(hypotheticalClinics.filter(clinic => clinic.id !== id));
    }
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
    if (currentTab === 'current') {
      setCurrentClinics([...currentClinics, newClinic]);
    } else {
      setHypotheticalClinics([...hypotheticalClinics, newClinic]);
    }
    // Regenerate recommendations after adding a clinic
    if (recommendations.length > 0) {
      handleGenerateRecommendations();
    }
  };

  const handleGenerateRecommendations = () => {
    setIsGeneratingRecommendations(true);
    // Small delay to show loading state
    const clinicsToUse = currentTab === 'current' ? currentClinics : hypotheticalClinics;
    setTimeout(() => {
      const recs = generateRecommendations(clinicsToUse, 5);
      setRecommendations(recs);
      setIsGeneratingRecommendations(false);
    }, 500);
  };

  const handleAddRecommended = (rec: RecommendedLocation) => {
    const newClinic: Clinic = {
      id: `recommended-${Date.now()}`,
      name: `Recommended Clinic ${recommendations.indexOf(rec) + 1}`,
      type: 'gaia', // Default to GAIA for recommendations
      lat: rec.lat,
      lng: rec.lng,
    };
    if (currentTab === 'current') {
      setCurrentClinics([...currentClinics, newClinic]);
    } else {
      setHypotheticalClinics([...hypotheticalClinics, newClinic]);
    }
    // Remove this recommendation from the list
    setRecommendations(recommendations.filter(r => r !== rec));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-black">
            GAIA Health: Healthcare Access Visualization
          </h1>
          <p className="text-black mt-1">
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
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Healthcare Access Map</h2>
                    <p className="text-sm text-black mt-1">
                      Click on the map to add a new clinic. Circles show 5km coverage radius.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHeatmap}
                        onChange={(e) => setShowHeatmap(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-black font-medium">Show Population Heatmap</span>
                    </label>
                    <button
                      onClick={handleGenerateRecommendations}
                      disabled={isGeneratingRecommendations}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingRecommendations ? 'Generating...' : 'Generate Recommendations'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-black font-medium">GAIA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-black font-medium">Government</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span className="text-black font-medium">CHAM</span>
                  </div>
                  {recommendations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white"></div>
                      <span className="text-black font-medium">Recommended</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[600px] w-full">
                <Map 
                  clinics={currentTab === 'current' ? currentClinics : hypotheticalClinics} 
                  onMapClick={handleMapClick} 
                  disableInteractions={isModalOpen}
                  populationPoints={mockPopulationPoints}
                  showHeatmap={showHeatmap}
                  recommendedLocations={recommendations}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Stats and Clinic List */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="flex border-b">
                <button
                  onClick={() => setCurrentTab('current')}
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    currentTab === 'current'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  Current Clinics
                </button>
                <button
                  onClick={() => setCurrentTab('hypothetical')}
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    currentTab === 'hypothetical'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  Hypothetical
                </button>
              </div>
            </div>

            {/* Stats for current tab */}
            {currentTab === 'current' && currentStats && (
              <CoverageStatsComponent stats={currentStats} />
            )}

            {/* Stats for hypothetical tab with comparison */}
            {currentTab === 'hypothetical' && hypotheticalStats && currentStats && (
              <CoverageStatsComponent 
                stats={hypotheticalStats} 
                previousStats={currentStats}
              />
            )}

            {recommendations.length > 0 && (
              <Recommendations 
                recommendations={recommendations}
                onAddRecommended={handleAddRecommended}
                clinics={currentTab === 'current' ? currentClinics : hypotheticalClinics}
              />
            )}
            <ClinicList 
              clinics={currentTab === 'current' ? currentClinics : hypotheticalClinics} 
              onRemove={handleRemoveClinic} 
            />
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
