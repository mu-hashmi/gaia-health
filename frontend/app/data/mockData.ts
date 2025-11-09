import { Clinic } from '../types';

// Mock clinic data - focusing on Mulanje, Phalombe, and Mangochi districts
export const mockClinics: Clinic[] = [
  // GAIA clinics
  { id: 'gaia-1', name: 'GAIA Mobile Clinic 1', type: 'gaia', lat: -16.0333, lng: 35.5000 },
  { id: 'gaia-2', name: 'GAIA Mobile Clinic 2', type: 'gaia', lat: -15.7833, lng: 35.5167 },
  { id: 'gaia-3', name: 'GAIA Mobile Clinic 3', type: 'gaia', lat: -14.4833, lng: 35.2667 },
  
  // Government clinics
  { id: 'govt-1', name: 'Mulanje District Hospital', type: 'govt', lat: -16.0333, lng: 35.5000 },
  { id: 'govt-2', name: 'Phalombe Health Center', type: 'govt', lat: -15.7833, lng: 35.5167 },
  { id: 'govt-3', name: 'Mangochi District Hospital', type: 'govt', lat: -14.4833, lng: 35.2667 },
  { id: 'govt-4', name: 'Mulanje Health Post', type: 'govt', lat: -16.0833, lng: 35.4500 },
  { id: 'govt-5', name: 'Phalombe Health Post', type: 'govt', lat: -15.7333, lng: 35.5667 },
  
  // Health Centre clinics
  { id: 'healthcentre-1', name: 'Mulanje Health Centre', type: 'healthcentre', lat: -16.0133, lng: 35.4800 },
  { id: 'healthcentre-2', name: 'Phalombe Health Centre', type: 'healthcentre', lat: -15.7633, lng: 35.5367 },
  { id: 'healthcentre-3', name: 'Mangochi Health Centre', type: 'healthcentre', lat: -14.4633, lng: 35.2867 },
  
  // Other clinics
  { id: 'other-1', name: 'Private Clinic Mulanje', type: 'other', lat: -16.0233, lng: 35.4900 },
  { id: 'other-2', name: 'Mission Clinic Phalombe', type: 'other', lat: -15.7733, lng: 35.5267 },
];

// Mock population grid points (simplified for demo)
// In reality, this would come from the HDX population density data
export const mockPopulationPoints: Array<{ lat: number; lng: number; population: number }> = [];

// Generate a denser grid of population points for heatmap visualization
// Focus on Mulanje, Phalombe, and Mangochi districts area
const gridSize = 0.05; // ~5.5km spacing
const latStart = -16.2;
const latEnd = -14.3;
const lngStart = 35.2;
const lngEnd = 35.7;

// Create a grid of population points
for (let lat = latStart; lat <= latEnd; lat += gridSize) {
  for (let lng = lngStart; lng <= lngEnd; lng += gridSize) {
    // Add some randomness to make it more realistic
    const finalLat = lat + (Math.random() - 0.5) * gridSize * 0.3;
    const finalLng = lng + (Math.random() - 0.5) * gridSize * 0.3;
    
    // Higher population density near urban areas (Mulanje, Phalombe, Mangochi)
    const distToMulanje = Math.sqrt(Math.pow(finalLat - (-16.0333), 2) + Math.pow(finalLng - 35.5000, 2));
    const distToPhalombe = Math.sqrt(Math.pow(finalLat - (-15.7833), 2) + Math.pow(finalLng - 35.5167, 2));
    const distToMangochi = Math.sqrt(Math.pow(finalLat - (-14.4833), 2) + Math.pow(finalLng - 35.2667, 2));
    
    const minDist = Math.min(distToMulanje, distToPhalombe, distToMangochi);
    
    // Population density decreases with distance from urban centers
    let population = 0;
    if (minDist < 0.2) {
      population = Math.floor(Math.random() * 8000) + 2000; // High density: 2000-10000
    } else if (minDist < 0.5) {
      population = Math.floor(Math.random() * 5000) + 1000; // Medium density: 1000-6000
    } else {
      population = Math.floor(Math.random() * 3000) + 200; // Low density: 200-3200
    }
    
    mockPopulationPoints.push({ lat: finalLat, lng: finalLng, population });
  }
}

// Also add some random scattered points for rural areas
for (let i = 0; i < 100; i++) {
  const lat = latStart + Math.random() * (latEnd - latStart);
  const lng = lngStart + Math.random() * (lngEnd - lngStart);
  const population = Math.floor(Math.random() * 2000) + 100; // 100-2100 people
  mockPopulationPoints.push({ lat, lng, population });
}

