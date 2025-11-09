import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'app', 'data', 'Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).geojson');
    const geojson = await readFile(filePath, 'utf-8');
    const data = JSON.parse(geojson);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading district boundaries:', error);
    return NextResponse.json({ error: 'Failed to load district boundaries' }, { status: 500 });
  }
}

