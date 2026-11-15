import { useEffect, useState } from 'react';
import { BookOpen, Building2, LocateFixed, MapPin, Maximize2, Navigation, Search, Star, Utensils } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

const POINTS = [
  { id: 'gate', name: 'Main Campus Entrance · Gate 1', short: 'Gate 1', category: 'Access', position: [28.4506, 77.5820], detail: 'Primary campus security gate along TechZone II road. Coordinate supplied as an estimate.' },
  { id: 'block-a', name: 'Block A · Administrative Block', short: 'Block A', category: 'Academic', position: [28.4507, 77.5838], detail: 'Central foyer, visitor reception, Admissions, Registrar and Finance offices, and Central Library. Location supplied as an estimate.' },
  { id: 'block-b', name: 'Block B · Engineering & CSE Wing', short: 'Block B', category: 'Academic', position: [28.4513, 77.5832], detail: 'School of Engineering lecture rooms, CSE labs and seminar halls. Location supplied as an estimate.' },
  { id: 'block-n', name: 'Block N · New Engineering Wing', short: 'Block N', category: 'Academic', position: [28.4521, 77.5830], detail: 'Heavy testing and material labs, AI/Robotics labs and incubation spaces. Location supplied as an estimate.' },
  { id: 'block-cd', name: 'Blocks C & D · Management, Law & Media', short: 'Blocks C & D', category: 'Academic', position: [28.4498, 77.5835], detail: 'School of Management, School of Law, Moot Court, and TV/Radio broadcast studios. Location supplied as an estimate.' },
  { id: 'atrium', name: 'Central Atrium & Foyer', short: 'Central atrium', category: 'Academic', position: [28.4509, 77.5836], detail: 'Covered pedestrian corridor connecting Blocks A and B with the Central Library. Location supplied as an estimate.' },
  { id: 'mess', name: 'Central Dining Hall / Student Mess', short: 'Dining hall', category: 'Food', position: [28.4519, 77.5847], detail: 'Multi-level student mess facility. Coordinate supplied as an estimate; schedules and menus were not supplied.' },
  { id: 'food-hub', name: 'Commercial Food Hub & Tuck Area', short: 'Food hub', category: 'Food', position: [28.4502, 77.5849], detail: 'Supplied notes name Maggi Point, Kathi Junction, Quench, snack kiosks and convenience stores. Current operators and hours are not live-verified.' },
  { id: 'isc', name: 'Indoor Sports Complex (ISC)', short: 'Indoor sports', category: 'Sports', position: [28.4517, 77.5852], detail: 'Supplied notes describe an air-conditioned indoor stadium, gym, squash and badminton courts, and swimming pool. Location supplied as an estimate.' },
  { id: 'ground', name: 'Main Athletic Ground & Running Track', short: 'Athletic ground', category: 'Sports', position: [28.4510, 77.5861], detail: 'Full-size football/cricket turf with 400 m running track, per supplied notes. Location supplied as an estimate.' },
  { id: 'courts', name: 'Outdoor Courts Complex', short: 'Outdoor courts', category: 'Sports', position: [28.4512, 77.5853], detail: 'Synthetic tennis, basketball and volleyball courts. Location supplied as an estimate.' },
  { id: 'hostels', name: 'Hostel Quadrangle · Towers H1–H6', short: 'Hostels H1–H6', category: 'Residence', position: [28.4528, 77.5856], detail: 'Student residential towers in the north-east quadrant, according to supplied notes. Coordinate supplied as an estimate.' }
];
const START = [28.4514, 77.5843];
const CATEGORIES = { Access: '#fbbf24', Academic: '#38bdf8', Food: '#fb923c', Sports: '#a3e635', Residence: '#c084fc' };
const REVIEW_KEY = 'campusfind-bennett-local-ratings-v1';

function getSavedRatings() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '[]'); } catch { return []; }
}

function makeIcon(category, active) {
  return L.divIcon({ className: '', html: `<span class="snu-campus-pin${active ? ' is-active' : ''}" style="--pin-color:${CATEGORIES[category]}"><span>${category[0]}</span></span>`, iconSize: [34, 42], iconAnchor: [17, 38] });
}

