import { Clinic } from '../types';
import { calculateDistance } from './coverage';

interface PopulationPoint {
  lat: number;
  lng: number;
  population: number;
}

interface Cluster {
  centroid: { lat: number; lng: number };
  points: PopulationPoint[];
  totalPopulation: number;
}

export interface OptimalLocation {
  lat: number;
  lng: number;
  score: number;
  potentialPopulationServed: number;
  clusterName: string;
  distanceToNearestClinic: number;
  isValidLocation: boolean; // Confirms location is > clinicRadius km from other clinics
  validationMessage: string; // Explains validation status
}

/**
 * Simple K-means clustering algorithm
 * Clusters population points to identify population density centers
 */
export function kMeansClustering(
  points: PopulationPoint[],
  k: number = 5,
  maxIterations: number = 50
): Cluster[] {
  if (points.length === 0) return [];
  if (points.length <= k) {
    return points.map(p => ({
      centroid: { lat: p.lat, lng: p.lng },
      points: [p],
      totalPopulation: p.population,
    }));
  }

  // Initialize centroids by randomly selecting k points
  const centroids: Array<{ lat: number; lng: number }> = [];
  const selectedIndices = new Set<number>();

  while (centroids.length < k) {
    const randomIdx = Math.floor(Math.random() * points.length);
    if (!selectedIndices.has(randomIdx)) {
      selectedIndices.add(randomIdx);
      centroids.push({
        lat: points[randomIdx].lat,
        lng: points[randomIdx].lng,
      });
    }
  }

  let clusters: Cluster[] = [];

  // K-means iterations
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign points to nearest centroid
    clusters = centroids.map(centroid => ({
      centroid,
      points: [],
      totalPopulation: 0,
    }));

    for (const point of points) {
      let nearestClusterIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < centroids.length; i++) {
        const distance = calculateDistance(
          point.lat,
          point.lng,
          centroids[i].lat,
          centroids[i].lng
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestClusterIdx = i;
        }
      }

      clusters[nearestClusterIdx].points.push(point);
      clusters[nearestClusterIdx].totalPopulation += point.population;
    }

    // Update centroids
    let centroidsChanged = false;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].points.length === 0) continue;

      const avgLat =
        clusters[i].points.reduce((sum, p) => sum + p.lat, 0) /
        clusters[i].points.length;
      const avgLng =
        clusters[i].points.reduce((sum, p) => sum + p.lng, 0) /
        clusters[i].points.length;

      const distance = calculateDistance(
        avgLat,
        avgLng,
        centroids[i].lat,
        centroids[i].lng
      );

      if (distance > 0.001) {
        centroidsChanged = true;
        centroids[i] = { lat: avgLat, lng: avgLng };
      }
    }

    if (!centroidsChanged) break; // Convergence reached
  }

  return clusters.filter(c => c.points.length > 0);
}

/**
 * Check if a location is within the service radius of any clinic
 */
export function isWithinClinicRadius(
  lat: number,
  lng: number,
  clinics: Clinic[],
  radiusKm: number = 5
): boolean {
  return clinics.some(
    clinic => calculateDistance(lat, lng, clinic.lat, clinic.lng) <= radiusKm
  );
}

/**
 * Calculate population coverage score for a given location
 * Uses population density from nearby points
 */
export function calculatePopulationScore(
  lat: number,
  lng: number,
  populationPoints: PopulationPoint[],
  radiusKm: number = 5
): { score: number; populationServed: number } {
  let populationServed = 0;

  for (const point of populationPoints) {
    const distance = calculateDistance(lat, lng, point.lat, point.lng);
    if (distance <= radiusKm) {
      // Weight population by proximity (closer = higher weight)
      const weight = 1 - distance / radiusKm;
      populationServed += point.population * weight;
    }
  }

  return {
    score: populationServed,
    populationServed: Math.round(populationServed),
  };
}

/**
 * Find the optimal location for a new clinic using DB clustering
 * Returns the single best location considering:
 * - Highest population density
 * - HARD RULE: Must be more than clinicRadius km from ALL existing clinics
 * - Serves uncovered areas
 */
export function findOptimalClinicLocation(
  populationPoints: PopulationPoint[],
  clinics: Clinic[],
  clinicRadiusKm: number = 5,
  searchRadiusKm: number = 8
): OptimalLocation | null {
  if (populationPoints.length === 0) {
    return null;
  }

  // Perform K-means clustering to identify population centers
  const clusters = kMeansClustering(populationPoints, 5);

  // Sort clusters by population (descending)
  const sortedClusters = [...clusters].sort(
    (a, b) => b.totalPopulation - a.totalPopulation
  );

  let bestLocation: OptimalLocation | null = null;

  // Evaluate each cluster and find the best uncovered location
  for (let clusterIdx = 0; clusterIdx < sortedClusters.length; clusterIdx++) {
    const cluster = sortedClusters[clusterIdx];

    // HARD RULE: Skip if cluster centroid is NOT far enough from existing clinics
    const nearestClinic = findNearestClinic(
      cluster.centroid.lat,
      cluster.centroid.lng,
      clinics
    );

    // HARD RULE ENFORCEMENT: Must be strictly greater than clinicRadiusKm
    if (nearestClinic.distance <= clinicRadiusKm) {
      continue; // This location violates the hard rule, skip it entirely
    }

    // Calculate score for cluster centroid
    const { score: centroidScore, populationServed } =
      calculatePopulationScore(
        cluster.centroid.lat,
        cluster.centroid.lng,
        populationPoints,
        searchRadiusKm
      );

    // All locations reaching here are guaranteed to meet the hard rule
    const location: OptimalLocation = {
      lat: cluster.centroid.lat,
      lng: cluster.centroid.lng,
      score: centroidScore,
      potentialPopulationServed: populationServed,
      clusterName: `Cluster ${clusterIdx + 1}`,
      distanceToNearestClinic: nearestClinic.distance,
      isValidLocation: true, // HARD RULE: Only valid locations reach this point
      validationMessage: `Valid location: ${nearestClinic.distance.toFixed(2)}km from nearest clinic (minimum required: ${clinicRadiusKm}km)`,
    };

    if (!bestLocation || location.score > bestLocation.score) {
      bestLocation = location;
    }
  }

  // If no cluster centroid is suitable, search for best location among uncovered areas
  if (!bestLocation) {
    bestLocation = findBestUncoveredLocation(
      populationPoints,
      clinics,
      clinicRadiusKm,
      searchRadiusKm
    );
  }

  return bestLocation;
}

