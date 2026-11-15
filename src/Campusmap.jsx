import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

const OVERPASS_URL = import.meta.env.VITE_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const PLACE_CACHE_TTL = 3 * 60 * 1000;
const placeCache = new Map();

const userIcon = L.divIcon({
  className: '',
  html: '<div class="user-pin" aria-label="Your current location"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});
const shardaBlockIcon = L.divIcon({
  className: '',
  html: '<span class="sharda-map-pin"><span>BLK</span></span>',
  iconSize: [38, 42],
  iconAnchor: [19, 39],
  popupAnchor: [0, -36]
});
const EMPTY_MARKERS = [];

function getCategory(tags) {
  const pairs = [
    ['amenity', tags.amenity], ['shop', tags.shop], ['leisure', tags.leisure],
    ['tourism', tags.tourism], ['healthcare', tags.healthcare], ['building', tags.building]
  ].filter(([, value]) => value && value !== 'yes');
  return pairs.map(([key, value]) => `${key.replace('_', ' ')}: ${value.replaceAll('_', ' ')}`).join(' · ') || 'mapped place';
}

function formatBuilding(element) {
  const tags = element.tags || {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const isBuilding = Boolean(tags.building && element.type === 'way' && element.geometry?.length >= 4);
  if ((!tags.name && !isBuilding) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return {
    id: `${element.type}-${element.id}`,
    name: tags.name || 'Unnamed building',
    category: isBuilding ? `Campus building${tags.building !== 'yes' ? `: ${tags.building.replaceAll('_', ' ')}` : ''}` : getCategory(tags),
    address: tags['addr:full'] || street || tags['addr:suburb'] || '',
    latitude,
    longitude,
    footprint: isBuilding ? element.geometry.map((point) => [point.lat, point.lon]) : null,
    lastUpdated: element.timestamp || null,
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
  };
}

function MapFocus({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.5 });
  }, [map, position]);
  return null;
}

function FitCampusMarkers({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length) map.fitBounds(markers.map((marker) => marker.position), { padding: [54, 54], maxZoom: 18 });
  }, [map, markers]);
  return null;
}

export function LiveBuildingsLayer({ onBuildingsChange, refreshToken = 0 }) {
  const map = useMap();
  const callbackRef = useRef(onBuildingsChange);
  const handledRefreshToken = useRef(refreshToken);
  const pendingForcedRefresh = useRef(refreshToken > 0);

  useEffect(() => {
    callbackRef.current = onBuildingsChange;
  }, [onBuildingsChange]);

  useEffect(() => {
    if (refreshToken !== handledRefreshToken.current) {
      handledRefreshToken.current = refreshToken;
      pendingForcedRefresh.current = true;
    }
  }, [refreshToken]);

  useEffect(() => {
    let timer;
    let controller;
    let disposed = false;

    const loadBuildings = () => {
      clearTimeout(timer);
      if (controller) controller.abort();
      if (map.getZoom() < 15) {
        callbackRef.current([], 'Zoom in to level 15 or closer to load building footprints from OpenStreetMap.', null);
        return;
      }

      const bounds = map.getBounds();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();
      const key = [south, west, north, east].map((value) => value.toFixed(3)).join(',');
      const force = pendingForcedRefresh.current;
      pendingForcedRefresh.current = false;

      if (!force) {
        const cached = placeCache.get(key);
        if (cached && Date.now() - cached.storedAt < PLACE_CACHE_TTL) {
          callbackRef.current(cached.places, `Building footprints loaded from a recent local cache (${cached.places.length} buildings).`, new Date(cached.retrievedAt));
          return;
        }
      }

      callbackRef.current([], 'Loading campus building footprints from OpenStreetMap…', null);
      timer = setTimeout(async () => {
        controller = new AbortController();
        const bbox = `${south},${west},${north},${east}`;
        const query = `[out:json][timeout:25];way["building"](${bbox});out center geom tags meta;`;
        try {
          const response = await fetch(OVERPASS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`OpenStreetMap buildings returned HTTP ${response.status}.`);
          const data = await response.json();
          if (disposed) return;
          const buildings = (data.elements || []).map(formatBuilding).filter(Boolean);
          const retrievedAt = new Date();
          placeCache.set(key, { places: buildings, retrievedAt, storedAt: Date.now() });
          callbackRef.current(buildings, buildings.length
            ? `Found ${buildings.length} building footprints in this map view from OpenStreetMap.`
            : 'No building footprints are mapped in this view. OpenStreetMap coverage can be incomplete.', retrievedAt);
        } catch (error) {
          if (error.name === 'AbortError' || disposed) return;
          callbackRef.current([], `${error.message || 'Could not load campus buildings.'} Try refreshing in a moment.`, null);
        }
      }, 1200);
    };

    loadBuildings();
    map.on('moveend', loadBuildings);
    map.on('zoomend', loadBuildings);
    return () => {
      disposed = true;
      clearTimeout(timer);
      if (controller) controller.abort();
      map.off('moveend', loadBuildings);
      map.off('zoomend', loadBuildings);
    };
  }, [map]);

  return null;
}