function MapControl({ focus, fitToken }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(17, map.getZoom()), { duration: .45 });
    else map.fitBounds(L.latLngBounds(POINTS.map((point) => point.position)), { padding: [38, 38], maxZoom: 17 });
  }, [map, focus, fitToken]);
  return null;
}

function CampusMarker({ point, active, onClick }) {
  return <Marker position={point.position} icon={makeIcon(point.category, active)} eventHandlers={{ click: onClick }}>
    <Tooltip permanent direction="top" offset={[0, -34]} className="snu-marker-tooltip">{point.short}</Tooltip>
    <Popup><strong>{point.name}</strong><br />{point.detail}<br /><small>Estimated coordinates: {point.position[0].toFixed(4)}° N, {point.position[1].toFixed(4)}° E</small></Popup>
  </Marker>;
}

export default function BennettCampus() {
  const [tab, setTab] = useState('map');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('block-a');
  const [focus, setFocus] = useState(null);
  const [fitToken, setFitToken] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('');
  const [origin, setOrigin] = useState('gps');
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [routing, setRouting] = useState(false);
  const [ratings, setRatings] = useState(getSavedRatings);
  const [draft, setDraft] = useState({ stars: 0, note: '' });
  const selected = POINTS.find((point) => point.id === selectedId) || POINTS[1];
  const visible = POINTS.filter((point) => (filter === 'All' || point.category === filter) && `${point.name} ${point.category}`.toLowerCase().includes(search.toLowerCase()));
  const ratingAverage = ratings.length ? ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length : null;

  const choose = (id) => {
    const point = POINTS.find((item) => item.id === id);
    if (!point) return;
    setSelectedId(id); setFocus(point.position); setFitToken((value) => value + 1); setRoute(null); setRouteError('');
  };

  const locate = () => {
    if (!navigator.geolocation) { setGpsStatus('This browser does not support GPS.'); return; }
    setGpsStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = [coords.latitude, coords.longitude]; setUserPosition(position); setOrigin('gps'); setFocus(position); setFitToken((value) => value + 1); setGpsStatus('Your current location is shown on the map.');
    }, (error) => setGpsStatus(error.code === 1 ? 'Location access was denied. Allow GPS in your browser to continue.' : 'Could not find your location. Try again outdoors.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  const directions = async () => {
    setRouting(true); setRoute(null); setRouteError('');
    try {
      let start = userPosition;
      if (origin !== 'gps') start = POINTS.find((point) => point.id === origin)?.position;
      if (!start) {
        if (!navigator.geolocation) throw new Error('GPS is unavailable. Choose a campus marking as the starting point.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }));
        start = [position.coords.latitude, position.coords.longitude]; setUserPosition(start);
      }
      if (start[0] === selected.position[0] && start[1] === selected.position[1]) throw new Error('Choose a different starting point from the destination.');
      const response = await fetch('https://valhalla1.openstreetmap.de/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locations: [{ lat: start[0], lon: start[1], type: 'break' }, { lat: selected.position[0], lon: selected.position[1], type: 'break' }], costing: 'pedestrian', units: 'kilometers', language: 'en-US' }) });
      if (!response.ok) throw new Error('The walking route service is unavailable. Try again shortly.');
      const data = await response.json();
      const shape = data.trip?.legs?.[0]?.shape;
      if (!shape) throw new Error(data.error || 'No mapped walking route was found between these points.');
      let index = 0; let lat = 0; let lon = 0; const positions = [];
      while (index < shape.length) {
        let result = 0; let shift = 0; let byte;
        do { byte = shape.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32 && index < shape.length);
        lat += result & 1 ? ~(result >> 1) : result >> 1;
        result = 0; shift = 0;
        do { byte = shape.charCodeAt(index++) - 63; result |= (byte & 31) << shift; shift += 5; } while (byte >= 32 && index < shape.length);
        lon += result & 1 ? ~(result >> 1) : result >> 1;
        positions.push([lat / 1e6, lon / 1e6]);
      }
      setRoute(positions);
    } catch (error) { setRouteError(error.code === 1 ? 'GPS access was denied. Choose a campus marking as the start, or allow GPS.' : error.message || 'Could not calculate the walking route.'); }
    finally { setRouting(false); }
  };

  const saveRating = () => {
    if (!draft.stars) return;
    const next = [...ratings, { id: Date.now(), stars: draft.stars, note: draft.note.trim(), date: new Date().toISOString() }];
    setRatings(next); setDraft({ stars: 0, note: '' });
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(next)); } catch { /* Keep rating in this session. */ }
  };

  return <div className="snu-explorer">
    <div className="snu-heading"><div><p className="snu-eyebrow">BENNETT UNIVERSITY · TECHZONE II</p><h2>Campus explorer</h2><p className="snu-subtitle">Explore estimated campus zones, facilities and in-app walking directions.</p></div><span className="snu-source-pill"><BookOpen size={14} /> In-app campus guide</span></div>
    <div className="snu-map-grid">
      <section className="snu-map-card" aria-label="Interactive Bennett University campus map">
        <div className="snu-filter-row">{['All', 'Academic', 'Food', 'Sports', 'Residence', 'Access'].map((category) => <button key={category} className={`snu-filter${filter === category ? ' active' : ''}`} type="button" onClick={() => setFilter(category)}>{category}</button>)}</div>
        <div className="snu-map-navigation-tools"><label className="snu-pin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a campus marking" aria-label="Search campus markings" /></label><button type="button" onClick={() => { setFocus(null); setFitToken((value) => value + 1); }}><Maximize2 size={15} />Fit campus</button><button type="button" onClick={locate}><LocateFixed size={15} />Locate me</button></div>
        <div className="snu-map-legend">{Object.entries(CATEGORIES).map(([category, color]) => <span key={category}><i style={{ '--legend-color': color }} />{category}</span>)}</div>
        <MapContainer center={START} zoom={17} scrollWheelZoom className="snu-leaflet-map">
          <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapControl focus={focus} fitToken={fitToken} />
          {visible.map((point) => <CampusMarker key={point.id} point={point} active={point.id === selectedId} onClick={() => choose(point.id)} />)}
          {userPosition && <CircleMarker center={userPosition} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Your current location</Popup></CircleMarker>}
          {route && <Polyline positions={route} pathOptions={{ color: '#f97316', weight: 6, opacity: .9 }} />}
        </MapContainer>
        {!visible.length && <div className="snu-no-markings">No campus markings match “{search}”.</div>}
        <div className="snu-map-status-row"><span>Campus markers use user-supplied estimated coordinates.</span><span>Street tiles: OpenStreetMap</span></div>
        {gpsStatus && <p className="snu-gps-status" role="status">{gpsStatus}</p>}
        <div className="snu-map-footnote"><MapPin size={14} /> Markers are estimates, not surveyed building entrances. Street-map coverage and mapped paths may be incomplete.</div>
      </section>
      <aside className="snu-info-card">
        <div className="snu-tabs" role="tablist" aria-label="Campus information">
          <button type="button" role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><Building2 size={15} />Map</button>
          <button type="button" role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><BookOpen size={15} />Campus info</button>
          <button type="button" role="tab" aria-selected={tab === 'food'} className={tab === 'food' ? 'active' : ''} onClick={() => setTab('food')}><Utensils size={15} />Food</button>
        </div>
        {tab === 'map' && <div className="snu-info-scroll">
          <div className="snu-selected-place"><span className="snu-category-pill" style={{ '--pin-color': CATEGORIES[selected.category] }}>{selected.category}</span><h3>{selected.name}</h3><p>{selected.detail}</p><p className="snu-inline-source">Estimated coordinates: {selected.position[0].toFixed(4)}° N, {selected.position[1].toFixed(4)}° E</p>
            <div className="snu-route-planner"><label htmlFor="galgotias-origin">Start from</label><select id="galgotias-origin" value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="gps">My current location (GPS)</option>{POINTS.filter((point) => point.id !== selected.id).map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select><button type="button" className="snu-directions" onClick={directions} disabled={routing}><Navigation size={15} />{routing ? 'Finding route…' : 'Show directions here'}</button><p className="snu-routing-disclosure">Route and line appear on this page. GPS coordinates and destination are sent to the OpenStreetMap based routing service; availability depends on mapped paths.</p>{routeError && <p className="snu-route-error" role="alert">{routeError}</p>}</div>
          </div>
          <div className="snu-location-list"><h3>Campus markings</h3>{visible.map((point) => <button key={point.id} className={selectedId === point.id ? 'active' : ''} onClick={() => choose(point.id)}><span className="snu-list-dot" style={{ '--pin-color': CATEGORIES[point.category] }} />{point.name}<span>›</span></button>)}</div>
        </div>}
        {tab === 'overview' && <div className="snu-info-scroll">
          <section className="snu-overview-intro"><span className="snu-category-pill" style={{ '--pin-color': '#38bdf8' }}>TechZone II · Greater Noida</span><h3>Bennett University campus</h3><p>Use this in-app guide to locate academic blocks, the atrium, dining, sports, Gate 1 and hostel towers. All listed coordinates were provided as estimates.</p></section>
          <section className="snu-detail-section"><h3>Academic & administrative blocks</h3><ul>{POINTS.filter((point) => point.category === 'Academic').map((point) => <li key={point.id}><strong>{point.name}</strong> — {point.detail} <button type="button" onClick={() => { choose(point.id); setTab('map'); }}>Show on map</button></li>)}</ul></section>
          <section className="snu-detail-section"><h3>Campus facilities & access</h3><ul>{POINTS.filter((point) => ['Access', 'Sports', 'Residence', 'Food'].includes(point.category)).map((point) => <li key={point.id}><strong>{point.name}</strong> — {point.detail} <button type="button" onClick={() => { choose(point.id); setTab('map'); }}>Show on map</button></li>)}</ul></section>
          <p className="snu-inline-source">No floor-by-floor layouts, opening hours, contact details or service schedules were included in the supplied information, so they are not inferred here. All listed coordinates are estimates.</p>
        </div>}
        {tab === 'food' && <div className="snu-info-scroll">
          <div className="snu-food-intro"><h3><Utensils size={18} />Food & dining on campus</h3><p>The supplied campus information identifies a multi-level student mess and a commercial food hub. Menus, prices, current operators and opening hours are not connected or live-verified.</p></div>
          {POINTS.filter((point) => point.category === 'Food').map((spot) => <article className="snu-food-card" key={spot.id}><div className="snu-food-card-top"><div><h3>{spot.name}</h3><span>Food facility · estimated location</span></div><button type="button" className="snu-locate-button" title="Show on map" onClick={() => { choose(spot.id); setTab('map'); }}><MapPin size={16} /></button></div><p>{spot.detail} Coordinates: {spot.position[0].toFixed(4)}° N, {spot.position[1].toFixed(4)}° E.</p><div className="snu-rating-summary">{ratingAverage ? <><strong className="snu-rating-number">{ratingAverage.toFixed(1)}</strong><span className="snu-stars-display">{'★'.repeat(Math.round(ratingAverage))}{'☆'.repeat(5 - Math.round(ratingAverage))}</span><span>{ratings.length} local rating{ratings.length === 1 ? '' : 's'} across food facilities</span></> : <span>No local ratings yet</span>}</div><div className="snu-rate-form"><span className="snu-rate-label">Rate your visit</span><div className="snu-star-input" role="radiogroup" aria-label={`Rate ${spot.name}`}>{[1, 2, 3, 4, 5].map((stars) => <button key={stars} type="button" role="radio" aria-checked={draft.stars === stars} aria-label={`${stars} out of 5 stars`} className={draft.stars >= stars ? 'chosen' : ''} onClick={() => setDraft({ ...draft, stars })}><Star size={17} fill="currentColor" /></button>)}</div><textarea maxLength={240} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Optional note about your visit" aria-label={`Review note for ${spot.name}`} /><button type="button" className="snu-submit-rating" disabled={!draft.stars} onClick={saveRating}>Save rating on this device</button></div>{ratings.slice(-3).reverse().map((item) => <div className="snu-review" key={item.id}><span>{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</span>{item.note && <p>{item.note}</p>}<small>{new Date(item.date).toLocaleDateString()}</small></div>)}</article>)}
          <div className="snu-local-rating-note"><Star size={15} />Ratings and notes are local to this browser. They are personal feedback, not official or shared ratings.</div>
          <section className="snu-amenities"><h3>Sports & residential amenities</h3><p>The supplied notes describe an indoor sports complex with gym, squash, badminton and a swimming pool; outdoor football/cricket turf, a 400 m running track, tennis, basketball and volleyball courts; and hostel Towers H1–H6.</p></section>
        </div>}
      </aside>
    </div>
  </div>;
}

