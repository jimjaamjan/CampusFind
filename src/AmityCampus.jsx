import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, LocateFixed, MapPin, Maximize2, Navigation, RefreshCw, Search, Star, Utensils } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

// Viewport center only; all displayed POI locations are loaded from OpenStreetMap.
const CAMPUS_CENTER = [28.5445, 77.3330];
const SEARCH_RADIUS_METERS = 750;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const REVIEW_KEY = 'campusfind-amity-live-map-ratings-v1';
const COLORS = { Academic: '#38bdf8', Food: '#fb923c', Sports: '#a3e635', Residence: '#c084fc', Access: '#fbbf24', Health: '#fb7185', Other: '#cbd5e1' };
const EXCLUDED_NAME = /\b(apptrove|astralis|bistro\s*67|bullman\s*(?:reality|realty)|digispace|elite\s*home|galaxy\s*stays|hcl(?:\s*cafe\s*3)?|isawar\s*sigh\s*chauhan\s*pg|kotak\s*bank|nova\s*east|mayur\s*school|noida\s*habit(?:ai|at)|riyansh\s*pg|sec(?:tor)?\s*(?:124|44|94))\b/i;
const CAMPUS_CONTEXT = /\bamity\b|\bblock\s*[a-l]\d?\b|\b[a-l]\s*block\b|\bhostel\b|\bcentral\s+library\b|\b(?:mega\s*byte|olympia|wall\s*street|mint\s*cafe|subway\s*central|dosa\s*plaza|bikano|domino'?s|cafe\s+coffee\s+day)\b|\b(?:campus\s+gate|sports\s+complex|swimming\s+pool|auditorium|cafeteria)\b/i;

const DEPARTMENT_GROUPS = [
  ['A', 'Pharmacy, Space Science, Indian Systems of Medicine, Foundational Sciences'],
  ['B', 'Aerospace, Nuclear Science, Special Education, Military College for Women'],
  ['C', 'Psychology, Anthropology'],
  ['D', 'Law (LLM), Education, International Relations, Sanskrit, Public Policy, Foreign Languages'],
  ['E', 'Engineering, CSE, AI, Civil, Mechanical, EEE, ECE, Applied Sciences, Microbiology'],
  ['F', 'MBA, Management, Logistics & Supply Chain, Physiotherapy, Occupational Therapy'],
  ['I', 'Information Technology, International Business, Food Technology, Agriculture, Hotel Management, Law'],
  ['J', 'Biotechnology, Forensic Science, Pharmacy, Neuroscience, Public Health, Environmental Sciences'],
  ['K', 'Fashion, Fine Arts, Design, Architecture, Journalism, English, Economics, Commerce, Social Sciences'],
  ['L', 'Defence and Strategic Studies']
];

const BLOCK_FACILITIES = [
  ['A', 'Accounts Office, seminar hall and administration-related facilities.'],
  ['B', 'Auditorium, seminar rooms and academic departments.'],
  ['C', 'Psychology and Anthropology.'],
  ['D', 'Administration office, clinic and academic facilities.'],
  ['E1', 'ID Card Office and Mega Byte cafeteria.'],
  ['E2', 'Registrar Office, Examination Office and International Affairs.'],
  ['E3', 'Incubator.'],
  ['F2', 'Gym, Wall Street, Mint Cafe and auditorium.'],
  ['F3', 'Seminar hall and MDP hall.'],
  ['I2 / J2', 'Central Library and Admission Office. The supplied note does not specify which block.'],
  ['L1', 'Anti-Ragging Office.'],
  ['L3', 'Auditorium.']
];

function readRatings() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}'); } catch { return {}; }
}

function mapLabel(name, tags = {}) {
  const ref = String(tags.ref || '').replaceAll(' ', '').toUpperCase();
  if (/^H[1-7]$/.test(ref)) return `Hostel ${ref}`;
  if (/^[A-L](?:[1-3])?$/.test(ref)) return `Block ${ref}`;
  const label = name.match(/\bblock\s*([A-L]\d?)\b|\b([A-L]\d?)\s*block\b/i);
  if (label) return `Block ${(label[1] || label[2]).toUpperCase()}`;
  const hostel = name.match(/\bhostel\s*H?([1-7])\b|\bH([1-7])\s*hostel\b/i);
  if (hostel) return `Hostel H${hostel[1] || hostel[2]}`;
  return name;
}

