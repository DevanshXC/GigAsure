import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RiskScore } from '@/types';
import L from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

interface MapContentProps {
  riskScore: RiskScore;
}

const MapContent: React.FC<MapContentProps> = ({ riskScore }) => {
  
  // Coordinate Lookup Table for Demo Zones
  const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
    'MUM-ANDHERI-W': { lat: 19.1136, lng: 72.8697 },
    'MUM-DHARAVI': { lat: 19.0440, lng: 72.8557 },
    'MUM-POWAI': { lat: 19.1176, lng: 72.9060 },
    'MUM-FORT': { lat: 18.9322, lng: 72.8317 },
    'DEL-CONNAUGHT': { lat: 28.6315, lng: 77.2167 },
    'DEL-OKHLA': { lat: 28.5398, lng: 77.2754 },
    'DEL-ROHINI': { lat: 28.7366, lng: 77.1132 },
  };

  const safeZoneId = riskScore?.zone_id || 'MUM-ANDHERI-W';
  const coords = ZONE_COORDS[safeZoneId] || ZONE_COORDS['MUM-ANDHERI-W'];

  const CENTER_LAT = coords.lat;
  const CENTER_LNG = coords.lng;

  // Custom icon to match Google style (blue pin)
  const customIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Determine circle color based on total risk or specific risk
  const getTotalRisk = () => (riskScore?.p_weather || 0) + (riskScore?.p_civic || 0) + (riskScore?.p_pollution || 0);
  const riskColor = getTotalRisk() > 0.4 ? '#D93025' : getTotalRisk() > 0.15 ? '#F9AB00' : '#1E8E3E';

  return (
    <MapContainer 
      center={[CENTER_LAT, CENTER_LNG]} 
      zoom={14} 
      style={{ height: '100%', width: '100%', backgroundColor: '#F8F9FA' }}
      zoomControl={false}
    >
      {/* Light theme Google-like map tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      
      <Marker position={[CENTER_LAT, CENTER_LNG]} icon={customIcon}>
        <Popup className="google-popup">
          <div className="text-neutral-text font-bold text-[14px]">{safeZoneId}</div>
          <div className="text-[12px] text-neutral-muted mt-0.5">Live Risk Data Active</div>
        </Popup>
      </Marker>

      <Circle
        center={[CENTER_LAT, CENTER_LNG]}
        pathOptions={{ fillColor: riskColor, color: riskColor, weight: 1.5, opacity: 0.8, fillOpacity: 0.15 }}
        radius={1500}
      />
      
      <Circle
        center={[CENTER_LAT + 0.01, CENTER_LNG - 0.015]}
        pathOptions={{ fillColor: '#D93025', color: '#D93025', weight: 1.5, opacity: 0.6, fillOpacity: 0.1 }}
        radius={800}
      />
      <Circle
        center={[CENTER_LAT - 0.012, CENTER_LNG + 0.01]}
        pathOptions={{ fillColor: '#F9AB00', color: '#F9AB00', weight: 1.5, opacity: 0.6, fillOpacity: 0.08 }}
        radius={1000}
      />
    </MapContainer>
  );
};

export default MapContent;
