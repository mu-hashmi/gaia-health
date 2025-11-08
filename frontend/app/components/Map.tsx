'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clinic } from '../types';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  clinics: Clinic[];
  onMapClick?: (lat: number, lng: number) => void;
  disableInteractions?: boolean;
}

function MapUpdater({ clinics }: { clinics: Clinic[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (clinics.length > 0) {
      const bounds = L.latLngBounds(
        clinics.map(clinic => [clinic.lat, clinic.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [clinics, map]);

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

export default function Map({ clinics, onMapClick, disableInteractions = false }: MapProps) {
  const getClinicColor = (type: Clinic['type']) => {
    switch (type) {
      case 'gaia': return '#10b981'; // green
      case 'govt': return '#3b82f6'; // blue
      case 'cham': return '#8b5cf6'; // purple
      default: return '#6b7280';
    }
  };

  const getClinicIcon = (type: Clinic['type']) => {
    const color = getClinicColor(type);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Malawi approximate center
  const center: [number, number] = [-15.7833, 35.5167];

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater clinics={clinics} />
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
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{clinic.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{clinic.type}</p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}

