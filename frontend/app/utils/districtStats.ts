import { Clinic } from '../types';
import { calculateCoverage, calculateDistance } from './coverage';
import type { GeoJsonObject, Feature, Polygon, MultiPolygon } from 'geojson';

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
    healthcentre: Clinic[];
    other: Clinic[];
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
    healthcentre: number;
    other: number;
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
    healthcentre: districtClinics.filter(c => c.type === 'healthcentre'),
    other: districtClinics.filter(c => c.type === 'other'),
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
    healthcentre: calculateUniqueCoverageByType('healthcentre'),
    other: calculateUniqueCoverageByType('other'),
  };

  return {
    districtName,
    clinics: districtClinics,
    clinicsByType,
    coverage,
    coverageByType,
  };
}

// Point-in-polygon check using ray casting algorithm
// GeoJSON coordinates are [lng, lat] (longitude first)
function pointInPolygon(lat: number, lng: number, polygon: number[][][]): boolean {
  let inside = false;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; // [lng, lat]
      const [xj, yj] = ring[j]; // [lng, lat]
      const intersect = ((yi > lat) !== (yj > lat)) && 
                        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }
  return inside;
}

// Check if point is in any polygon of a GeoJSON feature
function pointInFeature(lat: number, lng: number, feature: Feature): boolean {
  const geometry = feature.geometry;
  
  if (geometry.type === 'Polygon') {
    return pointInPolygon(lat, lng, geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(polygon => pointInPolygon(lat, lng, polygon));
  }
  
  return false;
}

/**
 * Filter population points by district names using GeoJSON boundaries
 */
export function filterPopulationByDistricts(
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  districtNames: string[],
  geoJsonData: GeoJsonObject | null
): Array<{ lat: number; lng: number; population: number }> {
  if (!geoJsonData || districtNames.length === 0) {
    return [];
  }

  const features = (geoJsonData as any).features as Feature[] | undefined;
  if (!features) {
    return [];
  }

  // Find features matching the district names
  const matchingFeatures = features.filter(feature => {
    const districtName = feature.properties?.NAME_1;
    return districtName && districtNames.includes(districtName);
  });

  if (matchingFeatures.length === 0) {
    return [];
  }

  // Filter population points that are within any of the matching districts
  return populationPoints.filter(point => {
    return matchingFeatures.some(feature => 
      pointInFeature(point.lat, point.lng, feature)
    );
  });
}

/**
 * Filter clinics by district names, using district field if available, otherwise checking location
 */
function filterClinicsByDistricts(
  clinics: Clinic[],
  districtNames: string[],
  geoJsonData: GeoJsonObject | null
): Clinic[] {
  if (!geoJsonData) {
    // Fallback: use district field if available
    return clinics.filter(c => c.district && districtNames.includes(c.district));
  }

  const features = (geoJsonData as any).features as Feature[] | undefined;
  if (!features) {
    return clinics.filter(c => c.district && districtNames.includes(c.district));
  }

  // Find features matching the district names
  const matchingFeatures = features.filter(feature => {
    const districtName = feature.properties?.NAME_1;
    return districtName && districtNames.includes(districtName);
  });

  if (matchingFeatures.length === 0) {
    return clinics.filter(c => c.district && districtNames.includes(c.district));
  }

  // Filter clinics: include if district field matches OR if location is within district boundaries
  return clinics.filter(clinic => {
    // First check if district field matches
    if (clinic.district && districtNames.includes(clinic.district)) {
      return true;
    }
    // Otherwise, check if clinic location is within any of the district boundaries
    return matchingFeatures.some(feature => 
      pointInFeature(clinic.lat, clinic.lng, feature)
    );
  });
}

/**
 * Calculate coverage statistics for multiple districts combined
 */
export function calculateMultiDistrictCoverage(
  districtNames: string[],
  clinics: Clinic[],
  populationPoints: Array<{ lat: number; lng: number; population: number }>,
  geoJsonData: GeoJsonObject | null
) {
  // Filter clinics in the specified districts (using district field or location check)
  const districtClinics = filterClinicsByDistricts(clinics, districtNames, geoJsonData);

  // Filter population points in the specified districts
  const districtPopulation = filterPopulationByDistricts(
    populationPoints,
    districtNames,
    geoJsonData
  );

  // Calculate coverage with all clinics
  const coverageWithAll = calculateCoverage(districtClinics, districtPopulation);

  // Calculate coverage without GAIA clinics
  const clinicsWithoutGAIA = districtClinics.filter(c => c.type !== 'gaia');
  const coverageWithoutGAIA = calculateCoverage(clinicsWithoutGAIA, districtPopulation);

  return {
    districtNames,
    totalPopulation: coverageWithAll.totalPopulation,
    coverageWithAll,
    coverageWithoutGAIA,
    gaiaImpact: {
      peopleLosingAccess: coverageWithAll.coveredPopulation - coverageWithoutGAIA.coveredPopulation,
      coverageLoss: coverageWithAll.coveragePercentage - coverageWithoutGAIA.coveragePercentage,
    },
  };
}

