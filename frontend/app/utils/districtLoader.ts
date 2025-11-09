import Papa from 'papaparse';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface District {
  name: string;
  id: number;
  code?: string;
}

/**
 * Load districts from DIVA CSV
 */
export async function loadDistricts(): Promise<District[]> {
  const filePath = join(process.cwd(), 'app', 'data', 'Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).csv');
  const text = await readFile(filePath, 'utf-8');
  
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
  
  return districts;
}

