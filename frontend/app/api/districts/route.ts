import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadDistricts } from '../../utils/districtLoader';

// Cache for 24 hours (86400 seconds)
export const revalidate = 86400;

export async function GET() {
  try {
    // Try to load from pre-processed static file first
    const staticPath = join(process.cwd(), 'public', 'data', 'districts.json');
    try {
      const staticData = await readFile(staticPath, 'utf-8');
      const districts = JSON.parse(staticData);
      
      return NextResponse.json(districts, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      });
    } catch (staticError) {
      // Fallback to processing from source files
      console.log('Static file not found, processing from source...');
      const districts = await loadDistricts();
      
      return NextResponse.json(districts, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      });
    }
  } catch (error) {
    console.error('Error loading districts:', error);
    return NextResponse.json({ error: 'Failed to load districts' }, { status: 500 });
  }
}

