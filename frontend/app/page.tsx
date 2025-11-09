'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Clinic, CoverageStats, Village } from './types';
import { calculateCoverage } from './utils/coverage';
import { generateRecommendations, RecommendedLocation } from './utils/recommendations';
import { getLowCoverageClinicIds, LowCoverageClinic, analyzeDistrictClinics } from './utils/districtOptimization';
import { calculateRemovalImpact, recommendGAIAHCLocations, GAIARecommendation } from './utils/villageAnalysis';
import { filterPopulationByDistricts } from './utils/districtStats';
import CoverageStatsComponent from './components/CoverageStats';
import ClinicList from './components/ClinicList';
import AddClinicModal from './components/AddClinicModal';
import Recommendations from './components/Recommendations';
import PopulationCoverage from './components/PopulationCoverage';
import DistrictStats from './components/DistrictStats';
import ClinicImpactAnalysis from './components/ClinicImpactAnalysis';
import GAIAImpactStats from './components/GAIAImpactStats';
import ClinicDetailModal from './components/ClinicDetailModal';

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
  const [selectedClinicTypes, setSelectedClinicTypes] = useState<Set<Clinic['type']>>(new Set(['gaia', 'govt', 'healthcentre', 'other']));
  const [showOnlyTargetDistricts, setShowOnlyTargetDistricts] = useState<boolean>(true);
  const [districts, setDistricts] = useState<Array<{ name: string; id: number }>>([]);
  // District Optimization Feature
  const [optimizationDistrict, setOptimizationDistrict] = useState<string>('');
  const [lowCoverageClinics, setLowCoverageClinics] = useState<Set<string>>(new Set());
  const [districtAnalysis, setDistrictAnalysis] = useState<LowCoverageClinic[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // LLM Call Feature
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedClinicDetail, setSelectedClinicDetail] = useState<Clinic | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<ReturnType<typeof calculateRemovalImpact> | null>(null);
  const [gaiaRecommendations, setGaiaRecommendations] = useState<GAIARecommendation[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Load real data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingData(true);
        // Load clinics, population, districts, villages, and GeoJSON data in parallel
        const [clinicsResponse, populationResponse, districtsResponse, villagesResponse, geoJsonResponse] = await Promise.all([
          fetch('/api/clinics'),
          fetch('/api/population?sampleFactor=5'),
          fetch('/api/districts'),
          fetch('/api/villages'),
          fetch('/api/districts/geojson'),
        ]);

        if (!clinicsResponse.ok || !populationResponse.ok) {
          throw new Error('Failed to load data');
        }

        const clinics = await clinicsResponse.json();
        const population = await populationResponse.json();
        const districtsData = districtsResponse.ok ? await districtsResponse.json() : [];
        const villagesData = villagesResponse.ok ? await villagesResponse.json() : [];
        const geoJson = geoJsonResponse.ok ? await geoJsonResponse.json() : null;

        setCurrentClinics(clinics);
        setHypotheticalClinics(clinics);
        setPopulationPoints(population);
        setDistricts(districtsData);
        setVillages(villagesData);
        setGeoJsonData(geoJson);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty arrays on error
        setCurrentClinics([]);
        setHypotheticalClinics([]);
        setPopulationPoints([]);
        setDistricts([]);
        setVillages([]);
        setGeoJsonData(null);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, []);

  const GAIA_TARGET_DISTRICTS = ['Mangochi', 'Mulanje', 'Phalombe'];

  // Filter clinics based on district and clinic types
  const getFilteredClinics = (clinics: Clinic[]) => {
    return clinics.filter(clinic => {
      // Filter by clinic type
      if (!selectedClinicTypes.has(clinic.type)) {
        return false;
      }
      // Filter by target districts toggle
      if (showOnlyTargetDistricts && clinic.district && !GAIA_TARGET_DISTRICTS.includes(clinic.district)) {
        return false;
      }
      // Filter by selected district
      if (selectedDistrict && clinic.district !== selectedDistrict) {
        return false;
      }
      return true;
    });
  };

  // Memoize filtered clinics to avoid recalculating on every render
  const filteredCurrentClinicsMemo = useMemo(() => {
    return getFilteredClinics(currentClinics);
  }, [currentClinics, selectedDistrict, selectedClinicTypes, showOnlyTargetDistricts]);

  const filteredHypotheticalClinicsMemo = useMemo(() => {
    return getFilteredClinics(hypotheticalClinics);
  }, [hypotheticalClinics, selectedDistrict, selectedClinicTypes, showOnlyTargetDistricts]);

  // Use memoized filtered clinics
  const filteredCurrentClinics = filteredCurrentClinicsMemo;
  const filteredHypotheticalClinics = filteredHypotheticalClinicsMemo;

  // Get filtered population points based on target districts toggle
  const filteredPopulationPoints = useMemo(() => {
    if (showOnlyTargetDistricts && geoJsonData) {
      return filterPopulationByDistricts(populationPoints, GAIA_TARGET_DISTRICTS, geoJsonData);
    }
    return populationPoints;
  }, [populationPoints, showOnlyTargetDistricts, geoJsonData]);

  // Calculate coverage for current clinics (using filtered clinics and population)
  useEffect(() => {
    if (filteredPopulationPoints.length > 0) {
      const stats = calculateCoverage(filteredCurrentClinicsMemo, filteredPopulationPoints);
      setCurrentStats(stats);
    }
  }, [filteredCurrentClinicsMemo, filteredPopulationPoints]);

  // Calculate coverage for hypothetical clinics (using filtered clinics and population)
  useEffect(() => {
    if (filteredPopulationPoints.length > 0) {
      const stats = calculateCoverage(filteredHypotheticalClinicsMemo, filteredPopulationPoints);
      setHypotheticalStats(stats);
    }
  }, [filteredHypotheticalClinicsMemo, filteredPopulationPoints]);

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
      const recs = generateRecommendations(clinicsToUse, filteredPopulationPoints, 5);
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

  // District Optimization Handler
  const handleAnalyzeDistrictClinics = () => {
    if (!optimizationDistrict || populationPoints.length === 0) {
      alert('Please select a district to analyze');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const clinicsToAnalyze = currentTab === 'current' ? currentClinics : hypotheticalClinics;

      // Get analysis of clinics in the selected district
      const analysis = analyzeDistrictClinics(
        clinicsToAnalyze,
        populationPoints,
        optimizationDistrict,
        5 // 5km coverage radius
      );

      setDistrictAnalysis(analysis);

      // Mark the bottom 50% (low coverage clinics) as stars
      const lowCoverageIds = getLowCoverageClinicIds(
        clinicsToAnalyze,
        populationPoints,
        optimizationDistrict,
        5,
        50 // Bottom 50%
      );

      setLowCoverageClinics(lowCoverageIds);
      setIsAnalyzing(false);
    }, 300);
  };

  const handleClearAnalysis = () => {
    setOptimizationDistrict('');
    setLowCoverageClinics(new Set());
    setDistrictAnalysis([]);
  };

  // LLM Call Feature Handlers
  const handleCategoryToggle = (category: 'gaia' | 'allOthers') => {
    const newSet = new Set(selectedClinicTypes);
    if (category === 'gaia') {
      if (newSet.has('gaia')) {
        newSet.delete('gaia');
      } else {
        newSet.add('gaia');
      }
    } else {
      // Toggle all non-GAIA types together
      const allOthersTypes: Clinic['type'][] = ['govt', 'healthcentre', 'other'];
      const allSelected = allOthersTypes.every(t => newSet.has(t));
      if (allSelected) {
        allOthersTypes.forEach(t => newSet.delete(t));
      } else {
        allOthersTypes.forEach(t => newSet.add(t));
      }
    }
    setSelectedClinicTypes(newSet);
  };

  const isCategorySelected = (category: 'gaia' | 'allOthers') => {
    if (category === 'gaia') {
      return selectedClinicTypes.has('gaia');
    }
    const allOthersTypes: Clinic['type'][] = ['govt', 'healthcentre', 'other'];
    return allOthersTypes.every(t => selectedClinicTypes.has(t));
  };

  // Handle clinic selection for impact analysis
  useEffect(() => {
    if (selectedClinic && villages.length > 0 && filteredPopulationPoints.length > 0) {
      const clinicsToUse = currentTab === 'current' ? currentClinics : hypotheticalClinics;
      const impact = calculateRemovalImpact(
        selectedClinic,
        clinicsToUse,
        villages,
        filteredPopulationPoints
      );
      setImpactAnalysis(impact);

      // Generate GAIA recommendations
      const recommendations = recommendGAIAHCLocations(
        selectedClinic,
        clinicsToUse,
        villages,
        filteredPopulationPoints
      );
      setGaiaRecommendations(recommendations);
    } else {
      setImpactAnalysis(null);
      setGaiaRecommendations([]);
    }
  }, [selectedClinic, villages, filteredPopulationPoints, currentTab, currentClinics, hypotheticalClinics]);

  const handleSelectClinic = (clinic: Clinic | null) => {
    setSelectedClinic(clinic);
  };

  const handleAddGAIALocation = (rec: GAIARecommendation) => {
    const newClinic: Clinic = {
      id: `gaia-mhc-${Date.now()}`,
      name: `GAIA MHC - ${rec.villageName}`,
      type: 'gaia',
      lat: rec.lat,
      lng: rec.lng,
    };
    if (currentTab === 'current') {
      setCurrentClinics([...currentClinics, newClinic]);
    } else {
      setHypotheticalClinics([...hypotheticalClinics, newClinic]);
    }
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyTargetDistricts}
                        onChange={(e) => setShowOnlyTargetDistricts(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-black font-medium">Show Only Target Districts (Mangochi, Mulanje, Phalombe)</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium !text-black">District Filter:</label>
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
                    <label className="text-sm font-medium text-black">Clinic Categories:</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCategorySelected('gaia')}
                          onChange={() => handleCategoryToggle('gaia')}
                          className="w-4 h-4"
                        />
                        <span className="text-black">GAIA</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCategorySelected('allOthers')}
                          onChange={() => handleCategoryToggle('allOthers')}
                          className="w-4 h-4"
                        />
                        <span className="text-black">Other</span>
                      </label>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <label htmlFor="optimization-district" className="text-sm font-medium text-black mb-2 block">District Clinic Optimization:</label>
                    <div className="flex items-center gap-2">
                      <select
                        id="optimization-district"
                        value={optimizationDistrict}
                        onChange={(e) => setOptimizationDistrict(e.target.value)}
                        className="px-3 py-2 border rounded text-sm flex-1"
                      >
                        <option value="">Select district to analyze</option>
                        {districts.map(district => (
                          <option key={district.id} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAnalyzeDistrictClinics}
                        disabled={isAnalyzing || !optimizationDistrict}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                      </button>
                      {lowCoverageClinics.size > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAnalysis}
                          className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm font-medium whitespace-nowrap"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-black font-medium">GAIA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                    <span className="text-black font-medium">Other</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-500" style={{ borderRadius: '2px' }}></div>
                    <span className="text-black font-medium text-xs">Health Centre (square)</span>
                  </div>
                  {recommendations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white"></div>
                      <span className="text-black font-medium">Recommended</span>
                    </div>
                  )}
                  {lowCoverageClinics.size > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="text-lg">⭐</div>
                      <span className="text-black font-medium">Low Coverage</span>
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
                    onClinicClick={(clinic) => setSelectedClinicDetail(clinic)}
                    disableInteractions={isModalOpen || selectedClinicDetail !== null}
                    populationPoints={filteredPopulationPoints}
                    showHeatmap={showHeatmap}
                    recommendedLocations={recommendations}
                    selectedDistrict={selectedDistrict}
                    lowCoverageClinicIds={lowCoverageClinics}
                    onRecommendedClick={handleAddRecommended}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Stats and Clinic List */}
          <div className="space-y-6">
            {/* GAIA Impact Stats Component - Most Important, Show First */}
            <GAIAImpactStats
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              populationPoints={filteredPopulationPoints}
            />

            {/* Stats */}
            {currentStats && (
              <CoverageStatsComponent stats={currentStats} />
            )}

            {/* Population Coverage Component */}
            <PopulationCoverage
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              populationPoints={filteredPopulationPoints}
            />

            {/* District Stats Component */}
            <DistrictStats
              clinics={currentTab === 'current' ? filteredCurrentClinics : filteredHypotheticalClinics}
              populationPoints={filteredPopulationPoints}
              districts={districts}
            />

            {/* Impact Analysis for selected govt clinic */}
            {selectedClinic && impactAnalysis && (
              <ClinicImpactAnalysis
                clinic={selectedClinic}
                impact={impactAnalysis}
                gaiaRecommendations={gaiaRecommendations}
                onAddGAIALocation={handleAddGAIALocation}
              />
            )}

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
              onSelectClinic={handleSelectClinic}
              selectedClinicId={selectedClinic?.id || null}
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

      <ClinicDetailModal
        clinic={selectedClinicDetail}
        isOpen={selectedClinicDetail !== null}
        onClose={() => setSelectedClinicDetail(null)}
        onRemove={handleRemoveClinic}
        populationPoints={filteredPopulationPoints}
      />

    </div>
  );
}
