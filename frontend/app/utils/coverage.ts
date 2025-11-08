import { Clinic, CoverageStats } from '../types';

// Calculate distance between two points using Haversine formula (in km)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if a population point is within 5km of any clinic
function isPointCovered(
  pointLat: number,
  pointLng: number,
  clinics: Clinic[],
  coverageRadius: number = 5
): boolean {
  return clinics.some(clinic => {
    const distance = calculateDistance(pointLat, pointLng, clinic.lat, clinic.lng);
    return distance <= coverageRadius;
  });
}

// Calculate coverage statistics
export function calculateCoverage(
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  coverageRadius: number = 5
): CoverageStats {
  let totalPopulation = 0;
  let coveredPopulation = 0;

  populationPoints.forEach(point => {
    totalPopulation += point.population;
    if (isPointCovered(point.lat, point.lng, clinics, coverageRadius)) {
      coveredPopulation += point.population;
    }
  });

  const uncoveredPopulation = totalPopulation - coveredPopulation;
  const coveragePercentage = totalPopulation > 0 
    ? (coveredPopulation / totalPopulation) * 100 
    : 0;

  return {
    totalPopulation,
    coveredPopulation,
    uncoveredPopulation,
    coveragePercentage,
  };
}

