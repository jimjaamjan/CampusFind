import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, Coffee, Dumbbell, LocateFixed, MapPin, Maximize2, Navigation, Search, Star, Utensils } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LiveBuildingsLayer } from './Campusmap.jsx';

const START = [28.5283, 77.5746];
const REVIEW_STORAGE_KEY = 'campusfind-snu-local-ratings-v1';

const FEATURE_POINTS = [
  { id: 'entrance', name: 'Main Entrance · Dadri Road', shortLabel: 'Main gate', category: 'Access', position: [28.5255, 77.5730], detail: 'Main gate coordinate supplied as an estimate. Campus security and access requirements may apply.' },
  { id: 'academic', name: 'Core Academic Zone · Blocks A & B', shortLabel: 'Academic A+B', category: 'Academic', position: [28.5283, 77.5746], detail: 'Block A is described in the supplied notes as multidisciplinary, with humanities, social sciences, natural sciences, management and administration. Block B is described as the School of Engineering.' },
  { id: 'isc', name: 'Indoor Sports Complex (ISC)', shortLabel: 'Sports complex', category: 'Sports', position: [28.5298, 77.5794], detail: 'The supplied estimate places the ISC here. SNU describes a 120,000+ sq. ft. complex with badminton, squash, basketball, table tennis and other sports facilities.' },
  { id: 'sac', name: 'Student Activity Centre (SAC)', shortLabel: 'SAC · canteen', category: 'Food', position: [28.5269, 77.5758], detail: 'Student activity centre and canteen location estimate from the supplied notes. Meal options and opening hours are not live-verified.' },
  { id: 'hostels', name: 'Hostel Cluster & Dining Halls', shortLabel: 'Hostels · dining', category: 'Residence', position: [28.5312, 77.5765], detail: 'Approximate hostel-cluster location supplied by the user. SNU confirms on-campus housing and dining; individual hostel and dining-hall entrances are not mapped here.' }
];

const FOOD_SPOTS = [
  { id: 'blue-circle', title: 'Blue Circle', kind: 'Food stalls · pharmacy · grocery', note: 'Near the academic zone. The supplied notes mention quick-bite stalls and North Indian, South Indian and Chinese options. Specific operators, menus and hours can change.' },
  { id: 'sac-canteen', title: 'SAC Canteen', kind: 'Canteen', note: 'At the Student Activity Centre. The supplied notes describe breakfast, snacks and meals; current menu and hours are not verified.' },
  { id: 'dining-halls', title: 'Central Dining Halls', kind: 'Residential dining', note: 'Near the hostel clusters. The supplied notes describe North Indian, South Indian and continental meals. SNU reports three dining halls; meal schedules and menus are not live data.' },
  { id: 'kiosks', title: 'Food kiosks & vending', kind: 'Kiosks · tea/coffee · snacks', note: 'SNU reports ten food kiosks and snack, tea and coffee vending machines. Specific brands named in the supplied notes are not confirmed as current outlets.' }
];

const FLOOR_NOTES = {
  A: [
    ['Ground', 'Administrative offices, central library, main auditorium (A010), Student Affairs and foundational science labs.'],
    ['First', 'Humanities and Social Sciences, lecture halls and Natural Sciences staff cabins.'],
    ['Second', 'Natural Sciences labs (including physics, chemistry, mathematics and biotechnology), research and computing facilities.'],
    ['Third', 'Management and Entrepreneurship classrooms, research cubicles and specialized labs.']
  ],
  B: [
    ['Ground', 'Engineering workshops and labs, including mechanical, civil and chemical engineering, plus the makerspace.'],
    ['First', 'Electrical and Electronics labs, computer labs and lecture halls.'],
    ['Second', 'Computer Science labs, department offices, research and AI/data-science facilities.'],
    ['Third', 'Postgraduate research labs, faculty cabins and seminar rooms.']
  ]
};

function readRatings() {
  try {
    return JSON.parse(window.localStorage.getItem(REVIEW_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function decodePolyline6(encoded) {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([latitude / 1e6, longitude / 1e6]);
  }
  return coordinates;
}

function CampusMapController({ position, fitToken }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.45 });
    else map.fitBounds(L.latLngBounds(FEATURE_POINTS.map((point) => point.position)), { padding: [42, 42], maxZoom: 16 });
  }, [map, position, fitToken]);
  return null;
}

