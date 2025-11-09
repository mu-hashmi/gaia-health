import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Cache for 24 hours (86400 seconds)
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sampleFactor = parseInt(searchParams.get('sampleFactor') || '5', 10);
    
    // If using default sampleFactor (5), try to load from pre-processed static file first
    if (sampleFactor === 5) {
      const staticPath = join(process.cwd(), 'public', 'data', 'population.json');
      try {
        const staticData = await readFile(staticPath, 'utf-8');
        const points = JSON.parse(staticData);
        
        return NextResponse.json(points, {
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
          },
        });
      } catch (staticError) {
        // Fallback to processing from source files
        console.log('Static file not found, processing from source...');
      }
    }
    
    // Process from GeoTIFF (either custom sampleFactor or fallback)
    const filePath = join(process.cwd(), 'app', 'data', 'mwi_ppp_2020_UNadj_constrained.tif');
    
    // Parse GeoTIFF using fromFile (designed for Node.js file system)
    const { fromFile } = await import('geotiff');
    const tiff = await fromFile(filePath);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    
    const populationData = rasters[0] as Float32Array | Uint8Array;
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();
    
    const pixelWidth = (bbox[2] - bbox[0]) / width;
    const pixelHeight = (bbox[3] - bbox[1]) / height;
    
    const points: Array<{ lat: number; lng: number; population: number }> = [];
    
    // Malawi bounds: approximately -17.1 to -9.4 latitude, 32.7 to 35.9 longitude
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
        
        // Filter to Malawi bounds
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          // Scale population by sampleFactor^2 to account for skipped pixels
          // Each sampled pixel represents sampleFactor^2 pixels in the original data
          // This ensures accurate total population calculation even when sampling
          const scaledPopulation = Math.round((population as number) * sampleFactor * sampleFactor);
          
          points.push({
            lat,
            lng,
            population: scaledPopulation,
          });
        }
      }
    }
    
    return NextResponse.json(points, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error loading population density:', error);
    return NextResponse.json({ error: 'Failed to load population density' }, { status: 500 });
  }
}

