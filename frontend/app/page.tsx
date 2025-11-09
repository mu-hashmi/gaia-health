'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Clinic, CoverageStats } from './types';
import { calculateCoverage } from './utils/coverage';
import { generateRecommendations, RecommendedLocation } from './utils/recommendations';
import CoverageStatsComponent from './components/CoverageStats';
import ClinicList from './components/ClinicList';
import AddClinicModal from './components/AddClinicModal';
import Recommendations from './components/Recommendations';
import PopulationCoverage from './components/PopulationCoverage';
import DistrictStats from './components/DistrictStats';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), { ssr: false });

type TabType = 'current' | 'hypothetical';

interface PopulationPoint {
  lat: number;
  lng: number;
  population: number;
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('current');
  const [currentClinics, setCurrentClinics] = useState<Clinic[]>([]);
  const [hypotheticalClinics, setHypotheticalClinics] = useState<Clinic[]>([]);
  const [populationPoints, setPopulationPoints] = useState<PopulationPoint[]>([]);
  const [currentStats, setCurrentStats] = useState<CoverageStats | null>(null);
  const [hypotheticalStats, setHypotheticalStats] = useState<CoverageStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedLocation[]>([]);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedClinicTypes, setSelectedClinicTypes] = useState<Set<Clinic['type']>>(new Set(['gaia', 'govt', 'cham']));
  const [districts, setDistricts] = useState<Array<{ name: string; id: number }>>([]);

  // Load real data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingData(true);
        // Load clinics, population, and districts data in parallel
        const [clinicsResponse, populationResponse, districtsResponse] = await Promise.all([
          fetch('/api/clinics'),
          fetch('/api/population?sampleFactor=5'),
          fetch('/api/districts'),
        ]);

        if (!clinicsResponse.ok || !populationResponse.ok) {
          throw new Error('Failed to load data');
        }

        const clinics = await clinicsResponse.json();
        const population = await populationResponse.json();
        const districtsData = districtsResponse.ok ? await districtsResponse.json() : [];

        setCurrentClinics(clinics);
        setHypotheticalClinics(clinics);
        setPopulationPoints(population);
        setDistricts(districtsData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty arrays on error
        setCurrentClinics([]);
        setHypotheticalClinics([]);
        setPopulationPoints([]);
        setDistricts([]);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, []);

  // Filter clinics based on district and clinic types
  const getFilteredClinics = (clinics: Clinic[]) => {
    return clinics.filter(clinic => {
      // Filter by clinic type
      if (!selectedClinicTypes.has(clinic.type)) {
        return false;
      }
      // Filter by district
      if (selectedDistrict && clinic.district !== selectedDistrict) {
        return false;
      }
      return true;
    });
  };

  const filteredCurrentClinics = getFilteredClinics(currentClinics);
  const filteredHypotheticalClinics = getFilteredClinics(hypotheticalClinics);

  // Calculate coverage for current clinics (using filtered clinics)
  useEffect(() => {
    if (populationPoints.length > 0) {
      const filtered = getFilteredClinics(currentClinics);
      const stats = calculateCoverage(filtered, populationPoints);
      setCurrentStats(stats);
    }
  }, [currentClinics, populationPoints, selectedDistrict, selectedClinicTypes]);

  // Calculate coverage for hypothetical clinics (using filtered clinics)
  useEffect(() => {
    if (populationPoints.length > 0) {
      const filtered = getFilteredClinics(hypotheticalClinics);
      const stats = calculateCoverage(filtered, populationPoints);
      setHypotheticalStats(stats);
    }
  }, [hypotheticalClinics, populationPoints, selectedDistrict, selectedClinicTypes]);

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
      const recs = generateRecommendations(clinicsToUse, populationPoints, 5);
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

  const handleClinicTypeToggle = (type: Clinic['type']) => {
    const newSet = new Set(selectedClinicTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedClinicTypes(newSet);
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
                {/* Filters */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-black">District Filter:</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      <option value="">All Districts</option>
                      {districts.map(district => (
                        <option key={district.id} value={district.name}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-black">Clinic Types:</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClinicTypes.has('gaia')}
                          onChange={() => handleClinicTypeToggle('gaia')}
                          className="w-4 h-4"
                        />
                        <span className="text-black">GAIA</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClinicTypes.has('govt')}
                          onChange={() => handleClinicTypeToggle('govt')}
                          className="w-4 h-4"
                        />
                        <span className="text-black">Government</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClinicTypes.has('cham')}
                          onChange={() => handleClinicTypeToggle('cham')}
                          className="w-4 h-4"
                        />
                        <span className="text-black">CHAM</span>
                      </label>
                    </div>
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
                {isLoadingData ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-black">Loading data...</p>
                    </div>
                  </div>
                ) : (
                  <Map 
                    clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics} 
                    onMapClick={handleMapClick} 
                    disableInteractions={isModalOpen}
                    populationPoints={populationPoints}
                    showHeatmap={showHeatmap}
                    recommendedLocations={recommendations}
                    selectedDistrict={selectedDistrict}
                  />
                )}
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

            {/* Population Coverage Component */}
            <PopulationCoverage
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              populationPoints={populationPoints}
            />

            {/* District Stats Component */}
            <DistrictStats
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              populationPoints={populationPoints}
              districts={districts}
            />

            {recommendations.length > 0 && (
              <Recommendations 
                recommendations={recommendations}
                onAddRecommended={handleAddRecommended}
                clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              />
            )}
            <ClinicList 
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics} 
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