function locationError(error) {
  if (error.code === 1) return 'Location access was denied. Allow it in your browser to use GPS.';
  if (error.code === 2) return 'Your device location is unavailable. Check location settings.';
  if (error.code === 3) return 'Location lookup timed out. Try again in an open area.';
  return error.message || 'Could not read your location.';
}

export default function CampusMap({ campus, buildings, onBuildingsChange, refreshToken = 0, markers = EMPTY_MARKERS, focusMarker = null }) {
  const [userPosition, setUserPosition] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [tileStatus, setTileStatus] = useState('Loading street map tiles…');
  const [tracking, setTracking] = useState(false);
  const watchId = useRef(null);

  const [buildingsStatus, setBuildingsStatus] = useState('');

  const reportBuildings = useCallback((nextBuildings, status) => {
    onBuildingsChange(nextBuildings);
    setBuildingsStatus(status);
  }, [onBuildingsChange]);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const toggleGps = () => {
    if (!navigator.geolocation) {
      setGpsError('This browser does not support location services.');
      return;
    }
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setTracking(false);
      return;
    }
    setGpsError('');
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => setUserPosition([position.coords.latitude, position.coords.longitude]),
      (error) => {
        setGpsError(locationError(error));
        setTracking(false);
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const activeUserPosition = userPosition || focusMarker;

  return (
    <>
      <div className="campus-map-toolbar">
        <div className="min-w-0">
          <h2>{campus.name}</h2>
            <p>{campus.city} · OpenStreetMap streets and campus building footprints</p>
        </div>
        <button type="button" className="map-gps-button" onClick={toggleGps} aria-pressed={tracking}>
          <LocateFixed className="h-4 w-4" /> {tracking ? 'Stop GPS' : 'Locate me'}
        </button>
      </div>
      {gpsError && <p className="gps-error mx-3 mt-3" role="status">{gpsError}</p>}
      <div className="street-map-panel">
          <MapContainer center={campus.center} zoom={18} scrollWheelZoom className="campus-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                loading: () => setTileStatus('Loading street map tiles from OpenStreetMap…'),
                load: () => setTileStatus('Street map tiles loaded from OpenStreetMap.'),
                tileerror: () => setTileStatus('Some street map tiles could not load. Check your connection or try again.')
              }}
            />
            <MapFocus position={activeUserPosition} />
            <FitCampusMarkers markers={markers} />
            <LiveBuildingsLayer onBuildingsChange={reportBuildings} refreshToken={refreshToken} />
            {markers.map((marker) => (
              <Marker key={marker.id} position={marker.position} icon={shardaBlockIcon}>
                <Tooltip permanent direction="top" offset={[0, -36]} className="snu-marker-tooltip">{marker.name}</Tooltip>
                <Popup><strong>{marker.name}</strong><br />{marker.details}<br /><small>Marker coordinates supplied for this block.</small></Popup>
              </Marker>
            ))}
            {buildings.map((building) => (
              <Polygon
                key={building.id}
                positions={building.footprint}
                pathOptions={{ color: '#22d3ee', weight: 1.5, fillColor: '#22d3ee', fillOpacity: 0.12 }}
              >
                <Popup>
                  <strong>{building.name}</strong><br />
                  {building.category}<br />
                  {building.lastUpdated ? `OSM edit: ${new Date(building.lastUpdated).toLocaleString()}` : 'OSM edit time unavailable'}<br />
                  <a href={building.osmUrl} target="_blank" rel="noreferrer">Open OpenStreetMap record</a>
                </Popup>
              </Polygon>
            ))}
            {activeUserPosition && <Marker position={activeUserPosition} icon={userIcon}><Popup>Your current device location</Popup></Marker>}
          </MapContainer>
          <div className="map-source-note"><MapPin className="h-3.5 w-3.5" /><span>{tileStatus} {buildingsStatus} Campus building outlines reflect OpenStreetMap records; coverage varies by campus.</span></div>
      </div>
    </>
  );
}


