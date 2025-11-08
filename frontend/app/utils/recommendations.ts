import { Clinic } from '../types';
import { mockPopulationPoints } from '../data/mockData';
import { calculateDistance } from './coverage';

export interface RecommendedLocation {
  lat: number;
  lng: number;
  score: number;
  uncoveredPopulation: number;
  distanceToNearestClinic: number;
}

/**
 * Calculate need score for a location based on:
 * - Population density (higher = more need)
 * - Distance to nearest clinic (further = more need)
 */
function calculateNeedScore(
  lat: number,
  lng: number,
  existingClinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  coverageRadius: number = 5
): { score: number; uncoveredPopulation: number; distanceToNearest: number } {
  // Find nearest existing clinic
  let minDistance = Infinity;
  existingClinics.forEach(clinic => {
    const dist = calculateDistance(lat, lng, clinic.lat, clinic.lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  });

  // Calculate uncovered population within coverage radius
  let uncoveredPopulation = 0;
  populationPoints.forEach(point => {
    const distToPoint = calculateDistance(lat, lng, point.lat, point.lng);
    if (distToPoint <= coverageRadius) {
      // Check if this point is already covered by an existing clinic
      const isCovered = existingClinics.some(clinic => {
        const distToClinic = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
        return distToClinic <= coverageRadius;
      });
      
      if (!isCovered) {
        uncoveredPopulation += point.population;
      }
    }
  });

  // Score calculation:
  // - Higher uncovered population = higher score
  // - Further from nearest clinic = higher score (up to a point)
  // - But don't recommend if too close to existing clinic (avoid overlap)
  const distanceScore = Math.min(minDistance / 10, 1); // Normalize distance (max at 10km)
  const populationScore = Math.min(uncoveredPopulation / 50000, 1); // Normalize population (max at 50k)
  
  // Combined score (weighted)
  const score = (populationScore * 0.7) + (distanceScore * 0.3);
  
  // Penalize if too close to existing clinic (within 10km)
  const finalScore = minDistance < 10 ? score * 0.3 : score;

  return {
    score: finalScore,
    uncoveredPopulation,
    distanceToNearest: minDistance,
  };
}

/**
 * Generate recommended clinic locations
 * @param existingClinics Current clinics
 * @param numRecommendations Number of recommendations to generate
 * @param coverageRadius Coverage radius in km
 */
export function generateRecommendations(
  existingClinics: Clinic[],
  numRecommendations: number = 5,
  coverageRadius: number = 5
): RecommendedLocation[] {
  const recommendations: RecommendedLocation[] = [];
  
  // Sample candidate locations from population points
  // Focus on areas with high population density
  const candidatePoints = mockPopulationPoints
    .filter(point => {
      // Filter out points already covered by existing clinics
      return !existingClinics.some(clinic => {
        const dist = calculateDistance(point.lat, point.lng, clinic.lat, clinic.lng);
        return dist <= coverageRadius * 2; // Avoid overlap (2x radius)
      });
    })
    .sort((a, b) => b.population - a.population) // Sort by population density
    .slice(0, 200); // Consider top 200 candidates

  // Evaluate each candidate
  const scoredCandidates: RecommendedLocation[] = candidatePoints.map(point => {
    const { score, uncoveredPopulation, distanceToNearest } = calculateNeedScore(
      point.lat,
      point.lng,
      existingClinics,
      mockPopulationPoints,
      coverageRadius
    );

    return {
      lat: point.lat,
      lng: point.lng,
      score,
      uncoveredPopulation,
      distanceToNearestClinic: distanceToNearest,
    };
  });

  // Sort by score and take top recommendations
  const topRecommendations = scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, numRecommendations * 2); // Get more candidates to filter overlaps

  // Filter out recommendations that are too close to each other
  const finalRecommendations: RecommendedLocation[] = [];
  for (const rec of topRecommendations) {
    const isTooClose = finalRecommendations.some(existing => {
      const dist = calculateDistance(rec.lat, rec.lng, existing.lat, existing.lng);
      return dist < coverageRadius * 2; // Minimum 10km apart
    });

    if (!isTooClose) {
      finalRecommendations.push(rec);
      if (finalRecommendations.length >= numRecommendations) {
        break;
      }
    }
  }

  return finalRecommendations;
}

