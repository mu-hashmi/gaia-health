'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Clinic } from '../types';
import DistrictBoundaries from './DistrictBoundaries';
import HeatmapLayer from './HeatmapLayer';

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  clinics: Clinic[];
  onMapClick?: (lat: number, lng: number) => void;
  onClinicClick?: (clinic: Clinic) => void;
  disableInteractions?: boolean;
  populationPoints?: Array<{ lat: number; lng: number; population: number }>;
  showHeatmap?: boolean;
  recommendedLocations?: Array<{ lat: number; lng: number; score: number; uncoveredPopulation: number }>;
  selectedDistrict?: string;
  onRecommendedClick?: (rec: { lat: number; lng: number; score: number; uncoveredPopulation: number }) => void;
}

function MapUpdater() {
  const map = useMap();
  
  useEffect(() => {
    // Set fixed bounds for Malawi
    const malawiBounds = L.latLngBounds(
      [-17.2, 32.6], // Southwest corner
      [-9.3, 36.0]    // Northeast corner
    );
    map.setMaxBounds(malawiBounds);
    map.fitBounds(malawiBounds, { padding: [20, 20] });
  }, [map]);

  return null;
}

function MapClickHandler({ onMapClick, disabled }: { onMapClick?: (lat: number, lng: number) => void; disabled?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (onMapClick && !disabled) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };
      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }
  }, [map, onMapClick, disabled]);

  useEffect(() => {
    if (disabled) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoom.enable();
    }
  }, [map, disabled]);

  return null;
}

export default function Map({ 
  clinics, 
  onMapClick,
  onClinicClick,
  disableInteractions = false,
  populationPoints = [],
  showHeatmap = false,
  recommendedLocations = [],
  selectedDistrict,
  onRecommendedClick,
}: MapProps) {
  const getClinicColor = (type: Clinic['type']) => {
    // GAIA clinics = green, all others = gray
    if (type === 'gaia') {
      return '#10b981'; // green
    }
    return '#6b7280'; // gray for all others (govt, healthcentre, other)
  };

  const getClinicIcon = (type: Clinic['type']) => {
    const color = getClinicColor(type);
    const isHealthCentre = type === 'healthcentre';
    
    // Health centres use square shape, all others use circle
    const shapeStyle = isHealthCentre 
      ? 'width: 20px; height: 20px; border-radius: 2px;' // square with rounded corners
      : 'width: 20px; height: 20px; border-radius: 50%;'; // circle
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; ${shapeStyle} border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const getRecommendedIcon = () => {
    return L.divIcon({
      className: 'recommended-marker',
      html: `<div style="background-color: #f59e0b; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <div style="width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Malawi center
  const center: [number, number] = [-13.25, 34.3];
  
  // Malawi bounds to restrict map view
  const malawiBounds = L.latLngBounds(
    [-17.2, 32.6], // Southwest corner
    [-9.3, 36.0]    // Northeast corner
  );

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={7}
        minZoom={6}
        maxBounds={malawiBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer populationPoints={populationPoints} enabled={showHeatmap} />
        <DistrictBoundaries 
          selectedDistrict={selectedDistrict}
          clinics={clinics}
          populationPoints={populationPoints}
        />
        <MapUpdater />
        <MapClickHandler onMapClick={onMapClick} disabled={disableInteractions} />
        {clinics.map((clinic) => (
          <div key={clinic.id}>
            <Circle
              center={[clinic.lat, clinic.lng]}
              radius={5000} // 5km in meters
              pathOptions={{
                color: getClinicColor(clinic.type),
                fillColor: getClinicColor(clinic.type),
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
            <Marker
              position={[clinic.lat, clinic.lng]}
              icon={getClinicIcon(clinic.type)}
              eventHandlers={{
                click: () => {
                  if (onClinicClick) {
                    onClinicClick(clinic);
                  }
                },
              }}
            />
          </div>
        ))}
        {recommendedLocations.map((rec, index) => (
          <div key={`rec-${index}`}>
            <Circle
              center={[rec.lat, rec.lng]}
              radius={5000} // 5km radius
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '10, 5',
              }}
            />
            <Marker
              position={[rec.lat, rec.lng]}
              icon={getRecommendedIcon()}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-amber-600">Recommended Location #{index + 1}</h3>
                  <p className="text-sm text-black">
                    Score: {(rec.score * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-black">
                    Uncovered Population: {rec.uncoveredPopulation.toLocaleString()}
                  </p>
                  {onRecommendedClick && (
                    <button
                      onClick={() => onRecommendedClick(rec)}
                      className="mt-2 w-full px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium"
                    >
                      Add Clinic
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}

