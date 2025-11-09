#!/usr/bin/env tsx
/**
 * Pre-process data files into optimized JSON files for static serving
 * This script runs at build time to convert CSV, GeoJSON, and GeoTIFF files
 * into JSON files that can be served from the public folder
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import Papa from 'papaparse';
import { fromFile } from 'geotiff';

const DATA_DIR = join(process.cwd(), 'app', 'data');
const OUTPUT_DIR = join(process.cwd(), 'public', 'data');

interface Clinic {
  id: string;
  name: string;
  type: 'gaia' | 'govt' | 'healthcentre' | 'other';
  lat: number;
  lng: number;
  district?: string;
}

interface District {
  name: string;
  id: number;
  code?: string;
}

async function ensureOutputDir() {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function processClinics() {
  console.log('Processing clinics...');
  
  const gaiaPath = join(DATA_DIR, 'GAIA MHC Clinic Stops GPS.xlsx - Clinic stops GPS.csv');
  const mhfrPath = join(DATA_DIR, 'MHFR_Facilities.xlsx - Facilities.csv');
  
  const clinics: Clinic[] = [];
  
  // Process GAIA clinics
  try {
    const gaiaText = await readFile(gaiaPath, 'utf-8');
    const gaiaResult = Papa.parse<string[]>(gaiaText, {
      header: false,
      skipEmptyLines: true,
    });
    
    for (let i = 1; i < gaiaResult.data.length; i++) {
      const row = gaiaResult.data[i];
      if (row.length < 4) continue;
      
      const [typeOfFacility, clinicName, clinicStop, gpsCoords] = row;
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
  } catch (error) {
    console.error('Error processing GAIA clinics:', error);
  }
  
  // Process MHFR clinics
  try {
    const mhfrText = await readFile(mhfrPath, 'utf-8');
    const mhfrResult = Papa.parse<Record<string, string>>(mhfrText, {
      header: true,
      skipEmptyLines: true,
    });
    
    for (let i = 0; i < mhfrResult.data.length; i++) {
      const row = mhfrResult.data[i];
      
      if (row.STATUS?.toLowerCase() !== 'functional') continue;
      
      const latStr = row.LATITUDE?.trim().replace(/\s+/g, '');
      const lngStr = row.LONGITUDE?.trim().replace(/\s+/g, '');
      
      if (!latStr || !lngStr || latStr === '' || lngStr === '') continue;
      
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      
      if (isNaN(lat) || isNaN(lng)) continue;
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
  } catch (error) {
    console.error('Error processing MHFR clinics:', error);
  }
  
  await writeFile(
    join(OUTPUT_DIR, 'clinics.json'),
    JSON.stringify(clinics),
    'utf-8'
  );
  
  console.log(`✓ Processed ${clinics.length} clinics`);
}

async function processDistricts() {
  console.log('Processing districts...');
  
  const csvPath = join(DATA_DIR, 'Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).csv');
  const text = await readFile(csvPath, 'utf-8');
  
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  
  const districts: District[] = [];
  
  for (const row of result.data) {
    if (row.NAME_1) {
      districts.push({
        name: row.NAME_1,
        id: parseInt(row.ID_1) || 0,
        code: row.CC_1 || undefined,
      });
    }
  }
  
  await writeFile(
    join(OUTPUT_DIR, 'districts.json'),
    JSON.stringify(districts),
    'utf-8'
  );
  
  console.log(`✓ Processed ${districts.length} districts`);
}

async function processBoundaries() {
  console.log('Processing district boundaries...');
  
  const geojsonPath = join(DATA_DIR, 'Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).geojson');
  const geojson = await readFile(geojsonPath, 'utf-8');
  const data = JSON.parse(geojson);
  
  await writeFile(
    join(OUTPUT_DIR, 'boundaries.geojson'),
    JSON.stringify(data),
    'utf-8'
  );
  
  console.log('✓ Processed district boundaries');
}

async function processPopulation(sampleFactor: number = 5) {
  console.log(`Processing population data (sampleFactor=${sampleFactor})...`);
  
  const tiffPath = join(DATA_DIR, 'mwi_ppp_2020_UNadj_constrained.tif');
  
  try {
    const tiff = await fromFile(tiffPath);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    
    const populationData = rasters[0] as Float32Array | Uint8Array;
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();
    
    const pixelWidth = (bbox[2] - bbox[0]) / width;
    const pixelHeight = (bbox[3] - bbox[1]) / height;
    
    const points: Array<{ lat: number; lng: number; population: number }> = [];
    
    const minLat = -17.2;
    const maxLat = -9.3;
    const minLng = 32.6;
    const maxLng = 36.0;
    
    const minX = Math.max(0, Math.floor((minLng - bbox[0]) / pixelWidth));
    const maxX = Math.min(width, Math.ceil((maxLng - bbox[0]) / pixelWidth));
    const minY = Math.max(0, Math.floor((bbox[3] - maxLat) / pixelHeight));
    const maxY = Math.min(height, Math.ceil((bbox[3] - minLat) / pixelHeight));
    
    for (let y = minY; y < maxY; y += sampleFactor) {
      for (let x = minX; x < maxX; x += sampleFactor) {
        const index = y * width + x;
        const population = populationData[index];
        
        if (!population || isNaN(population as number) || (population as number) <= 0) continue;
        
        const lng = bbox[0] + (x + 0.5) * pixelWidth;
        const lat = bbox[3] - (y + 0.5) * pixelHeight;
        
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          const scaledPopulation = Math.round((population as number) * sampleFactor * sampleFactor);
          
          points.push({
            lat,
            lng,
            population: scaledPopulation,
          });
        }
      }
    }
    
    await writeFile(
      join(OUTPUT_DIR, 'population.json'),
      JSON.stringify(points),
      'utf-8'
    );
    
    console.log(`✓ Processed ${points.length} population points`);
  } catch (error) {
    console.error('Error processing population data:', error);
    throw error;
  }
}

async function main() {
  console.log('Starting data preprocessing...\n');
  
  await ensureOutputDir();
  
  try {
    await Promise.all([
      processClinics(),
      processDistricts(),
      processBoundaries(),
    ]);
    
    // Process population separately as it's the slowest
    await processPopulation(5);
    
    console.log('\n✓ All data preprocessing complete!');
  } catch (error) {
    console.error('\n✗ Error during preprocessing:', error);
    process.exit(1);
  }
}

main();

