import { Clinic } from '../types';

// Malawi approximate center coordinates
const MALAWI_CENTER_LAT = -13.9626;
const MALAWI_CENTER_LNG = 33.7741;

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
  
  // CHAM clinics
  { id: 'cham-1', name: 'CHAM Clinic Mulanje', type: 'cham', lat: -16.0133, lng: 35.4800 },
  { id: 'cham-2', name: 'CHAM Clinic Phalombe', type: 'cham', lat: -15.7633, lng: 35.5367 },
  { id: 'cham-3', name: 'CHAM Clinic Mangochi', type: 'cham', lat: -14.4633, lng: 35.2867 },
];

// Mock population grid points (simplified for demo)
// In reality, this would come from the HDX population density data
export const mockPopulationPoints: Array<{ lat: number; lng: number; population: number }> = [];

// Generate mock population points in a grid around the clinic areas
for (let i = 0; i < 50; i++) {
  const lat = MALAWI_CENTER_LAT + (Math.random() - 0.5) * 3;
  const lng = MALAWI_CENTER_LNG + (Math.random() - 0.5) * 3;
  const population = Math.floor(Math.random() * 5000) + 500; // 500-5500 people per grid point
  mockPopulationPoints.push({ lat, lng, population });
}

