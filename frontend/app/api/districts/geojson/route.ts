import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

// Cache for 24 hours (86400 seconds)
export const revalidate = 86400;

export async function GET() {
  try {
    // Try to load from pre-processed static file first
    const staticPath = join(process.cwd(), 'public', 'data', 'boundaries.geojson');
    try {
      const geojson = await readFile(staticPath, 'utf-8');
      const data = JSON.parse(geojson);
      
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      });
    } catch (staticError) {
      // Fallback to processing from source files
      console.log('Static file not found, processing from source...');
      const filePath = join(process.cwd(), 'app', 'data', 'Malawi_DIVA_GIS_State_L1_Admin_Boundaries_(1%3A10%2C000%2C000).geojson');
      const geojson = await readFile(filePath, 'utf-8');
      const data = JSON.parse(geojson);
      
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      });
    }
  } catch (error) {
    console.error('Error loading district GeoJSON:', error);
    return NextResponse.json({ error: 'Failed to load district boundaries' }, { status: 500 });
  }
}

