"use client";

import { DEFAULT_CENTER } from "@/lib/geo";
import type { ItemWithLocation } from "@/lib/types";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

type MapTheme = "streets" | "satellite";

type Props = {
  items: ItemWithLocation[];
  center?: { lat: number; lng: number };
  onItemClick?: (item: ItemWithLocation) => void;
  className?: string;
};

export function LiveMap({ items, center, onItemClick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [liveCenter, setLiveCenter] = useState(center ?? DEFAULT_CENTER);
  const [locationLabel, setLocationLabel] = useState("Locating current area...");
  const [mapTheme, setMapTheme] = useState<MapTheme>("streets");

  const getMapStyle = (theme: MapTheme): string | maplibregl.StyleSpecification => {
    if (theme === "satellite") {
      const style: maplibregl.StyleSpecification = {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "&copy; Esri",
          },
          labels: {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; CARTO",
          },
        },
        layers: [
          { id: "satellite-layer", type: "raster", source: "satellite" },
          { id: "label-layer", type: "raster", source: "labels" },
        ],
      };

      return style;
    }

    return "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
  };

  const requestLiveLocation = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationLabel("Location access is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLiveCenter(nextCenter);
        reverseGeocode(nextCenter.lat, nextCenter.lng);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [nextCenter.lng, nextCenter.lat],
            zoom: 15,
            essential: true,
          });
        }
      },
      () => {
        setLocationLabel("Location permission was denied. Showing default area.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: "application/json" } }
      );

      if (!res.ok) return;
      const data = await res.json();
      const address = data?.address ?? {};
      const formatted =
        address.district ||
        address.county ||
        address.city ||
        address.town ||
        address.village ||
        address.state ||
        "Current location";

      setLocationLabel(`${formatted} • ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      setLocationLabel(`Current location • ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLiveCenter(nextCenter);
        reverseGeocode(nextCenter.lat, nextCenter.lng);

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [nextCenter.lng, nextCenter.lat],
            zoom: 15,
            essential: true,
          });
        }
      },
      () => {
        const fallback = { lat: center?.lat ?? DEFAULT_CENTER.lat, lng: center?.lng ?? DEFAULT_CENTER.lng };
        setLiveCenter(fallback);
        reverseGeocode(fallback.lat, fallback.lng);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [center]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(mapTheme),
      center: [liveCenter.lng, liveCenter.lat],
      zoom: 15,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      })
    );
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [liveCenter.lat, liveCenter.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.setStyle(getMapStyle(mapTheme));
  }, [mapTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    items.forEach((item) => {
      if (!item.location) return;

      const el = document.createElement("div");
      el.className = "relative cursor-pointer";
      el.innerHTML = `
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
          item.type === "LOST"
            ? "bg-red-500 text-white animate-pulse"
            : "bg-emerald-500 text-white"
        }">
          ${item.type === "LOST" ? "L" : "F"}
        </div>
      `;

      el.addEventListener("click", () => onItemClick?.(item));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.location.longitude, item.location.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-1">
              <p class="font-semibold text-beacon-400">${item.title}</p>
              <p class="text-xs text-slate-400 mt-1">${item.type} · ${item.category}</p>
              <p class="text-xs mt-1">${item.description.slice(0, 80)}...</p>
            </div>
          `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [items, onItemClick, mapTheme]);

  return (
    <div className={className ?? "w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-slate-700 relative"}>
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setMapTheme("streets")}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm smooth-transition ${
            mapTheme === "streets"
              ? "border-primary-500 bg-primary-500/20 text-primary-200"
              : "border-surface-600 bg-surface-950/80 text-surface-200 hover:bg-surface-900"
          }`}
        >
          Streets
        </button>
        <button
          type="button"
          onClick={() => setMapTheme("satellite")}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm smooth-transition ${
            mapTheme === "satellite"
              ? "border-primary-500 bg-primary-500/20 text-primary-200"
              : "border-surface-600 bg-surface-950/80 text-surface-200 hover:bg-surface-900"
          }`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={requestLiveLocation}
          className="rounded-lg border border-primary-500/50 bg-surface-950/80 px-3 py-2 text-xs font-semibold text-primary-300 shadow-lg backdrop-blur-sm hover:bg-surface-900 smooth-transition glow-primary"
        >
          Enable live location
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-surface-700 bg-surface-950/80 px-3 py-2 text-xs text-surface-200 shadow-lg backdrop-blur-sm glass">
        <div className="font-semibold text-primary-400">Current area</div>
        <div className="mt-1 truncate text-surface-300">{locationLabel}</div>
      </div>
    </div>
  );
}