/**
 * Find the best location among points not covered by existing clinics
 * HARD RULE: All returned locations must be > clinicRadiusKm from ALL existing clinics
 */
function findBestUncoveredLocation(
  populationPoints: PopulationPoint[],
  clinics: Clinic[],
  clinicRadiusKm: number,
  searchRadiusKm: number
): OptimalLocation | null {
  let bestLocation: OptimalLocation | null = null;

  // Sample population points to find uncovered areas with high population
  const candidates = populationPoints.filter(
    point =>
      !isWithinClinicRadius(point.lat, point.lng, clinics, clinicRadiusKm)
  );

  if (candidates.length === 0) {
    return null;
  }

  // Sort by population (descending) and evaluate top candidates
  const topCandidates = [...candidates]
    .sort((a, b) => b.population - a.population)
    .slice(0, Math.min(50, candidates.length));

  for (const candidate of topCandidates) {
    const nearestClinic = findNearestClinic(
      candidate.lat,
      candidate.lng,
      clinics
    );

    // HARD RULE ENFORCEMENT: Must be strictly greater than clinicRadiusKm
    if (nearestClinic.distance <= clinicRadiusKm) {
      continue; // This location violates the hard rule, skip it entirely
    }

    const { score, populationServed } = calculatePopulationScore(
      candidate.lat,
      candidate.lng,
      populationPoints,
      searchRadiusKm
    );

    // All locations reaching here are guaranteed to meet the hard rule
    const location: OptimalLocation = {
      lat: candidate.lat,
      lng: candidate.lng,
      score,
      potentialPopulationServed: populationServed,
      clusterName: 'Uncovered Area',
      distanceToNearestClinic: nearestClinic.distance,
      isValidLocation: true, // HARD RULE: Only valid locations reach this point
      validationMessage: `Valid location: ${nearestClinic.distance.toFixed(2)}km from nearest clinic (minimum required: ${clinicRadiusKm}km)`,
    };

    if (!bestLocation || location.score > bestLocation.score) {
      bestLocation = location;
    }
  }

  return bestLocation;
}

/**
 * Find the nearest clinic to a given location
 */
function findNearestClinic(
  lat: number,
  lng: number,
  clinics: Clinic[]
): { distance: number; clinic: Clinic | null } {
  if (clinics.length === 0) {
    return { distance: Infinity, clinic: null };
  }

  let nearestDistance = Infinity;
  let nearestClinic: Clinic | null = null;

  for (const clinic of clinics) {
    const distance = calculateDistance(lat, lng, clinic.lat, clinic.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestClinic = clinic;
    }
  }

  return { distance: nearestDistance, clinic: nearestClinic };
}

/**
 * Generate a heatmap of population coverage gaps
 * Returns a grid of points showing areas with low clinic coverage
 * HARD RULE: Only shows areas NOT covered by existing clinics (> clinicRadiusKm distance)
 */
export function generateCoverageGapHeatmap(
  populationPoints: PopulationPoint[],
  clinics: Clinic[],
  clinicRadiusKm: number = 5,
  gridResolution: number = 0.05 // ~5.5 km grid
): Array<{ lat: number; lng: number; value: number }> {
  if (populationPoints.length === 0) return [];

  // Find bounds of population points
  let minLat = populationPoints[0].lat;
  let maxLat = populationPoints[0].lat;
  let minLng = populationPoints[0].lng;
  let maxLng = populationPoints[0].lng;

  for (const point of populationPoints) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const heatmapPoints: Array<{ lat: number; lng: number; value: number }> = [];

  // Create grid and calculate coverage gaps
  for (let lat = minLat; lat <= maxLat; lat += gridResolution) {
    for (let lng = minLng; lng <= maxLng; lng += gridResolution) {
      // HARD RULE: Only include areas NOT covered by existing clinics
      const isCovered = isWithinClinicRadius(lat, lng, clinics, clinicRadiusKm);

      if (!isCovered) {
        // Calculate population density in this area
        const { populationServed } = calculatePopulationScore(
          lat,
          lng,
          populationPoints,
          clinicRadiusKm
        );

        if (populationServed > 0) {
          heatmapPoints.push({
            lat,
            lng,
            value: populationServed,
          });
        }
      }
    }
  }

  return heatmapPoints;
}