function RouteLayer({ route }) {
  const map = useMap();
  const positions = route.positions;
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [48, 48], maxZoom: 17 });
  }, [map, positions]);
  return <>
    <Polyline positions={positions} pathOptions={{ color: '#f97316', weight: 6, opacity: 0.9 }} />
    <CircleMarker center={route.origin} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#22c55e', fillOpacity: 1 }}><Popup>Route starts here</Popup></CircleMarker>
    <CircleMarker center={route.destination} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#f97316', fillOpacity: 1 }}><Popup>Destination</Popup></CircleMarker>
  </>;
}

function starLabel(value) {
  return `${value} out of 5 stars`;
}

function averageRating(reviews) {
  if (!reviews?.length) return null;
  return reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length;
}

const categoryColors = { Access: '#fbbf24', Academic: '#38bdf8', Food: '#fb923c', Sports: '#a3e635', Residence: '#c084fc' };

function makeIcon(category, selected) {
  const color = categoryColors[category] || '#38bdf8';
  return L.divIcon({
    className: '',
    html: `<span class="snu-campus-pin${selected ? ' is-active' : ''}" style="--pin-color:${color}"><span>${category === 'Food' ? 'F' : category === 'Sports' ? 'S' : category === 'Residence' ? 'R' : category === 'Access' ? 'G' : 'A'}</span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36]
  });
}

export default function ShivNadarCampus() {
  const [activeTab, setActiveTab] = useState('map');
  const [filter, setFilter] = useState('All');
  const [pinSearch, setPinSearch] = useState('');
  const [selectedId, setSelectedId] = useState('academic');
  const [mapFocus, setMapFocus] = useState(null);
  const [mapFitToken, setMapFitToken] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('');
  const [osmBuildings, setOsmBuildings] = useState([]);
  const [osmBuildingsStatus, setOsmBuildingsStatus] = useState('Loading mapped buildings…');
  const [buildingRefresh, setBuildingRefresh] = useState(0);
  const [block, setBlock] = useState('A');
  const [floor, setFloor] = useState(0);
  const [reviewsBySpot, setReviewsBySpot] = useState(readRatings);
  const [drafts, setDrafts] = useState({});
  const [originId, setOriginId] = useState('my-location');
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const selected = FEATURE_POINTS.find((point) => point.id === selectedId) || FEATURE_POINTS[1];

  const visiblePoints = useMemo(() => {
    const matchingCategory = filter === 'All' ? FEATURE_POINTS : FEATURE_POINTS.filter((point) => point.category === filter || (filter === 'Food' && point.id === 'academic'));
    const query = pinSearch.trim().toLowerCase();
    return matchingCategory.filter((point) => !query || `${point.name} ${point.shortLabel} ${point.category}`.toLowerCase().includes(query));
  }, [filter, pinSearch]);

  const handleOSMBuildings = useCallback((nextBuildings, status) => {
    setOsmBuildings(nextBuildings);
    setOsmBuildingsStatus(status);
  }, []);

  const saveReview = (spotId) => {
    const draft = drafts[spotId] || {};
    if (!draft.stars) return;
    const nextReviews = [...(reviewsBySpot[spotId] || []), {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stars: draft.stars,
      note: (draft.note || '').trim(),
      submittedAt: new Date().toISOString()
    }];
    const next = { ...reviewsBySpot, [spotId]: nextReviews };
    setReviewsBySpot(next);
    try {
      window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current-session rating visible if browser storage is unavailable.
    }
    setDrafts((current) => ({ ...current, [spotId]: { stars: 0, note: '' } }));
  };

  const selectFeature = (pointId) => {
    setSelectedId(pointId);
    setMapFocus(FEATURE_POINTS.find((point) => point.id === pointId)?.position || null);
    setMapFitToken((token) => token + 1);
    setRoute(null);
    setRouteError('');
  };

  const selectFilter = (nextFilter) => {
    setFilter(nextFilter);
    const inCategory = nextFilter === 'All' ? FEATURE_POINTS : FEATURE_POINTS.filter((point) => point.category === nextFilter || (nextFilter === 'Food' && point.id === 'academic'));
    const query = pinSearch.trim().toLowerCase();
    const firstMatch = inCategory.find((point) => !query || `${point.name} ${point.shortLabel} ${point.category}`.toLowerCase().includes(query));
    if (firstMatch) selectFeature(firstMatch.id);
  };

  const fitCampus = () => {
    setMapFocus(null);
    setMapFitToken((token) => token + 1);
    setGpsStatus('');
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGpsStatus('This browser does not support GPS.');
      return;
    }
    setGpsStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = [coords.latitude, coords.longitude];
      setUserPosition(position);
      setOriginId('my-location');
      setMapFocus(position);
      setMapFitToken((token) => token + 1);
      setGpsStatus('Your current location is shown on the map.');
    }, (error) => {
      setGpsStatus(error.code === 1 ? 'Location permission was denied. Allow GPS in your browser and try again.' : 'Could not find your location. Try again outdoors.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  const focusFoodSpot = (spotId) => {
    const pointId = spotId === 'sac-canteen' ? 'sac' : spotId === 'dining-halls' ? 'hostels' : spotId === 'kiosks' || spotId === 'blue-circle' ? 'academic' : spotId;
    selectFeature(pointId);
  };

  const showWalkingRoute = async () => {
    setRouteError('');
    setRoute(null);
    setRouting(true);
    try {
      let origin;
      if (originId === 'my-location') {
        if (userPosition) origin = userPosition;
        else {
          if (!navigator.geolocation) throw new Error('This browser does not support GPS. Choose a campus zone as the start instead.');
          const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }));
          origin = [position.coords.latitude, position.coords.longitude];
          setUserPosition(origin);
        }
      } else {
        origin = FEATURE_POINTS.find((point) => point.id === originId)?.position;
      }
      if (!origin) throw new Error('Choose a valid starting point.');
      if (origin[0] === selected.position[0] && origin[1] === selected.position[1]) throw new Error('The start and destination are the same. Choose another starting point.');

      const response = await fetch('https://valhalla1.openstreetmap.de/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [{ lat: origin[0], lon: origin[1], type: 'break' }, { lat: selected.position[0], lon: selected.position[1], type: 'break' }],
          costing: 'pedestrian',
          units: 'kilometers',
          language: 'en-US'
        })
      });
      if (!response.ok) throw new Error(`Walking route service returned HTTP ${response.status}.`);
      const data = await response.json();
      const trip = data.trip;
      const legs = trip?.legs || [];
      const positions = legs.flatMap((leg) => decodePolyline6(leg.shape || ''));
      if (!trip || positions.length < 2) throw new Error(data.error || data.status_message || 'No mapped walking route was found. Try another campus start point.');
      const steps = legs.flatMap((leg) => leg.maneuvers || []).map((maneuver) => ({
        instruction: maneuver.instruction || 'Continue on the mapped path',
        distance: (maneuver.length || 0) * 1000
      }));
      setRoute({ positions, origin, destination: selected.position, distanceKm: trip.summary?.length || 0, duration: trip.summary?.time || 0, steps });
    } catch (error) {
      if (error.code === 1) setRouteError('Location permission was denied. Choose a campus zone as your start, or allow GPS in your browser.');
      else if (error.code === 2 || error.code === 3) setRouteError('Your current location could not be read. Choose a campus zone as your start and try again.');
      else setRouteError(error.message || 'Could not calculate a walking route. Try again.');
    } finally {
      setRouting(false);
    }
  };

  return (
    <div className="snu-explorer">
      <div className="snu-heading">
        <div>
          <p className="snu-eyebrow">SHIV NADAR UNIVERSITY · DELHI NCR</p>
          <h2>Campus explorer</h2>
          <p className="snu-subtitle">Explore campus zones, food and facilities. Select a pin or a section to see details.</p>
        </div>
        <span className="snu-source-pill"><BookOpen size={14} /> In-app campus guide</span>
      </div>

      <div className="snu-map-grid">
        <section className="snu-map-card" aria-label="Interactive Shiv Nadar campus map">
          <div className="snu-filter-row" aria-label="Filter map pins">
            {['All', 'Academic', 'Food', 'Sports', 'Residence', 'Access'].map((item) => (
              <button key={item} type="button" className={`snu-filter${filter === item ? ' active' : ''}`} onClick={() => selectFilter(item)}>{item}</button>
            ))}
          </div>
          <div className="snu-map-navigation-tools">
            <label className="snu-pin-search"><Search size={15} /><input value={pinSearch} onChange={(event) => setPinSearch(event.target.value)} placeholder="Find a campus marking" aria-label="Search campus markings" /></label>
            <button type="button" onClick={fitCampus}><Maximize2 size={15} />Fit campus</button>
            <button type="button" onClick={locateMe}><LocateFixed size={15} />Locate me</button>
          </div>
          <div className="snu-map-legend" aria-label="Map marker legend">
            {['Academic', 'Food', 'Sports', 'Residence', 'Access'].map((category) => <span key={category}><i style={{ '--legend-color': categoryColors[category] }} />{category}</span>)}
            <span><i className="building-outline-key" />Mapped building</span>
          </div>
          <MapContainer center={START} zoom={16} scrollWheelZoom className="snu-leaflet-map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <CampusMapController position={mapFocus} fitToken={mapFitToken} />
            <LiveBuildingsLayer onBuildingsChange={handleOSMBuildings} refreshToken={buildingRefresh} />
            {osmBuildings.map((building) => building.footprint && <Polygon key={building.id} positions={building.footprint} pathOptions={{ color: '#22d3ee', weight: 1.5, fillColor: '#22d3ee', fillOpacity: 0.12 }}>
              <Popup><strong>{building.name}</strong><br />{building.category}<br />{building.lastUpdated ? `OSM edit: ${new Date(building.lastUpdated).toLocaleString()}` : 'OSM edit time unavailable'}<br /><a href={building.osmUrl} target="_blank" rel="noreferrer">Open OpenStreetMap record</a></Popup>
            </Polygon>)}
            {route && <RouteLayer route={route} />}
            {visiblePoints.map((point) => (
              <LMarker key={point.id} point={point} selected={selectedId === point.id} onSelect={() => selectFeature(point.id)} />
            ))}
            {userPosition && <CircleMarker center={userPosition} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Your current location</Popup></CircleMarker>}
          </MapContainer>
          {visiblePoints.length === 0 && <div className="snu-no-markings" role="status">No campus markings match “{pinSearch}”. <button type="button" onClick={() => setPinSearch('')}>Clear search</button></div>}
          <div className="snu-map-status-row"><span>{osmBuildingsStatus}</span><button type="button" onClick={() => setBuildingRefresh((token) => token + 1)}>Refresh map data</button></div>
          {gpsStatus && <p className="snu-gps-status" role="status">{gpsStatus}</p>}
          <div className="snu-map-footnote"><MapPin size={14} /> Pin positions are estimates from the supplied notes. Cyan outlines are OpenStreetMap building footprints; coverage varies.</div>
        </section>

        <aside className="snu-info-card">
          <div className="snu-tabs" role="tablist" aria-label="Campus information">
            <button type="button" role="tab" aria-selected={activeTab === 'map'} className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}><Building2 size={15} /> Map</button>
            <button type="button" role="tab" aria-selected={activeTab === 'overview'} className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><BookOpen size={15} /> Campus info</button>
            <button type="button" role="tab" aria-selected={activeTab === 'food'} className={activeTab === 'food' ? 'active' : ''} onClick={() => setActiveTab('food')}><Utensils size={15} /> Food</button>
          </div>

          {activeTab === 'map' ? (
            <div className="snu-info-scroll">
              <div className="snu-selected-place">
                <span className="snu-category-pill" style={{ '--pin-color': categoryColors[selected.category] }}>{selected.category}</span>
                <h3>{selected.name}</h3>
                <p>{selected.detail}</p>
                <div className="snu-route-planner">
                  <label htmlFor="route-origin">Start from</label>
                  <select id="route-origin" value={originId} onChange={(event) => { setOriginId(event.target.value); setRoute(null); setRouteError(''); }}>
                    <option value="my-location">My current location (GPS)</option>
                    {FEATURE_POINTS.filter((point) => point.id !== selected.id).map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
                  </select>
                  <button className="snu-directions" type="button" onClick={showWalkingRoute} disabled={routing}><Navigation size={15} />{routing ? 'Finding walking route…' : 'Show directions here'}</button>
                  <p className="snu-routing-disclosure">Walking route and steps appear on this page. Your chosen start and destination coordinates are sent to the OpenStreetMap based routing service. It follows mapped outdoor paths; indoor routes and campus access restrictions may not be shown.</p>
                  {routeError && <p className="snu-route-error" role="alert">{routeError}</p>}
                  {route && <div className="snu-route-result" role="status">
                    <div className="snu-route-summary"><strong>{route.distanceKm < 1 ? `${Math.round(route.distanceKm * 1000)} m` : `${route.distanceKm.toFixed(1)} km`}</strong><span>about {Math.max(1, Math.round(route.duration / 60))} min on foot</span></div>
                    {route.steps.length ? <ol>{route.steps.map((step, index) => <li key={`${index}-${step.instruction}`}><span>{index + 1}</span><div>{step.instruction}<small>{step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}</small></div></li>)}</ol> : <p>Route shown on the map. The routing service did not return written turns for this short route.</p>}
                  </div>}
                </div>
              </div>

              {selected.id === 'academic' && <div className="snu-floor-section">
                <div className="snu-section-heading"><h3>Academic block notes</h3><span>Provided layout notes · verify on site</span></div>
                <div className="snu-segmented"><button className={block === 'A' ? 'active' : ''} onClick={() => { setBlock('A'); setFloor(0); }}>Block A</button><button className={block === 'B' ? 'active' : ''} onClick={() => { setBlock('B'); setFloor(0); }}>Block B</button></div>
                <div className="snu-floor-list">{FLOOR_NOTES[block].map(([label], index) => <button key={label} className={floor === index ? 'active' : ''} onClick={() => setFloor(index)}>{label}</button>)}</div>
                <div className="snu-floor-detail"><strong>{FLOOR_NOTES[block][floor][0]} floor</strong><p>{FLOOR_NOTES[block][floor][1]}</p></div>
              </div>}

              {selected.id === 'isc' && <div className="snu-facility-box"><h3><Dumbbell size={17} /> Sports facilities</h3><p>SNU lists a 120,000+ sq. ft. Indoor Sports Complex and 571,410+ sq. ft. of outdoor facilities.</p><ul><li>Four badminton courts, two indoor wooden basketball courts, four squash courts, a table-tennis hall, yoga space and indoor running track.</li><li>Outdoor facilities include a full-turf cricket wicket with two turf nets, a soccer field, two volleyball courts and three synthetic basketball courts.</li><li>Your supplied notes also mention billiards, chess, carom, gender-segregated gyms, tennis, a golf course, climbing and equestrian areas; exact provision and locations should be confirmed on campus.</li></ul></div>}

              <div className="snu-location-list"><h3>Campus zones</h3>{visiblePoints.map((point) => <button key={point.id} className={selectedId === point.id ? 'active' : ''} onClick={() => selectFeature(point.id)}><span className="snu-list-dot" style={{ '--pin-color': categoryColors[point.category] }} />{point.name}<span>›</span></button>)}</div>
            </div>
          ) : activeTab === 'food' ? (
            <div className="snu-info-scroll">
              <div className="snu-food-intro"><h3><Coffee size={18} /> Food around campus</h3><p>SNU’s published campus information describes three hostel-cluster dining halls serving three meals daily at an annual fixed rate, plus ten food kiosks, cafés and vending machines for snacks, tea and coffee. It lists vegetarian, non-vegetarian, vegan and special-diet options, filtered drinking water, and daily menus. Specific vendor lists, current menus, exact prices and hours are not connected here.</p><p className="snu-inline-source">Campus food details are summarized from SNU’s published dining information.</p></div>
              {FOOD_SPOTS.map((spot) => {
                const reviews = reviewsBySpot[spot.id] || [];
                const avg = averageRating(reviews);
                const draft = drafts[spot.id] || { stars: 0, note: '' };
                return <article className="snu-food-card" key={spot.id}>
                  <div className="snu-food-card-top"><div><h3>{spot.title}</h3><span>{spot.kind}</span></div><button className="snu-locate-button" onClick={() => { focusFoodSpot(spot.id); setActiveTab('map'); }} title="Show on map"><MapPin size={16} /></button></div>
                  <p>{spot.note}</p>
                  <div className="snu-rating-summary" aria-label={avg ? `${avg.toFixed(1)} average from ${reviews.length} local ratings` : 'No ratings yet'}>
                    {avg ? <><span className="snu-rating-number">{avg.toFixed(1)}</span><span className="snu-stars-display">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span><span>{reviews.length} on this device</span></> : <span>No ratings yet</span>}
                  </div>
                  <div className="snu-rate-form">
                    <span className="snu-rate-label">Rate your visit</span>
                    <div className="snu-star-input" role="radiogroup" aria-label={`Rate ${spot.title}`}>
                      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={draft.stars === value} aria-label={starLabel(value)} className={draft.stars >= value ? 'chosen' : ''} onClick={() => setDrafts((current) => ({ ...current, [spot.id]: { ...draft, stars: value } }))}><Star size={17} fill="currentColor" /></button>)}
                    </div>
                    <textarea maxLength={240} value={draft.note} onChange={(event) => setDrafts((current) => ({ ...current, [spot.id]: { ...draft, note: event.target.value } }))} placeholder="Optional note about your visit" aria-label={`Review note for ${spot.title}`} />
                    <button className="snu-submit-rating" type="button" disabled={!draft.stars} onClick={() => saveReview(spot.id)}>Save rating on this device</button>
                  </div>
                  {reviews.slice(-3).reverse().map((review) => <div className="snu-review" key={review.id}><span>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</span>{review.note && <p>{review.note}</p>}<small>{new Date(review.submittedAt).toLocaleDateString()}</small></div>)}
                </article>;
              })}
              <div className="snu-local-rating-note"><Star size={15} /> Ratings and notes are saved only in this browser. They are not official or shared with other visitors.</div>
              <section className="snu-amenities"><h3><BookOpen size={17} /> Other campus amenities</h3><p>Campus information lists a central library, medical centre, pharmacy, grocery services, bank and ATMs, post office, salon, student recreation centre and campus housing. Exact service locations, contact details and opening hours are not connected here.</p></section>
            </div>
          ) : (
            <div className="snu-info-scroll">
              <section className="snu-overview-intro"><span className="snu-category-pill" style={{ '--pin-color': '#38bdf8' }}>Delhi NCR campus</span><h3>Shiv Nadar University at a glance</h3><p>A 286-acre residential campus in Greater Noida, with academic schools, research facilities, student housing, dining, health services and recreation.</p><small>Overview based on SNU’s published campus and 2026–27 university information.</small></section>
              <div className="snu-campus-stat-grid">
                {[['286 acres', 'campus'], ['5', 'schools'], ['155+', 'labs & studios'], ['7', 'research centers'], ['120,000+ sq. ft.', 'indoor sports'], ['571,410+ sq. ft.', 'outdoor facilities']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
              </div>
              <section className="snu-detail-section"><h3>Schools</h3><div className="snu-detail-chips">{['Engineering', 'Humanities & Social Sciences', 'International College', 'Management & Entrepreneurship', 'Natural Sciences'].map((school) => <span key={school}>{school}</span>)}</div></section>
              <section className="snu-detail-section"><h3>Research centers</h3><p>AI Center of Excellence; Dassault–Shiv Nadar University Center of Excellence; Center for Integrative and Translational Research; Center for Himalayan Studies; Center for Advanced Materials; Atal Incubation Center; Center for Excellence in Epigenetics.</p></section>
              <section className="snu-detail-section"><h3>Health, housing & daily services</h3><ul><li>Residential student hostels are gender-segregated.</li><li>Health Center with residential paramedic staff and visiting doctors; SNU describes a 24-hour campus ambulance.</li><li>Pharmacy is listed inside Blue Circle; campus amenities include grocery, bank/ATMs, post office and salon.</li><li>Central Library and Student Recreation Center.</li><li>Student and staff shuttle service to nearby areas is available with registration.</li><li>Campus safety is managed through a 24-hour security system.</li></ul></section>
              <section className="snu-detail-section"><h3>Auditorium & student life</h3><p>SNU lists a 520-seat auditorium, clubs and societies, student activities, and a residential campus with cafés, dining and recreation. The university also describes campus biodiversity and sustainability initiatives.</p></section>
              <p className="snu-inline-source">These campus facts are displayed here for convenience. Map pins remain estimates supplied for CampusFind, and the Block A/B floor breakdown is labeled as user-provided planning information.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LMarker({ point, selected, onSelect }) {
  return <Marker position={point.position} icon={makeIcon(point.category, selected)} eventHandlers={{ click: onSelect }}>
    <Tooltip permanent direction="top" offset={[0, -34]} className="snu-marker-tooltip">{point.shortLabel}</Tooltip>
    <Popup><strong>{point.name}</strong><br />{point.detail}</Popup>
  </Marker>;
}

