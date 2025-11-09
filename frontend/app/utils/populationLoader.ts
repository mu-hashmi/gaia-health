import { fromArrayBuffer } from 'geotiff';
import { PopulationPoint } from './dataLoader';

/**
 * Load and parse GeoTIFF population density file
 * Samples the data at a reasonable resolution for visualization
 */
export async function loadPopulationDensity(
  sampleFactor: number = 10 // Sample every Nth pixel for performance
): Promise<PopulationPoint[]> {
  try {
    const response = await fetch('/app/data/mwi_ppp_2020_UNadj_constrained.tif');
    const arrayBuffer = await response.arrayBuffer();
    
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    
    // Get the first band (population density)
    const populationData = rasters[0] as Float32Array | Uint8Array;
    
    // Get image dimensions and geotransform
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();
    
    // Calculate pixel size in degrees
    const pixelWidth = (bbox[2] - bbox[0]) / width;
    const pixelHeight = (bbox[3] - bbox[1]) / height;
    
    const points: PopulationPoint[] = [];
    
    // Sample the data at specified intervals
    for (let y = 0; y < height; y += sampleFactor) {
      for (let x = 0; x < width; x += sampleFactor) {
        const index = y * width + x;
        const population = populationData[index];
        
        // Skip NoData values (typically 0 or NaN)
        if (!population || isNaN(population) || population <= 0) continue;
        
        // Calculate lat/lng from pixel coordinates
        // Note: GeoTIFF bbox is [minX, minY, maxX, maxY] = [lngMin, latMin, lngMax, latMax]
        const lng = bbox[0] + (x + 0.5) * pixelWidth;
        const lat = bbox[3] - (y + 0.5) * pixelHeight; // Y is inverted in image coordinates
        
        // Filter to Malawi bounds
        // Malawi: approximately -17.1 to -9.4 latitude, 32.7 to 35.9 longitude
        if (lat >= -17.2 && lat <= -9.3 && lng >= 32.6 && lng <= 36.0) {
          points.push({
            lat,
            lng,
            population: Math.round(population),
          });
        }
      }
    }
    
    return points;
  } catch (error) {
    console.error('Error loading population density:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Load population density with optimized sampling for better performance
 * Uses adaptive sampling based on zoom level or area of interest
 */
export async function loadPopulationDensityOptimized(
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  sampleFactor: number = 5
): Promise<PopulationPoint[]> {
  try {
    const response = await fetch('/app/data/mwi_ppp_2020_UNadj_constrained.tif');
    const arrayBuffer = await response.arrayBuffer();
    
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    
    const populationData = rasters[0] as Float32Array | Uint8Array;
    const width = image.getWidth();
    const height = image.getHeight();
    const bbox = image.getBoundingBox();
    
    const pixelWidth = (bbox[2] - bbox[0]) / width;
    const pixelHeight = (bbox[3] - bbox[1]) / height;
    
    const points: PopulationPoint[] = [];
    
    // If bounds provided, only process pixels within bounds
    const minX = bounds ? Math.max(0, Math.floor((bounds.minLng - bbox[0]) / pixelWidth)) : 0;
    const maxX = bounds ? Math.min(width, Math.ceil((bounds.maxLng - bbox[0]) / pixelWidth)) : width;
    const minY = bounds ? Math.max(0, Math.floor((bbox[3] - bounds.maxLat) / pixelHeight)) : 0;
    const maxY = bounds ? Math.min(height, Math.ceil((bbox[3] - bounds.minLat) / pixelHeight)) : height;
    
    for (let y = minY; y < maxY; y += sampleFactor) {
      for (let x = minX; x < maxX; x += sampleFactor) {
        const index = y * width + x;
        const population = populationData[index];
        
        if (!population || isNaN(population) || population <= 0) continue;
        
        const lng = bbox[0] + (x + 0.5) * pixelWidth;
        const lat = bbox[3] - (y + 0.5) * pixelHeight;
        
        // Apply bounds filter if provided
        if (bounds) {
          if (lat < bounds.minLat || lat > bounds.maxLat || 
              lng < bounds.minLng || lng > bounds.maxLng) {
            continue;
          }
        } else {
          // Default to Malawi bounds
          if (lat < -17.2 || lat > -9.3 || lng < 32.6 || lng > 36.0) {
            continue;
          }
        }
        
        points.push({
          lat,
          lng,
          population: Math.round(population),
        });
      }
    }
    
    return points;
  } catch (error) {
    console.error('Error loading population density:', error);
    return [];
  }
}

