import { Clinic } from '../types';
import { calculateDistance } from './coverage';

export interface Village {
  lat: number;
  lng: number;
  name: string;
}

export interface ImpactAnalysis {
  affectedVillages: Array<{
    village: Village;
    distance: number;
    population: number; // Estimated population from nearby population points
  }>;
  totalAffectedPopulation: number;
  affectedVillageCount: number;
}

export interface GAIARecommendation {
  lat: number;
  lng: number;
  villageName: string;
  villagesCovered: Village[];
  totalPopulationCovered: number;
  score: number;
}

/**
 * Calculate impact when a clinic is removed
 * Returns villages and populations that would lose coverage
 */
export function calculateRemovalImpact(
  clinicToRemove: Clinic,
  allClinics: Clinic[],
  villages: Village[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  coverageRadius: number = 5
): ImpactAnalysis {
  // Get all clinics except the one being removed
  const remainingClinics = allClinics.filter(c => c.id !== clinicToRemove.id);
  
  // Find villages within coverage radius of the clinic being removed
  const villagesInRadius: Array<{ village: Village; distance: number }> = [];
  
  for (const village of villages) {
    const distance = calculateDistance(
      clinicToRemove.lat,
      clinicToRemove.lng,
      village.lat,
      village.lng
    );
    
    if (distance <= coverageRadius) {
      // Check if this village would still be covered by remaining clinics
      const stillCovered = remainingClinics.some(clinic => {
        const distToOtherClinic = calculateDistance(
          village.lat,
          village.lng,
          clinic.lat,
          clinic.lng
        );
        return distToOtherClinic <= coverageRadius;
      });
      
      if (!stillCovered) {
        villagesInRadius.push({ village, distance });
      }
    }
  }
  
  // Estimate population for each affected village by finding nearest population points
  const affectedVillagesWithPopulation = villagesInRadius.map(({ village, distance }) => {
    // Find population points near this village (within 2km)
    let villagePopulation = 0;
    for (const point of populationPoints) {
      const distToPoint = calculateDistance(village.lat, village.lng, point.lat, point.lng);
      if (distToPoint <= 2) {
        // Weight population by distance (closer = more weight)
        const weight = 1 - (distToPoint / 2);
        villagePopulation += point.population * weight;
      }
    }
    
    // If no nearby population points, estimate based on average village size
    // Average village in Malawi has ~500-1000 people
    if (villagePopulation === 0) {
      villagePopulation = 750; // Default estimate
    }
    
    return {
      village,
      distance,
      population: Math.round(villagePopulation),
    };
  });
  
  const totalAffectedPopulation = affectedVillagesWithPopulation.reduce(
    (sum, item) => sum + item.population,
    0
  );
  
  return {
    affectedVillages: affectedVillagesWithPopulation,
    totalAffectedPopulation,
    affectedVillageCount: affectedVillagesWithPopulation.length,
  };
}

/**
 * Recommend 5 GAIA MHC locations based on villages within coverage area
 * Prioritizes locations that cover the most affected villages
 */
export function recommendGAIAHCLocations(
  removedClinic: Clinic,
  allClinics: Clinic[],
  villages: Village[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  coverageRadius: number = 5,
  numRecommendations: number = 5
): GAIARecommendation[] {
  // Get impact analysis to find affected villages
  const impact = calculateRemovalImpact(
    removedClinic,
    allClinics,
    villages,
    populationPoints,
    coverageRadius
  );
  
  // Use affected villages as candidate locations
  const candidateVillages = impact.affectedVillages.map(item => item.village);
  
  // If not enough affected villages, also consider nearby villages
  if (candidateVillages.length < numRecommendations) {
    const nearbyVillages = villages
      .filter(village => {
        const distance = calculateDistance(
          removedClinic.lat,
          removedClinic.lng,
          village.lat,
          village.lng
        );
        return distance <= coverageRadius * 2 && !candidateVillages.some(cv => cv.name === village.name);
      })
      .slice(0, numRecommendations - candidateVillages.length);
    
    candidateVillages.push(...nearbyVillages);
  }
  
  // Score each candidate location
  const scoredCandidates: GAIARecommendation[] = candidateVillages.map(candidateVillage => {
    // Find villages covered by this location
    const villagesCovered: Village[] = [];
    let totalPopulationCovered = 0;
    
    for (const village of villages) {
      const distance = calculateDistance(
        candidateVillage.lat,
        candidateVillage.lng,
        village.lat,
        village.lng
      );
      
      if (distance <= coverageRadius) {
        villagesCovered.push(village);
        
        // Estimate population for this village
        let villagePopulation = 0;
        for (const point of populationPoints) {
          const distToPoint = calculateDistance(village.lat, village.lng, point.lat, point.lng);
          if (distToPoint <= 2) {
            const weight = 1 - (distToPoint / 2);
            villagePopulation += point.population * weight;
          }
        }
        if (villagePopulation === 0) {
          villagePopulation = 750; // Default estimate
        }
        totalPopulationCovered += villagePopulation;
      }
    }
    
    // Calculate score based on:
    // - Number of villages covered
    // - Total population covered
    // - Whether it covers affected villages (priority)
    const affectedVillagesCovered = villagesCovered.filter(v =>
      impact.affectedVillages.some(av => av.village.name === v.name)
    ).length;
    
    const score = (
      (villagesCovered.length / 10) * 0.3 + // Normalize to max 10 villages
      (totalPopulationCovered / 10000) * 0.4 + // Normalize to max 10k population
      (affectedVillagesCovered / impact.affectedVillageCount) * 0.3 // Priority for affected villages
    );
    
    return {
      lat: candidateVillage.lat,
      lng: candidateVillage.lng,
      villageName: candidateVillage.name,
      villagesCovered,
      totalPopulationCovered: Math.round(totalPopulationCovered),
      score: Math.min(score, 1), // Cap at 1
    };
  });
  
  // Sort by score and filter out overlapping recommendations
  const sortedCandidates = scoredCandidates.sort((a, b) => b.score - a.score);
  
  const finalRecommendations: GAIARecommendation[] = [];
  for (const candidate of sortedCandidates) {
    const isTooClose = finalRecommendations.some(existing => {
      const dist = calculateDistance(
        candidate.lat,
        candidate.lng,
        existing.lat,
        existing.lng
      );
      return dist < coverageRadius * 1.5; // Minimum 7.5km apart
    });
    
    if (!isTooClose) {
      finalRecommendations.push(candidate);
      if (finalRecommendations.length >= numRecommendations) {
        break;
      }
    }
  }
  
  return finalRecommendations;
}