function classify(tags = {}, name = '') {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;
  const building = tags.building;
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'bar', 'ice_cream'].includes(amenity) || ['restaurant', 'bakery', 'convenience'].includes(shop)) return 'Food';
  if (['sports_centre', 'stadium', 'pitch', 'track'].includes(leisure) || tags.sport || building === 'sports_hall') return 'Sports';
  if (['dormitory', 'residential'].includes(building) || amenity === 'student_accommodation') return 'Residence';
  if (tags.entrance || amenity === 'gate') return 'Access';
  if (tags.healthcare || ['clinic', 'hospital', 'doctors', 'pharmacy'].includes(amenity)) return 'Health';
  if (amenity === 'university' || amenity === 'college' || tags.education || tags.school || /university|college|school|faculty|library|block/i.test(`${tags.name || ''} ${name}`)) return 'Academic';
  return 'Other';
}

function parsePlaces(elements = []) {
  const seen = new Set();
  return elements.flatMap((element) => {
    const tags = element.tags || {};
    const sourceName = tags['name:en'] || tags.name || '';
    const ref = String(tags.ref || '').replaceAll(' ', '').toUpperCase();
    const isAcademicBlockRef = /^[A-L](?:[1-3])?$/.test(ref);
    const isHostelRef = /^H[1-7]$/.test(ref);
    const name = sourceName || (isHostelRef ? `Hostel ${ref}` : isAcademicBlockRef ? `Block ${ref}` : '');
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const campusLabel = `${name || ''} ${tags.operator || ''} ${tags.brand || ''}`;
    const isPlaceFeature = ['amenity', 'shop', 'building', 'leisure', 'sport', 'tourism', 'healthcare', 'education', 'office', 'entrance', 'landuse']
      .some((key) => tags[key]);
    if (!name || EXCLUDED_NAME.test(campusLabel) || !CAMPUS_CONTEXT.test(campusLabel) || !isPlaceFeature || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const key = `${name.toLowerCase()}-${lat.toFixed(5)}-${lon.toFixed(5)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const category = classify(tags, name);
    const detail = [tags.amenity, tags.shop, tags.leisure, tags.building, tags.sport]
      .filter((value) => value && value !== 'yes')
      .map((value) => value.replaceAll('_', ' '));
    return [{
      id: `${element.type}-${element.id}`,
      name,
      shortLabel: mapLabel(name, tags),
      category,
      position: [lat, lon],
      detail: detail.length ? [...new Set(detail)].join(' · ') : 'Named OpenStreetMap place',
      tags,
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
    }];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function makeIcon(category, active) {
  const color = COLORS[category] || COLORS.Other;
  return L.divIcon({
    className: '',
    html: `<span class="snu-campus-pin${active ? ' is-active' : ''}" style="--pin-color:${color}"><span>${category[0]}</span></span>`,
    iconSize: [34, 42], iconAnchor: [17, 38]
  });
}

function MapControl({ focus, fitToken, places }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(17, map.getZoom()), { duration: 0.45 });
    else if (places.length) map.fitBounds(L.latLngBounds(places.map((place) => place.position)), { padding: [42, 42], maxZoom: 18 });
    else map.setView(CAMPUS_CENTER, 17);
  }, [map, focus, fitToken, places]);
  return null;
}

function CampusMarker({ place, active, onSelect }) {
  return <Marker position={place.position} icon={makeIcon(place.category, active)} eventHandlers={{ click: onSelect }}>
    <Tooltip permanent direction="top" offset={[0, -34]} className="snu-marker-tooltip">{place.shortLabel}</Tooltip>
    <Popup><strong>{place.name}</strong><br />{place.detail}<br /><small>Label and position loaded from OpenStreetMap.</small></Popup>
  </Marker>;
}

function decodePolyline6(encoded) {
  const coordinates = [];
  let index = 0; let lat = 0; let lon = 0;
  while (index < encoded.length) {
    let result = 0; let shift = 0; let byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32 && index < encoded.length);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lat / 1e6, lon / 1e6]);
  }
  return coordinates;
}

function averageRating(reviews = []) {
  return reviews.length ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length : null;
}

export default function AmityCampus() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('Loading named campus places from OpenStreetMap…');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState('map');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [focus, setFocus] = useState(null);
  const [fitToken, setFitToken] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('');
  const [originId, setOriginId] = useState('gps');
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [routing, setRouting] = useState(false);
  const [ratingsBySpot, setRatingsBySpot] = useState(readRatings);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const load = async () => {
      setLoading(true);
      setLoadStatus('Refreshing named campus places from OpenStreetMap…');
      const query = `[out:json][timeout:25];(nwr(around:${SEARCH_RADIUS_METERS},${CAMPUS_CENTER[0]},${CAMPUS_CENTER[1]})[name][~"^(amenity|shop|building|leisure|sport|tourism|healthcare|education|office|entrance|landuse)$"~"."];nwr(around:${SEARCH_RADIUS_METERS},${CAMPUS_CENTER[0]},${CAMPUS_CENTER[1]})[building][ref];);out center tags;`;
      let lastError;
      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`OpenStreetMap query returned HTTP ${response.status}.`);
          const data = await response.json();
          if (disposed) return;
          const nextPlaces = parsePlaces(data.elements);
          setPlaces(nextPlaces);
          setSelectedId((current) => nextPlaces.some((place) => place.id === current) ? current : nextPlaces[0]?.id || '');
          setLastUpdated(new Date());
          setLoadStatus(nextPlaces.length ? `Loaded ${nextPlaces.length} Amity-related places from current OpenStreetMap records.` : 'No named Amity-related OpenStreetMap places were found in the campus area.');
          setFitToken((value) => value + 1);
          setLoading(false);
          return;
        } catch (error) {
          if (error.name === 'AbortError' || disposed) return;
          lastError = error;
        }
      }
      if (!disposed) {
        setLoadStatus(`${lastError?.message || 'Could not load OpenStreetMap places.'} Check your connection or refresh.`);
        setLoading(false);
      }
    };
    load();
    return () => { disposed = true; controller.abort(); };
  }, [refreshToken]);

  const matchingPlaces = useMemo(() => {
    const term = search.trim().toLowerCase();
    return places.filter((place) => (filter === 'All' || place.category === filter)
      && (!term || `${place.name} ${place.detail} ${place.category}`.toLowerCase().includes(term)));
  }, [places, filter, search]);
  const selected = places.find((place) => place.id === selectedId) || null;
  const foodPlaces = places.filter((place) => place.category === 'Food');

  const selectPlace = (place) => {
    setSelectedId(place.id);
    setFocus(place.position);
    setFitToken((value) => value + 1);
    setRoute(null);
    setRouteError('');
  };

  const locateMe = () => {
    if (!navigator.geolocation) { setGpsStatus('This browser does not support GPS.'); return; }
    setGpsStatus('Finding your current location…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = [coords.latitude, coords.longitude];
      setUserPosition(position); setFocus(position); setFitToken((value) => value + 1); setOriginId('gps');
      setGpsStatus('Your location is shown on the map.');
    }, (error) => setGpsStatus(error.code === 1 ? 'Location permission was denied. Allow GPS in your browser and try again.' : 'Could not locate your device. Try again outdoors.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  const directions = async () => {
    if (!selected) return;
    setRoute(null); setRouteError(''); setRouting(true);
    try {
      let start = userPosition;
      if (originId !== 'gps') start = places.find((place) => place.id === originId)?.position;
      if (!start) {
        if (!navigator.geolocation) throw new Error('GPS is unavailable. Choose a mapped campus place as the start.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }));
        start = [position.coords.latitude, position.coords.longitude]; setUserPosition(start);
      }
      if (start[0] === selected.position[0] && start[1] === selected.position[1]) throw new Error('Choose a different start place from the destination.');
      const response = await fetch('https://valhalla1.openstreetmap.de/route', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: [{ lat: start[0], lon: start[1], type: 'break' }, { lat: selected.position[0], lon: selected.position[1], type: 'break' }], costing: 'pedestrian', units: 'kilometers', language: 'en-US' })
      });
      if (!response.ok) throw new Error(`Walking route service returned HTTP ${response.status}.`);
      const data = await response.json();
      const positions = (data.trip?.legs || []).flatMap((leg) => decodePolyline6(leg.shape || ''));
      if (positions.length < 2) throw new Error(data.error || 'No mapped walking route was found between these places.');
      setRoute(positions);
    } catch (error) {
      setRouteError(error.code === 1 ? 'GPS access was denied. Choose a mapped campus place as the start or allow GPS.' : error.message || 'Could not calculate a walking route.');
    } finally { setRouting(false); }
  };

  const saveRating = (placeId) => {
    const draft = drafts[placeId] || {};
    if (!draft.stars) return;
    const next = { ...ratingsBySpot, [placeId]: [...(ratingsBySpot[placeId] || []), { id: Date.now(), stars: draft.stars, note: (draft.note || '').trim(), date: new Date().toISOString() }] };
    setRatingsBySpot(next);
    setDrafts((current) => ({ ...current, [placeId]: { stars: 0, note: '' } }));
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(next)); } catch { /* Keep this session's rating visible. */ }
  };

  return <div className="snu-explorer">
    <div className="snu-heading"><div><p className="snu-eyebrow">AMITY UNIVERSITY · SECTOR 125, NOIDA</p><h2>Live campus explorer</h2><p className="snu-subtitle">Campus place names and marker positions are loaded from OpenStreetMap data.</p></div><span className="snu-source-pill"><BookOpen size={14} /> Live map directory</span></div>
    <div className="snu-map-grid">
      <section className="snu-map-card" aria-label="Live OpenStreetMap locations around Amity University Noida">
        <div className="snu-filter-row">{['All', 'Academic', 'Food', 'Sports', 'Residence', 'Access', 'Health', 'Other'].map((category) => <button key={category} className={`snu-filter${filter === category ? ' active' : ''}`} type="button" onClick={() => setFilter(category)}>{category}</button>)}</div>
        <div className="snu-map-navigation-tools"><label className="snu-pin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search real mapped places" aria-label="Search mapped places" /></label><button type="button" onClick={() => { setFocus(null); setFitToken((value) => value + 1); }}><Maximize2 size={15} />Fit places</button><button type="button" onClick={locateMe}><LocateFixed size={15} />Locate me</button><button type="button" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}><RefreshCw size={15} />Refresh live data</button></div>
        <div className="snu-map-legend">{Object.entries(COLORS).map(([category, color]) => <span key={category}><i style={{ '--legend-color': color }} />{category}</span>)}</div>
        <MapContainer center={CAMPUS_CENTER} zoom={17} scrollWheelZoom className="snu-leaflet-map">
          <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapControl focus={focus} fitToken={fitToken} places={matchingPlaces} />
          {matchingPlaces.map((place) => <CampusMarker key={place.id} place={place} active={place.id === selectedId} onSelect={() => selectPlace(place)} />)}
          {userPosition && <CircleMarker center={userPosition} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Your current device location</Popup></CircleMarker>}
          {route && <Polyline positions={route} pathOptions={{ color: '#f97316', weight: 6, opacity: 0.9 }} />}
        </MapContainer>
        {!loading && !matchingPlaces.length && <div className="snu-no-markings" role="status">No named OpenStreetMap places match this view and filter.</div>}
        <div className="snu-map-status-row"><span>{loadStatus}</span><span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'No live result yet'}</span></div>
        {gpsStatus && <p className="snu-gps-status" role="status">{gpsStatus}</p>}
        <div className="snu-map-footnote"><MapPin size={14} />Markers use coordinates attached to named OpenStreetMap records. Missing or outdated source mapping cannot be filled in by CampusFind.</div>
      </section>
      <aside className="snu-info-card">
        <div className="snu-tabs" role="tablist" aria-label="Amity campus details">
          <button type="button" role="tab" aria-selected={activeTab === 'map'} className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}><Building2 size={15} />Map</button>
          <button type="button" role="tab" aria-selected={activeTab === 'overview'} className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><BookOpen size={15} />Campus info</button>
          <button type="button" role="tab" aria-selected={activeTab === 'food'} className={activeTab === 'food' ? 'active' : ''} onClick={() => setActiveTab('food')}><Utensils size={15} />Mapped food</button>
        </div>
        {activeTab === 'map' && <div className="snu-info-scroll">
          {selected ? <div className="snu-selected-place"><span className="snu-category-pill" style={{ '--pin-color': COLORS[selected.category] || COLORS.Other }}>{selected.category}</span><h3>{selected.name}</h3><p>{selected.detail}</p><p className="snu-inline-source">Coordinates supplied by the current OpenStreetMap record: {selected.position[0].toFixed(6)}, {selected.position[1].toFixed(6)}.</p>
            <div className="snu-route-planner"><label htmlFor="amity-route-origin">Start from</label><select id="amity-route-origin" value={originId} onChange={(event) => setOriginId(event.target.value)}><option value="gps">My current location (GPS)</option>{places.filter((place) => place.id !== selected.id).map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select><button type="button" className="snu-directions" onClick={directions} disabled={routing || !places.length}><Navigation size={15} />{routing ? 'Finding route…' : 'Show directions here'}</button><p className="snu-routing-disclosure">Route is drawn inside CampusFind. The walking router receives origin and destination coordinates; mapped paths may be incomplete.</p>{routeError && <p className="snu-route-error" role="alert">{routeError}</p>}</div>
          </div> : <div className="snu-selected-place"><h3>{loading ? 'Loading campus places…' : 'No named place selected'}</h3><p>{loadStatus}</p></div>}
          <div className="snu-location-list"><h3>Mapped places in this view ({matchingPlaces.length})</h3>{matchingPlaces.slice(0, 100).map((place) => <button key={place.id} className={selectedId === place.id ? 'active' : ''} onClick={() => selectPlace(place)}><span className="snu-list-dot" style={{ '--pin-color': COLORS[place.category] || COLORS.Other }} />{place.name}<span>›</span></button>)}</div>
        </div>}
        {activeTab === 'overview' && <div className="snu-info-scroll">
          <section className="snu-overview-intro"><span className="snu-category-pill" style={{ '--pin-color': '#38bdf8' }}>Sector 125 · Noida</span><h3>Amity campus directory</h3><p>The department and office notes below were supplied for CampusFind. They are a directory reference, not map pins; only named OpenStreetMap records are placed on the live map.</p></section>
          <section className="snu-detail-section"><h3>Departments by block</h3><ul>{DEPARTMENT_GROUPS.map(([block, departments]) => <li key={block}><strong>Block {block}:</strong> {departments}</li>)}</ul></section>
          <section className="snu-detail-section"><h3>Offices and facilities by block</h3><ul>{BLOCK_FACILITIES.map(([block, details]) => <li key={block}><strong>Block {block}:</strong> {details}</li>)}</ul></section>
          <section className="snu-detail-section"><h3>Live map coverage</h3><p>The map fetches named places around the campus from OpenStreetMap when opened and when you refresh. Map names and coordinates reflect the current source records, which may be incomplete or need correction by OpenStreetMap contributors.</p></section>
        </div>}
        {activeTab === 'food' && <div className="snu-info-scroll">
          <div className="snu-food-intro"><h3><Utensils size={18} />Food places mapped in OpenStreetMap</h3><p>Only places currently tagged as food venues in OpenStreetMap appear here. The old coordinate-based outlet labels have been removed. If a venue is not in the source map, it will not be shown as a confirmed location.</p></div>
          {foodPlaces.length ? foodPlaces.map((place) => {
            const reviews = ratingsBySpot[place.id] || [];
            const avg = averageRating(reviews);
            const draft = drafts[place.id] || { stars: 0, note: '' };
            return <article className="snu-food-card" key={place.id}>
              <div className="snu-food-card-top"><div><h3>{place.name}</h3><span>{place.detail}</span></div><button type="button" className="snu-locate-button" title="Show mapped place" onClick={() => { selectPlace(place); setActiveTab('map'); }}><MapPin size={16} /></button></div>
              <p>Live map listing; outlet position comes from its OpenStreetMap record.</p>
              <div className="snu-rating-summary">{avg ? <><strong className="snu-rating-number">{avg.toFixed(1)}</strong><span className="snu-stars-display">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span><span>{reviews.length} on this device</span></> : <span>No ratings yet</span>}</div>
              <div className="snu-rate-form"><span className="snu-rate-label">Rate your visit</span><div className="snu-star-input" role="radiogroup" aria-label={`Rate ${place.name}`}>{[1, 2, 3, 4, 5].map((stars) => <button key={stars} type="button" role="radio" aria-checked={draft.stars === stars} aria-label={`${stars} out of 5 stars`} className={draft.stars >= stars ? 'chosen' : ''} onClick={() => setDrafts((current) => ({ ...current, [place.id]: { ...draft, stars } }))}><Star size={17} fill="currentColor" /></button>)}</div><textarea maxLength={240} value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [place.id]: { ...draft, note: event.target.value } }))} placeholder="Optional note about your visit" aria-label={`Review note for ${place.name}`} /><button type="button" className="snu-submit-rating" disabled={!draft.stars} onClick={() => saveRating(place.id)}>Save rating on this device</button></div>
              {reviews.slice(-3).reverse().map((review) => <div className="snu-review" key={review.id}><span>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</span>{review.note && <p>{review.note}</p>}<small>{new Date(review.date).toLocaleDateString()}</small></div>)}
            </article>;
          }) : <section className="snu-amenities"><h3>No mapped dining venues found</h3><p>The live OpenStreetMap response currently contains no named food places in this campus area. CampusFind has removed the earlier estimated outlet pins; you can refresh this view later as map records change.</p></section>}
          <div className="snu-local-rating-note"><Star size={15} />Ratings are visitor-submitted and saved only in this browser. They are not official or shared.</div>
        </div>}
      </aside>
    </div>
  </div>;
}

