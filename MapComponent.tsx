import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { Coordinates } from '../types';

interface Props {
  center: Coordinates;
  onLocationSelect: (coords: Coordinates) => void;
}

export const MapComponent: React.FC<Props> = ({ center, onLocationSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Clean up potential existing instance
    if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
    }

    // Fix leaflet icons
    try {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
    } catch (e) {
        // warning suppressed
    }

    const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lon],
        zoom: 4,
        zoomControl: false,
        attributionControl: false
    });

    // NASA GIBS Layer (Blue Marble)
    L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2022-03-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
        minZoom: 1,
        maxZoom: 9,
        attribution: 'NASA GIBS'
    }).addTo(map);

    // Labels overlay
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lon: lng, name: "Selected Location" });
        
        // Optimistic UI update for marker
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        }
        
        L.popup()
          .setLatLng(e.latlng)
          .setContent('<div style="text-align:center;">Analyzing Area...<br/><span style="font-size:10px; color:#666">Check Home tab</span></div>')
          .openOn(map);
    });

    mapInstanceRef.current = map;
    markerRef.current = L.marker([center.lat, center.lon]).addTo(map);

    // Force map invalidation to fix "grey tiles" if container size changed
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []); // Run once on mount

  // Update view when center changes
  useEffect(() => {
    if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([center.lat, center.lon], 6);
        if (markerRef.current) {
            markerRef.current.setLatLng([center.lat, center.lon]);
        } else {
            markerRef.current = L.marker([center.lat, center.lon]).addTo(mapInstanceRef.current);
        }
    }
  }, [center]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900" style={{minHeight: '100%'}} />;
};