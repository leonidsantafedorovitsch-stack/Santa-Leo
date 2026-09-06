import React, { useEffect, useRef, useState } from 'react';
import { LongStop, GpsPoint } from '../../types';
import { formatDate, formatDuration } from '../../utils/geo';
import { Crosshair, Navigation2, Compass, MapPin } from 'lucide-react';
import L from 'leaflet';

interface MapScreenProps {
  stops: LongStop[];
  focusedStop?: LongStop | null;
  onSelectStop: (stop: LongStop) => void;
  currentLocation?: GpsPoint | null;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export const MapScreen: React.FC<MapScreenProps> = ({ 
  stops, 
  focusedStop, 
  onSelectStop,
  currentLocation 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const currentLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const hasAutoCenteredRef = useRef<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<TimeFilter>('all');
  const [selectedMapStop, setSelectedMapStop] = useState<LongStop | null>(focusedStop || null);

  // Filter stops based on time filter
  const filteredStops = stops.filter(stop => {
    if (activeFilter === 'all') return true;
    const now = Date.now();
    const age = now - stop.startTime;
    if (activeFilter === 'today') return age <= 24 * 3600 * 1000;
    if (activeFilter === 'week') return age <= 7 * 24 * 3600 * 1000;
    if (activeFilter === 'month') return age <= 30 * 24 * 3600 * 1000;
    if (activeFilter === 'year') return age <= 365 * 24 * 3600 * 1000;
    return true;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Determine initial center
      let initialCenter: [number, number] = [52.5200, 13.4050];
      let initialZoom = 7;

      if (focusedStop) {
        initialCenter = [focusedStop.latitude, focusedStop.longitude];
        initialZoom = 13;
      } else if (currentLocation) {
        initialCenter = [currentLocation.latitude, currentLocation.longitude];
        initialZoom = 14;
        hasAutoCenteredRef.current = true;
      } else if (stops.length > 0) {
        initialCenter = [stops[0].latitude, stops[0].longitude];
        initialZoom = 11;
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(initialCenter, initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add compact zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer groups
      stopsLayerRef.current = L.layerGroup().addTo(map);
      currentLocationLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Keep map alive if container is preserved
    };
  }, []);

  // Center map on user location when first detected if no stops are present
  useEffect(() => {
    if (currentLocation && mapInstanceRef.current && !hasAutoCenteredRef.current && stops.length === 0 && !focusedStop) {
      mapInstanceRef.current.setView([currentLocation.latitude, currentLocation.longitude], 14, { animate: true });
      hasAutoCenteredRef.current = true;
    }
  }, [currentLocation, stops.length, focusedStop]);

  // Update real-time current user location layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const currentLayer = currentLocationLayerRef.current;
    if (!map || !currentLayer) return;

    currentLayer.clearLayers();

    if (!currentLocation) return;

    const { latitude, longitude, accuracy = 15, speed, heading } = currentLocation;

    // Outer ripple pulse and inner cyan pinpoint
    const liveUserIcon = L.divIcon({
      className: 'live-user-location-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-[#0284C7] opacity-60"></span>
          <span class="absolute inline-flex h-7 w-7 rounded-full bg-[#38BDF8] opacity-40"></span>
          <div class="w-5 h-5 rounded-full bg-[#0284C7] border-2 border-white shadow-[0_0_12px_rgba(2,132,199,0.9)] relative z-10 flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          ${heading !== undefined && heading !== null ? `
            <div 
              class="absolute -top-3 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-[#0284C7] transform origin-bottom transition-transform duration-300" 
              style="transform: rotate(${heading}deg) translate(0, -6px);"
            ></div>
          ` : ''}
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const userMarker = L.marker([latitude, longitude], {
      icon: liveUserIcon,
      zIndexOffset: 1000
    });

    // Accuracy Circle
    const accuracyCircle = L.circle([latitude, longitude], {
      radius: Math.max(10, Math.min(accuracy, 250)),
      color: '#0284C7',
      fillColor: '#38BDF8',
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: '3, 4'
    });

    userMarker.bindPopup(`
      <div class="p-2 space-y-1 min-w-[180px] text-[#1E293B]">
        <div class="flex items-center gap-1.5 font-bold text-xs text-[#0284C7]">
          <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>Ваша текущая позиция</span>
        </div>
        <div class="text-[11px] font-mono text-[#64748B] pt-1 border-t border-[#F1F5F9]">
          <div>Ш: ${latitude.toFixed(6)}°</div>
          <div>Д: ${longitude.toFixed(6)}°</div>
          <div>Погрешность: ±${Math.round(accuracy)} м</div>
          ${speed !== undefined ? `<div>Скорость: ${(speed * 3.6).toFixed(1)} км/ч</div>` : ''}
        </div>
      </div>
    `);

    currentLayer.addLayer(accuracyCircle);
    currentLayer.addLayer(userMarker);
  }, [currentLocation]);

  // Update stops markers when filteredStops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = stopsLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (filteredStops.length === 0) return;

    const bounds: L.LatLngTuple[] = [];

    filteredStops.forEach(stop => {
      bounds.push([stop.latitude, stop.longitude]);

      const labelText = `${stop.placeName} — ${formatDuration(stop.duration)}`;
      
      const customIcon = L.divIcon({
        className: 'custom-stop-marker-wrapper',
        html: `
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#0284C7] rounded-full shadow-lg text-xs font-bold text-[#1E293B] whitespace-nowrap transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-all cursor-pointer">
            <span class="text-[#0284C7]">📍</span>
            <span>${labelText}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon: customIcon });

      // 150m radius cluster circle around parking stop
      const circle = L.circle([stop.latitude, stop.longitude], {
        radius: 150,
        color: '#0284C7',
        fillColor: '#38BDF8',
        fillOpacity: 0.18,
        weight: 1.5
      });

      marker.on('click', () => {
        setSelectedMapStop(stop);
        map.setView([stop.latitude, stop.longitude], 13, { animate: true });
      });

      circle.on('click', () => {
        setSelectedMapStop(stop);
      });

      layer.addLayer(circle);
      layer.addLayer(marker);
    });

    if (focusedStop) {
      map.setView([focusedStop.latitude, focusedStop.longitude], 13);
      setSelectedMapStop(focusedStop);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [filteredStops, focusedStop]);

  // Center map on user's current GPS location
  const handleLocateUser = () => {
    if (!currentLocation || !mapInstanceRef.current) return;
    mapInstanceRef.current.setView(
      [currentLocation.latitude, currentLocation.longitude], 
      15, 
      { animate: true }
    );
  };

  return (
    <div id="map-screen" className="relative w-full h-[calc(100vh-4rem)] md:h-screen flex flex-col">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Time Filters */}
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-[#E2E8F0] flex gap-1 pointer-events-auto overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Сегодня' },
            { id: 'week', label: 'Неделя' },
            { id: 'month', label: 'Месяц' },
            { id: 'year', label: 'Год' },
            { id: 'all', label: 'Всё время' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as TimeFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === f.id
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Live GPS Telemetry Status Pill */}
        <div className="bg-[#0F172A]/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-[#334155] text-white pointer-events-auto flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
          </span>
          <div className="text-xs font-semibold">
            {currentLocation ? (
              <span className="font-mono text-[11px] text-[#38BDF8]">
                {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                <span className="text-slate-400 font-sans ml-1">(±{Math.round(currentLocation.accuracy)}м)</span>
              </span>
            ) : (
              <span className="text-slate-300">Ожидание GPS сигнала...</span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Center on Location Button */}
      <button
        onClick={handleLocateUser}
        title="Перейти к моему местоположению"
        className={`absolute bottom-24 md:bottom-8 right-4 z-30 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
          currentLocation 
            ? 'bg-white hover:bg-[#F8FAFC] text-[#0284C7] border-[#E2E8F0] active:scale-95 cursor-pointer shadow-md' 
            : 'bg-white/60 text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed'
        }`}
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* Map Canvas Container */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-map-container"
        className="w-full flex-1 z-10" 
      />

      {/* Selected Marker Card */}
      {selectedMapStop && (
        <div className="absolute bottom-24 md:bottom-8 left-4 right-16 md:right-20 z-30 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-[#E2E8F0] flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-extrabold text-[#1E293B] text-base flex items-center gap-1.5">
                <span className="text-[#0284C7]">📍</span>
                <span>{selectedMapStop.placeName}</span>
                {selectedMapStop.country && (
                  <span className="text-xs font-semibold text-[#64748B]">, {selectedMapStop.country}</span>
                )}
              </div>
              <div className="text-xs text-[#64748B]">
                {formatDate(selectedMapStop.startTime, selectedMapStop.timezone)}
                {' → '}
                {selectedMapStop.endTime ? formatDate(selectedMapStop.endTime, selectedMapStop.timezone) : 'Сейчас'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-base font-black text-[#1E293B]">
                  {formatDuration(selectedMapStop.duration)}
                </div>
                <div className="text-[10px] uppercase font-bold text-[#10B981] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  Завершено
                </div>
              </div>

              <button
                onClick={() => onSelectStop(selectedMapStop)}
                className="px-4 py-2 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Детали
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
