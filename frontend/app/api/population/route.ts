import { NextResponse } from 'next/server';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sampleFactor = parseInt(searchParams.get('sampleFactor') || '5', 10);
    
    // Read the GeoTIFF file from the file system
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
    
    // Focus on Malawi area of interest (Mulanje, Phalombe, Mangochi districts)
    const minLat = -16.5;
    const maxLat = -14.0;
    const minLng = 34.5;
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
          points.push({
            lat,
            lng,
            population: Math.round(population as number),
          });
        }
      }
    }
    
    return NextResponse.json(points);
  } catch (error) {
    console.error('Error loading population density:', error);
    return NextResponse.json({ error: 'Failed to load population density' }, { status: 500 });
  }
}

