'use client';

import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import { Clinic } from '../types';
import { calculateDistrictStats } from '../utils/districtStats';

interface DistrictBoundariesProps {
  selectedDistrict?: string;
  clinics: Clinic[];
  populationPoints: Array<{ lat: number; lng: number; population: number }>;
}

export default function DistrictBoundaries({ 
  selectedDistrict,
  clinics,
  populationPoints,
}: DistrictBoundariesProps) {
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const hoverTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const popupRef = useRef<Map<string, L.Popup>>(new Map());
  const map = useMap();

  useEffect(() => {
    // Load GeoJSON data
    fetch('/api/districts/geojson')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load district boundaries: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => setGeoJsonData(data as GeoJsonObject))
      .catch(err => {
        console.error('Error loading district boundaries:', err);
        // Optionally set an error state or show a user-friendly message
      });
  }, []);

  if (!geoJsonData) {
    return null;
  }

  // Style function for districts
  const getDistrictStyle = (feature?: { properties?: { NAME_1?: string } }) => {
    const districtName = feature?.properties?.NAME_1;
    const isSelected = selectedDistrict === districtName;
    return {
      fillColor: isSelected ? '#3b82f6' : '#e5e7eb',
      fillOpacity: isSelected ? 0.3 : 0.1,
      color: isSelected ? '#2563eb' : '#6b7280',
      weight: isSelected ? 3 : 1.5,
      opacity: isSelected ? 0.8 : 0.6,
    };
  };

  // Handle district hover and click
  const handleEachFeature = (feature: { properties?: { NAME_1?: string }; geometry?: unknown }, layer: L.Layer) => {
    const districtName = feature?.properties?.NAME_1;
    if (!districtName) return;

    const pathLayer = layer as L.Path;

    layer.on({
      // Don't handle click - let it pass through to map click handler
      mouseover: () => {
        pathLayer.setStyle({
          fillOpacity: 0.4,
          weight: 2.5,
        });

        // Set up delayed popup after 1 second
        const timeoutId = setTimeout(() => {
          // Calculate stats once
          const stats = calculateDistrictStats(districtName, clinics, populationPoints);

          // Calculate center of the feature for popup placement
          // Try to get bounds from the layer, fallback to feature center if available
          let center: L.LatLng;
          if ('getBounds' in pathLayer && typeof pathLayer.getBounds === 'function') {
            const bounds = pathLayer.getBounds();
            center = bounds.getCenter();
          } else {
            // Fallback: use a default center point (Malawi center)
            center = L.latLng(-13.25, 34.3);
          }

          // Create popup content
          const popupContent = document.createElement('div');
          popupContent.innerHTML = `
            <div class="p-2 min-w-[200px]">
              <h3 class="font-bold text-black mb-2">${districtName} District</h3>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Coverage:</span>
                  <span class="font-semibold">${stats.coverage.coveragePercentage.toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Clinics:</span>
                  <span class="font-semibold">${stats.clinics.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">GAIA:</span>
                  <span class="font-semibold text-green-700">${stats.clinicsByType.gaia.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Govt:</span>
                  <span class="font-semibold text-blue-700">${stats.clinicsByType.govt.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Health Centre:</span>
                  <span class="font-semibold text-orange-700">${stats.clinicsByType.healthcentre.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Other:</span>
                  <span class="font-semibold text-gray-700">${stats.clinicsByType.other.length}</span>
                </div>
                <div class="border-t pt-1 mt-1">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Covered Pop:</span>
                    <span class="font-semibold text-green-700">${stats.coverage.coveredPopulation.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          `;

          const popup = L.popup({
            className: 'district-stats-popup',
            closeButton: true,
            autoPan: false,
          })
            .setLatLng(center)
            .setContent(popupContent)
            .openOn(map);

          popupRef.current.set(districtName, popup);
        }, 1000); // 1 second delay

        hoverTimeoutRef.current.set(districtName, timeoutId);
      },
      mouseout: () => {
        // Clear timeout if mouse leaves before 1 second
        const timeoutId = hoverTimeoutRef.current.get(districtName);
        if (timeoutId) {
          clearTimeout(timeoutId);
          hoverTimeoutRef.current.delete(districtName);
        }

        // Close popup if open
        const popup = popupRef.current.get(districtName);
        if (popup) {
          map.closePopup(popup);
          popupRef.current.delete(districtName);
        }

        // Reset style
        const isSelected = selectedDistrict === districtName;
        pathLayer.setStyle({
          fillOpacity: isSelected ? 0.3 : 0.1,
          weight: isSelected ? 3 : 1.5,
        });
      },
    });
  };

  return (
    <GeoJSON
      data={geoJsonData}
      style={getDistrictStyle}
      onEachFeature={handleEachFeature}
    />
  );
}
