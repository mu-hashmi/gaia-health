'use client';

import type { Feature, FeatureCollection, GeoJsonObject, Geometry } from 'geojson';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';

interface DistrictBoundariesProps {
  selectedDistrict?: string;
}

export default function DistrictBoundaries({ selectedDistrict }: DistrictBoundariesProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    async function loadBoundaries() {
      try {
        const response = await fetch('/api/districts/boundaries');
        if (response.ok) {
          const data = await response.json();
          setGeoJsonData(data as GeoJsonObject);
        }
      } catch (error) {
        console.error('Error loading district boundaries:', error);
      }
    }

    loadBoundaries();
  }, []);

  if (!geoJsonData || geoJsonData.type !== 'FeatureCollection') {
    return null;
  }

  // Style function for districts
  const getStyle = (feature?: Feature<Geometry, { NAME_1?: string; [key: string]: unknown }>) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: '#e5e7eb',
        fillOpacity: 0.1,
        color: '#6b7280',
        weight: 1.5,
        opacity: 0.6,
      };
    }

    const districtName = feature.properties.NAME_1;
    const isSelected = selectedDistrict && districtName === selectedDistrict;

    return {
      fillColor: isSelected ? '#3b82f6' : '#e5e7eb',
      fillOpacity: isSelected ? 0.3 : 0.1,
      color: isSelected ? '#2563eb' : '#6b7280',
      weight: isSelected ? 3 : 1.5,
      opacity: isSelected ? 1 : 0.6,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, { NAME_1?: string; [key: string]: unknown }>, layer: L.Layer) => {
    const districtName = feature.properties?.NAME_1 || 'Unknown';
    
    layer.bindTooltip(districtName, {
      permanent: false,
      direction: 'center',
      className: 'district-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          fillOpacity: 0.4,
          weight: 2.5,
        });
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        const isSelected = selectedDistrict && feature.properties?.NAME_1 === selectedDistrict;
        targetLayer.setStyle({
          fillOpacity: isSelected ? 0.3 : 0.1,
          weight: isSelected ? 3 : 1.5,
        });
      },
    });
  };

  // Filter features for mask layer
  const getMaskFeatures = (): Feature<Geometry, { NAME_1?: string; _isMask?: boolean; [key: string]: unknown }>[] => {
    if (!selectedDistrict || geoJsonData.type !== 'FeatureCollection') {
      return [];
    }

    const featureCollection = geoJsonData as FeatureCollection<Geometry, { NAME_1?: string; [key: string]: unknown }>;
    return featureCollection.features
      .filter((f) => f.properties && f.properties.NAME_1 !== selectedDistrict)
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          _isMask: true,
        },
      }));
  };

  return (
    <>
      {/* Render all district boundaries */}
      <GeoJSON
        data={geoJsonData}
        style={getStyle}
        onEachFeature={onEachFeature}
      />
      
      {/* Darken non-selected areas using a semi-transparent overlay */}
      {selectedDistrict && geoJsonData.type === 'FeatureCollection' && (
        <GeoJSON
          data={{
            type: 'FeatureCollection',
            features: getMaskFeatures(),
          } as FeatureCollection<Geometry, { NAME_1?: string; _isMask?: boolean; [key: string]: unknown }>}
          style={{
            fillColor: '#000000',
            fillOpacity: 0.3,
            color: 'transparent',
            weight: 0,
          }}
        />
      )}
    </>
  );
}
