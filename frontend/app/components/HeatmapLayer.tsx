'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
  enabled: boolean;
}

export default function HeatmapLayer({ populationPoints, enabled }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || populationPoints.length === 0) return;

    // Convert population points to heatmap format [lat, lng, intensity]
    // Intensity is normalized based on population (0-1 scale)
    const maxPopulation = Math.max(...populationPoints.map(p => p.population));
    if (maxPopulation === 0) return; // Avoid division by zero
    
    const heatmapData = populationPoints.map(point => [
      point.lat,
      point.lng,
      point.population / maxPopulation, // Normalize to 0-1
    ]) as [number, number, number][];

    // Create heatmap layer
    const heatLayer = (L as any).heatLayer(heatmapData, {
      radius: 25, // Size of each heat point
      blur: 15, // Blur radius
      maxZoom: 17,
      max: 1.0, // Maximum intensity
      gradient: {
        0.0: 'blue',      // Low density
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red',        // High density
      },
      minOpacity: 0.3,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, populationPoints, enabled]);

  return null;
}

