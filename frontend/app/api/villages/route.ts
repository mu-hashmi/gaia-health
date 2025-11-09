import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to load from pre-processed static file first
    const staticPath = join(process.cwd(), 'public', 'data', 'villages.json');
    try {
      const villagesData = await readFile(staticPath, 'utf-8');
      const villages = JSON.parse(villagesData);
      
      return NextResponse.json(villages, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      });
    } catch (staticError) {
      // Fallback to processing from source GeoJSON file
      console.log('Static file not found, processing from source...');
      const filePath = join(process.cwd(), 'app', 'data', 'villages.geojson');
      const geojson = await readFile(filePath, 'utf-8');
      const data = JSON.parse(geojson);
      
      // Convert GeoJSON to simplified format: [lng, lat] -> {lat, lng, name}
      const villages = data.features.map((feature: any) => ({
        lat: feature.geometry.coordinates[1], // GeoJSON uses [lng, lat]
        lng: feature.geometry.coordinates[0],
        name: feature.properties.name || 'Unnamed Village',
      }));
      
      return NextResponse.json(villages, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      });
    }
  } catch (error) {
    console.error('Error loading villages:', error);
    return NextResponse.json({ error: 'Failed to load villages' }, { status: 500 });
  }
}

