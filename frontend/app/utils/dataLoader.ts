import { Clinic } from '../types';
import Papa from 'papaparse';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface PopulationPoint {
  lat: number;
  lng: number;
  population: number;
}

/**
 * Parse GAIA clinic stops CSV
 * Format: type_of_facility,clinic_name,clinic_stop,collect_gps_coordinates
 * GPS coordinates format: "lat lng elevation accuracy"
 */
export async function loadGAIAClinics(): Promise<Clinic[]> {
  const filePath = join(process.cwd(), 'app', 'data', 'GAIA MHC Clinic Stops GPS.xlsx - Clinic stops GPS.csv');
  const text = await readFile(filePath, 'utf-8');
  
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
  });

  const clinics: Clinic[] = [];
  
  // Skip header row
  for (let i = 1; i < result.data.length; i++) {
    const row = result.data[i];
    if (row.length < 4) continue;
    
    const [typeOfFacility, clinicName, clinicStop, gpsCoords] = row;
    
    // Parse GPS coordinates: "lat lng elevation accuracy"
    const coords = gpsCoords.trim().split(/\s+/);
    if (coords.length < 2) continue;
    
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    clinics.push({
      id: `gaia-${i}`,
      name: `${clinicName} - ${clinicStop}`,
      type: 'gaia',
      lat,
      lng,
    });
  }
  
  return clinics;
}

/**
 * Parse MHFR facilities CSV
 * Filter: Only functional facilities with valid coordinates in Malawi
 */
export async function loadMHFRClinics(): Promise<Clinic[]> {
  const filePath = join(process.cwd(), 'app', 'data', 'MHFR_Facilities.xlsx - Facilities.csv');
  const text = await readFile(filePath, 'utf-8');
  
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const clinics: Clinic[] = [];
  
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    
    // Filter: Must be functional
    if (row.STATUS?.toLowerCase() !== 'functional') continue;
    
    // Filter: Must have valid coordinates
    const latStr = row.LATITUDE?.trim().replace(/\s+/g, ''); // Remove any spaces
    const lngStr = row.LONGITUDE?.trim().replace(/\s+/g, ''); // Remove any spaces
    
    if (!latStr || !lngStr || latStr === '' || lngStr === '') continue;
    
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    // Validate coordinate ranges for Malawi
    if (lat < -17 || lat > -9 || lng < 32 || lng > 36) continue;
    
    // Determine clinic type based on TYPE and OWNERSHIP
    const facilityType = row.TYPE?.trim() || '';
    const ownership = row.OWNERSHIP?.toLowerCase() || '';
    
    let type: Clinic['type'];
    
    // Check if it's a Health Centre first
    if (facilityType.toLowerCase() === 'health centre') {
      type = 'healthcentre';
    } else if (ownership.includes('government')) {
      type = 'govt';
    } else {
      // All other types (private, mission-based, etc.) go to 'other'
      type = 'other';
    }
    
    clinics.push({
      id: `mhfr-${row.CODE || i}`,
      name: row['COMMON NAME'] || row.NAME || `Facility ${i}`,
      type,
      lat,
      lng,
      district: row.DISTRICT?.trim() || undefined,
    });
  }
  
  return clinics;
}

/**
 * Load all clinics (GAIA + MHFR)
 */
export async function loadAllClinics(): Promise<Clinic[]> {
  const [gaiaClinics, mhfrClinics] = await Promise.all([
    loadGAIAClinics(),
    loadMHFRClinics(),
  ]);
  
  return [...gaiaClinics, ...mhfrClinics];
}

