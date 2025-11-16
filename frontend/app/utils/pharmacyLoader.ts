import { readFile } from 'fs/promises';
import { join } from 'path';
import { calculateDistance } from './coverage';

export interface Pharmacy {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Load and clean pharmacy data from CSV file (server-side)
 */
export async function loadPharmacies(): Promise<Pharmacy[]> {
  try {
    const csvPath = join(process.cwd(), 'app', 'data', 'malawi pharmacy data - malawi healthsites.csv');
    const csvContent = await readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    // Find column indices
    const lngIndex = headers.indexOf('Longitude');
    const latIndex = headers.indexOf('Lattitude'); // Note: typo in CSV
    const nameIndex = headers.indexOf('name');
    const amenityIndex = headers.indexOf('amenity');
    const uuidIndex = headers.indexOf('uuid');
    
    const pharmacies: Pharmacy[] = [];
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handling quoted fields)
      const values = parseCSVLine(line);
      
      // Check if we have enough columns
      const maxIndex = Math.max(lngIndex, latIndex, nameIndex, amenityIndex, uuidIndex);
      if (values.length <= maxIndex) {
        continue;
      }
      
      const lngStr = (values[lngIndex] || '').trim();
      const latStr = (values[latIndex] || '').trim();
      const amenity = (values[amenityIndex] || '').trim().toLowerCase();
      const name = (values[nameIndex] || '').trim();
      const uuid = (values[uuidIndex] || '').trim();
      
      // Skip if longitude or latitude is empty
      if (!lngStr || !latStr) {
        continue;
      }
      
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);
      
      // Only include pharmacies (filter by amenity type) with valid coordinates
      if (amenity === 'pharmacy' && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        pharmacies.push({
          id: uuid || `pharmacy-${i}`,
          name: name || 'Unnamed Pharmacy',
          lat,
          lng,
        });
      }
    }
    
    return pharmacies;
  } catch (error) {
    console.error('Error loading pharmacy data:', error);
    return [];
  }
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  values.push(current.trim());
  
  return values;
}

/**
 * Check if there are any pharmacies within the specified radius (in km)
 * Returns true if no pharmacies found within radius (medical desert)
 */
export function isMedicalDesert(
  clinicLat: number,
  clinicLng: number,
  pharmacies: Pharmacy[],
  radiusKm: number = 5
): boolean {
  if (pharmacies.length === 0) {
    return false;
  }

  const nearbyPharmacies = pharmacies.filter(pharmacy => {
    const distance = calculateDistance(
      clinicLat,
      clinicLng,
      pharmacy.lat,
      pharmacy.lng
    );
    return distance <= radiusKm;
  });

  return nearbyPharmacies.length === 0;
}

/**
 * Get pharmacies within the specified radius
 */
export function getNearbyPharmacies(
  clinicLat: number,
  clinicLng: number,
  pharmacies: Pharmacy[],
  radiusKm: number = 5
): Pharmacy[] {
  return pharmacies.filter(pharmacy => {
    const distance = calculateDistance(
      clinicLat,
      clinicLng,
      pharmacy.lat,
      pharmacy.lng
    );
    return distance <= radiusKm;
  });
}

