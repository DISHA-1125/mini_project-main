'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue in Next.js/Vite-like environments.
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

type LocationPickerProps = {
  value?: { lat: number; lng: number; label?: string } | null;
  onChange?: (location: { lat: number; lng: number; label: string }) => void;
  className?: string;
};

type ReverseGeocodeResult = {
  display_name?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    district?: string;
    state?: string;
    country?: string;
  };
};

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

function buildLandmarkLabel(data: ReverseGeocodeResult | null, lat: number, lng: number) {
  const address = data?.address ?? {};
  const road = address.road || 'local road';
  const area =
    address.neighbourhood ||
    address.suburb ||
    address.village ||
    address.town ||
    address.city ||
    address.district ||
    address.county ||
    'this area';

  const placeParts = [
    `Near ${area}`,
    road !== 'local road' ? `, ${road}` : '',
    address.city || address.state ? `, ${address.city || address.state}` : '',
  ].join('');

  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return data?.display_name ? `${placeParts || 'Near this location'} (${fallback})` : `Near ${area}, ${road} (${fallback})`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FindIt-App/1.0',
      },
    });

    if (!res.ok) {
      return `Near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    const data: ReverseGeocodeResult = await res.json();
    return buildLandmarkLabel(data, lat, lng);
  } catch {
    return `Near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function MapController({
  selectedPosition,
  onSelect,
}: {
  selectedPosition: { lat: number; lng: number } | null;
  onSelect: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPosition) {
      map.setView([selectedPosition.lat, selectedPosition.lng], 16);
    }
  }, [map, selectedPosition]);

  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    moveend() {
      if (!selectedPosition) {
        const center = map.getCenter();
        onSelect({ lat: center.lat, lng: center.lng });
      }
    },
  });

  return null;
}

export function LocationPicker({ value, onChange, className = '' }: LocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    value ?? null
  );
  const [label, setLabel] = useState<string>(value?.label ?? 'Select a precise location on the map');
  const [isLocating, setIsLocating] = useState(false);

  const mapCenter = useMemo<LatLngExpression>(() => {
    if (selectedPosition) {
      return [selectedPosition.lat, selectedPosition.lng] as [number, number];
    }
    return DEFAULT_CENTER;
  }, [selectedPosition]);

  const updateLocation = async (coords: { lat: number; lng: number }) => {
    const nextLabel = await reverseGeocode(coords.lat, coords.lng);
    setSelectedPosition(coords);
    setLabel(nextLabel);
    onChange?.({ ...coords, label: nextLabel });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLabel('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        await updateLocation(coords);
        setIsLocating(false);
      },
      () => {
        setLabel('Unable to detect your current location. Please select manually on the map.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (value && value.lat && value.lng) {
      setSelectedPosition({ lat: value.lat, lng: value.lng });
      setLabel(value.label || 'Selected location');
    }
  }, [value]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-surface-200">Location</div>
        <button
          type="button"
          onClick={handleDetectLocation}
          className="rounded-md border border-primary-500/40 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300 hover:bg-primary-500/20 smooth-transition glow-primary"
        >
          {isLocating ? 'Detecting...' : 'Detect My Current Location'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-700 bg-surface-950 glass shadow-xl">
        <MapContainer center={mapCenter} zoom={14} scrollWheelZoom className="h-[320px] w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            selectedPosition={selectedPosition}
            onSelect={(coords) => {
              void updateLocation(coords);
            }}
          />
          {selectedPosition && <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={defaultIcon} />}
        </MapContainer>
      </div>

      <div className="rounded-lg border border-surface-700 bg-surface-900/50 p-3 text-sm text-surface-200 glass">
        <div className="font-semibold text-primary-400">Selected place</div>
        <div className="mt-1 text-surface-300">{label}</div>
        {selectedPosition && (
          <div className="mt-2 text-xs text-surface-500">
            Lat: {selectedPosition.lat.toFixed(6)} • Lng: {selectedPosition.lng.toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
}
