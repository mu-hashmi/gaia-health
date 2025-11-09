import { Clinic } from '../types';
import { calculateCoverage, calculateDistance } from './coverage';

// Fast bounding box check to avoid expensive Haversine calculations
function isWithinBoundingBox(
  pointLat: number,
  pointLng: number,
  clinicLat: number,
  clinicLng: number,
  radiusKm: number
): boolean {
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos(clinicLat * Math.PI / 180));
  return Math.abs(pointLat - clinicLat) <= latRadius && 
         Math.abs(pointLng - clinicLng) <= lngRadius;
}

// Optimized check if point is covered by clinic
function isPointCoveredByClinic(
  pointLat: number,
  pointLng: number,
  clinicLat: number,
  clinicLng: number,
  radiusKm: number
): boolean {
  if (isWithinBoundingBox(pointLat, pointLng, clinicLat, clinicLng, radiusKm)) {
    const distance = calculateDistance(pointLat, pointLng, clinicLat, clinicLng);
    return distance <= radiusKm;
  }
  return false;
}

export interface DistrictStats {
  districtName: string;
  clinics: Clinic[];
  clinicsByType: {
    gaia: Clinic[];
    govt: Clinic[];
    cham: Clinic[];
  };
  coverage: {
    totalPopulation: number;
    coveredPopulation: number;
    uncoveredPopulation: number;
    coveragePercentage: number;
  };
  coverageByType: {
    gaia: number;
    govt: number;
    cham: number;
  };
}

export function calculateDistrictStats(
  districtName: string,
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>
): DistrictStats {
  // Filter clinics for this district
  const districtClinics = clinics.filter(c => c.district === districtName);

  // Group clinics by type
  const clinicsByType = {
    gaia: districtClinics.filter(c => c.type === 'gaia'),
    govt: districtClinics.filter(c => c.type === 'govt'),
    cham: districtClinics.filter(c => c.type === 'cham'),
  };

  // Calculate coverage for this district
  const coverage = calculateCoverage(districtClinics, populationPoints);

  // Calculate unique coverage per clinic type (no double counting) - optimized
  const calculateUniqueCoverageByType = (type: Clinic['type']) => {
    const typeClinics = districtClinics.filter(c => c.type === type);
    if (typeClinics.length === 0) return 0;
    
    const coveredPoints = new Set<string>();
    let totalPopulation = 0;
    const coverageRadius = 5; // 5km radius

    for (const point of populationPoints) {
      let isCovered = false;
      for (const clinic of typeClinics) {
        if (isPointCoveredByClinic(point.lat, point.lng, clinic.lat, clinic.lng, coverageRadius)) {
          isCovered = true;
          break; // Early exit
        }
      }

      if (isCovered) {
        const pointKey = `${point.lat},${point.lng}`;
        if (!coveredPoints.has(pointKey)) {
          coveredPoints.add(pointKey);
          totalPopulation += point.population;
        }
      }
    }

    return totalPopulation;
  };

  const coverageByType = {
    gaia: calculateUniqueCoverageByType('gaia'),
    govt: calculateUniqueCoverageByType('govt'),
    cham: calculateUniqueCoverageByType('cham'),
  };

  return {
    districtName,
    clinics: districtClinics,
    clinicsByType,
    coverage,
    coverageByType,
  };
}

