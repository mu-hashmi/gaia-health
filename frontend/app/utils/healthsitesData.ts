/**
 * Utility module for working with Malawi healthsites data
 * Loads and manages the processed healthsites dataset for LLM calls
 */

export interface FacilityLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  address?: string;
  postcode?: string;
}

export interface FacilityDetails {
  operator?: string;
  operator_type?: string;
  operational_status?: string;
  opening_hours?: string;
  beds?: number;
  staff_doctors?: number;
  staff_nurses?: number;
  specialities: string[];
}

export interface FacilityServices {
  dispensing?: string;
  emergency?: string;
  wheelchair?: string;
  insurance?: string;
}

export interface FacilityInfrastructure {
  water_source?: string;
  electricity?: string;
}

export interface FacilityMetadata {
  completeness: number;
  osm_id: string;
  last_updated?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  location: FacilityLocation;
  details: FacilityDetails;
  services: FacilityServices;
  infrastructure: FacilityInfrastructure;
  metadata: FacilityMetadata;
}

export interface HealthsitesDataset {
  summary: {
    total_facilities: number;
    facility_types: Record<string, number>;
    by_location: Record<string, number>;
    data_quality: {
      with_coordinates: number;
      with_name: number;
      with_operator: number;
    };
  };
  sample_facilities: Facility[];
}

let cachedData: HealthsitesDataset | null = null;

/**
 * Load healthsites data (cached after first load)
 */
export async function loadHealthsitesData(): Promise<HealthsitesDataset> {
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch('/data/healthsites_llm.json');
    if (!response.ok) {
      throw new Error(`Failed to load healthsites data: ${response.statusText}`);
    }
    cachedData = await response.json();
    return cachedData as HealthsitesDataset;
  } catch (error) {
    console.error('Error loading healthsites data:', error);
    throw error;
  }
}

/**
 * Get formatted text description of facilities for LLM context
 */
export async function getFormattedFacilityContext(): Promise<string> {
  const data = await loadHealthsitesData();

  let context = `# Malawi Healthcare Facilities Dataset\n\n`;
  context += `## Summary\n`;
  context += `- Total Facilities: ${data.summary.total_facilities}\n`;
  context += `- Facilities with coordinates: ${data.summary.data_quality.with_coordinates}\n`;
  context += `- Facilities with names: ${data.summary.data_quality.with_name}\n`;
  context += `- Facilities with operators: ${data.summary.data_quality.with_operator}\n\n`;

  context += `## Facility Types\n`;
  for (const [type, count] of Object.entries(data.summary.facility_types)) {
    context += `- ${type}: ${count}\n`;
  }

  context += `\n## Sample Facilities\n`;
  data.sample_facilities.slice(0, 10).forEach((facility, idx) => {
    context += `\n### Facility ${idx + 1}: ${facility.name}\n`;
    context += `- Type: ${facility.type}\n`;
    if (facility.location.city) context += `- City: ${facility.location.city}\n`;
    if (facility.location.latitude) {
      context += `- Coordinates: ${facility.location.latitude}, ${facility.location.longitude}\n`;
    }
    if (facility.details.operator) context += `- Operator: ${facility.details.operator}\n`;
    if (facility.details.opening_hours) context += `- Hours: ${facility.details.opening_hours}\n`;
    if (facility.details.beds) context += `- Beds: ${facility.details.beds}\n`;
  });

  return context;
}

/**
 * Get all facilities of a specific type
 */
export async function getFacilitiesByType(type: string): Promise<Facility[]> {
  const data = await loadHealthsitesData();
  return data.sample_facilities.filter(f => f.type.toLowerCase() === type.toLowerCase());
}

/**
 * Get facilities with coordinates for mapping
 */
export async function getFacilitiesWithCoordinates(): Promise<Facility[]> {
  const data = await loadHealthsitesData();
  return data.sample_facilities.filter(f => f.location.latitude && f.location.longitude);
}

/**
 * Get the raw dataset
 */
export async function getRawDataset(): Promise<HealthsitesDataset> {
  return loadHealthsitesData();
}
