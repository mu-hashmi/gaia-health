import { calculateDistance } from './coverage';

export interface Pharmacy {
  longitude: number;
  latitude: number;
  name: string;
  amenity: string;
}

const COVERAGE_RADIUS_KM = 5;

export async function loadPharmacyData(): Promise<Pharmacy[]> {
  try {
    const response = await fetch('/data/malawi pharmacy data - malawi healthsites.csv');
    const text = await response.text();

    const lines = text.split('\n');
    const pharmacies: Pharmacy[] = [];

    // Parse CSV (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing
      const values = line.split(',');
      if (values.length < 6) continue;

      const longitude = parseFloat(values[0]);
      const latitude = parseFloat(values[1]);
      const amenity = values[5]?.trim() || '';
      const name = values[7]?.trim() || 'Unknown';

      // Only include pharmacies and drugstores
      if ((amenity === 'pharmacy' || amenity === 'drugstore') && longitude && latitude) {
        if (!isNaN(longitude) && !isNaN(latitude)) {
          pharmacies.push({ longitude, latitude, name, amenity });
        }
      }
    }

    return pharmacies;
  } catch (error) {
    console.error('Error loading pharmacy data:', error);
    return [];
  }
}

export function isMedicalDesert(
  clinicLat: number,
  clinicLng: number,
  pharmacies: Pharmacy[]
): boolean {
  // Check if any pharmacy exists within 5km
  for (const pharmacy of pharmacies) {
    const distance = calculateDistance(
      clinicLat,
      clinicLng,
      pharmacy.latitude,
      pharmacy.longitude
    );

    if (distance <= COVERAGE_RADIUS_KM) {
      return false; // Not a desert - pharmacy exists nearby
    }
  }

  return true; // Is a desert - no pharmacy within 5km
}

export function getPharmaciesNearby(
  clinicLat: number,
  clinicLng: number,
  pharmacies: Pharmacy[]
): Pharmacy[] {
  return pharmacies.filter(pharmacy => {
    const distance = calculateDistance(
      clinicLat,
      clinicLng,
      pharmacy.latitude,
      pharmacy.longitude
    );
    return distance <= COVERAGE_RADIUS_KM;
  });
}
