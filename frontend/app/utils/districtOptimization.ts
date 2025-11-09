import { Clinic } from '../types';
import { calculateDistance } from './coverage';

export interface LowCoverageClinic {
  clinicId: string;
  clinicName: string;
  district: string;
  lat: number;
  lng: number;
  populationCovered: number;
  totalPopulationInDistrict: number;
  coveragePercentage: number;
  rank: number; // Rank within district (1 = worst coverage)
}

/**
 * Analyze clinics in a specific district to identify those with poor population coverage
 * Returns clinics ranked by their coverage percentage (lowest first)
 */
export function analyzeDistrictClinics(
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  district: string,
  coverageRadius: number = 5
): LowCoverageClinic[] {
  // Filter clinics for this district
  const districtClinics = clinics.filter(c => c.district === district);

  if (districtClinics.length === 0) {
    return [];
  }

  // Get population points in this district
  // For now, use all points as we don't have district boundaries in population data
  const totalDistrictPopulation = populationPoints.reduce((sum, p) => sum + p.population, 0);

  // Calculate coverage for each clinic individually
  const clinicCoverageAnalysis = districtClinics.map(clinic => {
    // Calculate population covered by this clinic only
    let populationCovered = 0;

    for (const point of populationPoints) {
      const distance = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
      if (distance <= coverageRadius) {
        populationCovered += point.population;
      }
    }

    const coveragePercentage = totalDistrictPopulation > 0
      ? (populationCovered / totalDistrictPopulation) * 100
      : 0;

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      district: clinic.district || '',
      lat: clinic.lat,
      lng: clinic.lng,
      populationCovered,
      totalPopulationInDistrict: totalDistrictPopulation,
      coveragePercentage,
    };
  });

  // Sort by coverage percentage (ascending - lowest coverage first)
  const sorted = clinicCoverageAnalysis.sort(
    (a, b) => a.coveragePercentage - b.coveragePercentage
  );

  // Add rank
  return sorted.map((clinic, index) => ({
    ...clinic,
    rank: index + 1,
  }));
}

/**
 * Get low-coverage clinics (bottom performers) in a district
 * Returns clinics in the lower quartile by coverage
 */
export function getLowCoverageClinics(
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  district: string,
  coverageRadius: number = 5,
  percentileThreshold: number = 50 // Bottom 50% are considered low coverage
): LowCoverageClinic[] {
  const analysis = analyzeDistrictClinics(clinics, populationPoints, district, coverageRadius);

  if (analysis.length === 0) {
    return [];
  }

  // Calculate the threshold based on percentile
  const thresholdIndex = Math.ceil((percentileThreshold / 100) * analysis.length);

  return analysis.slice(0, thresholdIndex);
}

/**
 * Get clinic IDs that have low coverage in a specific district
 */
export function getLowCoverageClinicIds(
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  district: string,
  coverageRadius: number = 5,
  percentileThreshold: number = 50
): Set<string> {
  const lowCoverageClinics = getLowCoverageClinics(
    clinics,
    populationPoints,
    district,
    coverageRadius,
    percentileThreshold
  );

  return new Set(lowCoverageClinics.map(c => c.clinicId));
}
