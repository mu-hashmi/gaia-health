import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadAllClinics } from '../../utils/dataLoader';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to load from pre-processed static file first
    const staticPath = join(process.cwd(), 'public', 'data', 'clinics.json');
    try {
      const staticData = await readFile(staticPath, 'utf-8');
      const clinics = JSON.parse(staticData);
      
      return NextResponse.json(clinics, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      });
    } catch (staticError) {
      // Fallback to processing from source files
      console.log('Static file not found, processing from source...');
      const clinics = await loadAllClinics();
      
      return NextResponse.json(clinics, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      });
    }
  } catch (error) {
    console.error('Error loading clinics:', error);
    return NextResponse.json({ error: 'Failed to load clinics' }, { status: 500 });
  }
}

