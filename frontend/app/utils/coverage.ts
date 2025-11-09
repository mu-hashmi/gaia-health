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

// Fast approximation for distance check (uses bounding box)
// Returns true if point might be within radius (for initial filtering)
function isWithinBoundingBox(
  pointLat: number,
  pointLng: number,
  clinicLat: number,
  clinicLng: number,
  radiusKm: number
): boolean {
  // Approximate: 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 km * cos(latitude)
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos(clinicLat * Math.PI / 180));
  
  return Math.abs(pointLat - clinicLat) <= latRadius && 
         Math.abs(pointLng - clinicLng) <= lngRadius;
}

// Check if a population point is within radius of any clinic (optimized)
function isPointCovered(
  pointLat: number,
  pointLng: number,
  clinics: Clinic[],
  coverageRadius: number = 5
): boolean {
  // Fast path: if no clinics, point is not covered
  if (clinics.length === 0) return false;
  
  // Use bounding box pre-filtering to avoid expensive Haversine calculations
  for (const clinic of clinics) {
    // First check if point is within bounding box (fast approximation)
    if (isWithinBoundingBox(pointLat, pointLng, clinic.lat, clinic.lng, coverageRadius)) {
      // Only do expensive Haversine calculation if within bounding box
      const distance = calculateDistance(pointLat, pointLng, clinic.lat, clinic.lng);
      if (distance <= coverageRadius) {
        return true; // Early exit - found a clinic within range
      }
    }
  }
  return false;
}

// Calculate coverage statistics (optimized)
export function calculateCoverage(
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  coverageRadius: number = 5
): CoverageStats {
  let totalPopulation = 0;
  let coveredPopulation = 0;

  // Fast path: if no clinics, nothing is covered
  if (clinics.length === 0) {
    for (const point of populationPoints) {
      totalPopulation += point.population;
    }
    return {
      totalPopulation,
      coveredPopulation: 0,
      uncoveredPopulation: totalPopulation,
      coveragePercentage: 0,
    };
  }

  // Process points with optimized distance checks
  for (const point of populationPoints) {
    totalPopulation += point.population;
    if (isPointCovered(point.lat, point.lng, clinics, coverageRadius)) {
      coveredPopulation += point.population;
    }
  }

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

