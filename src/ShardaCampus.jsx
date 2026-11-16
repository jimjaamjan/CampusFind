import { useMemo, useState } from 'react';
import { BookOpen, Building2, ChevronDown, Coffee, Layers3, MapPin, Utensils } from 'lucide-react';
import CampusMap from './Campusmap.jsx';

const BLOCKS = [
  {
    id: '1', title: 'Block 1 · Engineering',
    mapLabel: 'Block 01', position: [28.47480, 77.48250],
    departments: ['Computer Science & Engineering', 'Computer Science & Applications', 'Civil Engineering', 'Mechanical Engineering', 'Electrical, Electronics & Communication Engineering', 'Biotechnology'],
    facilities: ['Engineering academic block'],
    floors: null
  },
  {
    id: '2', title: 'Block 2 · Design & Architecture',
    mapLabel: 'Block 02', position: [28.47495, 77.48270],
    departments: ['Architecture', 'Art & Design', 'Design-related academic facilities'],
    facilities: ['Design and architecture academic spaces'],
    floors: null
  },
  {
    id: '3', title: 'Block 3 · Basic Sciences & Media',
    mapLabel: 'Block 03', position: [28.47450, 77.48290],
    departments: ['Chemistry and Biochemistry', 'Physics', 'Mathematics', 'Environmental Sciences', 'Life Sciences', 'Mass Communication'],
    facilities: ['Listed building has 6 floors'],
    floors: 6
  },
  {
    id: '4', title: 'Block 4 · Health & Other Sciences',
    mapLabel: 'Block 04', position: [28.47430, 77.48260],
    departments: ['Nursing Sciences', 'Pharmacy', 'Education', 'Allied Health Sciences', 'Agricultural Sciences'],
    facilities: ['Health and other sciences academic block'],
    floors: 9
  },
  {
    id: '7', title: 'Block 7 · Business, Law & Humanities',
    mapLabel: 'Block 07', position: [28.47410, 77.48240],
    departments: ['BBA and MBA', 'B.Com and M.Com', 'Business Studies', 'Law', 'Humanities and Social Sciences'],
    facilities: ['Business, law and humanities academic block'],
    floors: 9
  },
  {
    id: '21', title: 'Block 21 · Dental Sciences',
    departments: ['BDS', 'Dental Sciences'],
    facilities: ['Dental clinical and academic facilities'],
    floors: null
  },
  {
    id: '22', title: 'Block 22 · Medical Sciences',
    departments: ['Medical Sciences'],
    facilities: ['Medical Education Unit', 'Medical academic facilities'],
    floors: null
  },
  {
    id: '45', title: 'Block 45 · University Events',
    departments: [],
    facilities: ['Anand Swaroop Auditorium', 'Conference facilities', 'CDOE facilities', 'University events and ceremonies'],
    floors: null
  }
];

const CAMPUS_POINTS = [
  { id: 'gate-1', group: 'access', name: 'Gate 1 · Main Entrance', mapLabel: 'Gate 1', position: [28.4727, 77.4812], description: 'Primary frontage gate along Knowledge Park III road.' },
  { id: 'gates-2-3', group: 'access', name: 'Gates 2 & 3', mapLabel: 'Gates 2–3', position: [28.4716, 77.4815], description: 'Access points for Sharda Hospital and Emergency Casualty.' },
  { id: 'gate-4', group: 'access', name: 'Gate 4 · North Gate', mapLabel: 'Gate 4', position: [28.4746, 77.4831], description: 'Direct entry to residential hostels and student parking.' },
  { id: 'admin-wing', group: 'access', name: 'Central Administrative Wing', mapLabel: 'Admin Wing', position: [28.4731, 77.4838], description: 'Chancellor and Vice-Chancellor Secretariat, Registrar, and Admissions.' },

  { id: 'block-1-library', group: 'academic', name: 'Block 1 & Central Library', mapLabel: 'B1 + Library', position: [28.4730, 77.4824], description: 'Central University Library, reading halls, and foundational classrooms.' },
  { id: 'block-2-humanities', group: 'academic', name: 'Block 2 · Humanities & Languages', mapLabel: 'B2 Humanities', position: [28.4736, 77.4836], description: 'School of Humanities and Social Sciences (SHSS) and language labs.' },
  { id: 'blocks-3-4-engineering', group: 'academic', name: 'Blocks 3 & 4 · Engineering Core', mapLabel: 'B3–4 Engineering', position: [28.4733, 77.4842], description: 'School of Engineering & Technology, including Mechanical, Civil, and Electrical labs.' },
  { id: 'block-5-law', group: 'academic', name: 'Block 5 · School of Law', mapLabel: 'B5 Law', position: [28.4726, 77.4846], description: 'School of Law, Moot Court Hall, and Legal Aid Clinic.' },
  { id: 'blocks-10-11-media', group: 'academic', name: 'Blocks 10 & 11 · Media & Design', mapLabel: 'B10–11 Media', position: [28.4738, 77.4828], description: 'School of Media, Film & Entertainment (SMFE), TV and radio studios, and design facilities.' },
  { id: 'blocks-14-15-biotech', group: 'academic', name: 'Blocks 14 & 15 · Biotech & Pharmacy', mapLabel: 'B14–15 Bio', position: [28.4734, 77.4819], description: 'School of Pharmacy, bioscience and technology labs, and research centers.' },
  { id: 'business-studies', group: 'academic', name: 'School of Business Studies', mapLabel: 'Business', position: [28.4729, 77.4833], description: 'MBA/BBA auditoriums, case-study lecture theaters, and finance labs.' },
  { id: 'dental-sciences', group: 'academic', name: 'School of Dental Sciences', mapLabel: 'Dental', position: [28.4721, 77.4827], description: 'Dental OPD, oral pathology, and surgery labs.' },

  { id: 'sharda-hospital', group: 'health', name: 'Sharda Hospital · Main Wing', mapLabel: 'Hospital', position: [28.4715, 77.4825], description: 'Super-specialty hospital with in-patient wards and ICUs; the supplied campus information describes it as having 1,200+ beds.' },
  { id: 'trauma-emergency', group: 'health', name: 'Trauma, Emergency & Casualty', mapLabel: 'Emergency', position: [28.4718, 77.4831], description: 'Emergency response and ambulance triage bay; the supplied information lists 24/7 service.' },
  { id: 'medical-sciences', group: 'health', name: 'School of Medical Sciences & Research', mapLabel: 'Medical Sciences', position: [28.4717, 77.4837], description: 'MBBS lecture halls, anatomy museum, and pathology labs.' },

  { id: 'vardhman-hostel', group: 'hostels', name: 'Vardhman Hostel', mapLabel: 'Vardhman', position: [28.4743, 77.4846], description: "Boys' multi-story residential block." },
  { id: 'tagore-hostel', group: 'hostels', name: 'Tagore Hostel', mapLabel: 'Tagore', position: [28.4739, 77.4852], description: "Boys' residential block with study lounges." },
  { id: 'mandela-sarojini-hostels', group: 'hostels', name: 'Mandela & Sarojini Hostels', mapLabel: 'Mandela · Sarojini', position: [28.4744, 77.4855], description: "Girls' residential wings with dedicated dining facilities." },
  { id: 'kasturba-mother-teresa-hostels', group: 'hostels', name: 'Kasturba & Mother Teresa Hostels', mapLabel: 'Kasturba · M. Teresa', position: [28.4740, 77.4858], description: 'Air-conditioned residential blocks for senior and international students.' },

  { id: 'lego-food-court', group: 'food', name: 'Lego House & Central Food Court', mapLabel: 'Food Court', position: [28.4742, 77.4835], description: 'Primary commercial food court. Supplied listings include Sagar Ratna, Bikano, and fast-food counters.' },
  { id: 'amul-cafe-arcade', group: 'food', name: 'Amul Parlour & Cafe Arcade', mapLabel: 'Cafe Arcade', position: [28.4741, 77.4841], description: 'Milk bar, ice creams, Cafe Coffee Day, and Nescafe kiosks.' },
  { id: 'central-mess', group: 'food', name: 'Central Mess / Dining Halls', mapLabel: 'Central Mess', position: [28.4738, 77.4848], description: 'Daily breakfast, lunch, and dinner hub for hostel residents.' },

  { id: 'main-sports-ground', group: 'sports', name: 'Main Sports Ground', mapLabel: 'Sports Ground', position: [28.4729, 77.4859], description: 'Full-sized athletic track, cricket pitch, and football arena.' },
  { id: 'indoor-sports-gym', group: 'sports', name: 'Indoor Sports Complex & Gym', mapLabel: 'Indoor Sports', position: [28.4732, 77.4851], description: 'Fitness gym, indoor badminton and squash courts, and table tennis.' },
  { id: 'outdoor-courts', group: 'sports', name: 'Outdoor Synthetic Courts', mapLabel: 'Outdoor Courts', position: [28.4722, 77.4855], description: 'Floodlit basketball, volleyball, and tennis courts.' }
];

const FOOD_GUIDE = [
  { craving: 'Coffee', place: 'More Than Cafe', suggestion: 'Cold coffee' },
  { craving: 'Snacks', place: "Uncle's Cafe", suggestion: 'Fries' },
  { craving: 'Shakes', place: 'Shiva Juice Corner', suggestion: 'Oreo shake' },
  { craving: 'Pizza', place: 'Italian Pizza', suggestion: 'Pizza' },
  { craving: 'South Indian', place: "Mother's Kitchen", suggestion: 'Ask for dosa' }
];

const DIRECTORY_TABS = [
  { id: 'blocks', label: 'Blocks' },
  { id: 'access', label: 'Gates & admin' },
  { id: 'academic', label: 'Academic sites' },
  { id: 'health', label: 'Health' },
  { id: 'hostels', label: 'Hostels' },
  { id: 'food', label: 'Food' },
  { id: 'sports', label: 'Sports' }
];

function CampusPointCard({ point, expanded, onToggle }) {
  return <article className={`sharda-block-card${expanded ? ' expanded' : ''}`}>
    <button className="sharda-block-toggle" type="button" aria-expanded={expanded} onClick={onToggle}>
      <span className="sharda-block-number"><MapPin size={15} /></span>
      <span className="sharda-block-title">{point.name}</span>
      <ChevronDown className={expanded ? 'rotated' : ''} size={17} />
    </button>
    {expanded && <div className="sharda-block-details">
      <h3>Campus information</h3>
      <p className="sharda-point-description">{point.description}</p>
      <p className="sharda-floor-note">Estimated coordinates: {point.position[0].toFixed(4)}° N, {point.position[1].toFixed(4)}° E. Tap the card to focus this map pin.</p>
    </div>}
  </article>;
}

export default function ShardaCampus({ campus, buildings, onBuildingsChange, refreshToken }) {
  const [expandedBlock, setExpandedBlock] = useState('1');
  const [expandedPoint, setExpandedPoint] = useState('gate-1');
  const [directoryTab, setDirectoryTab] = useState('blocks');
  const [focusMarker, setFocusMarker] = useState(BLOCKS.find((block) => block.id === '1')?.position || null);
  const mapMarkers = useMemo(() => [
    ...BLOCKS.filter((block) => block.position).map((block) => ({
      id: `legacy-${block.id}`,
      name: block.mapLabel,
      position: block.position,
      details: [...block.departments, ...block.facilities].join(' · ')
    })),
    ...CAMPUS_POINTS.map((point) => ({
      id: point.id,
      name: point.mapLabel,
      position: point.position,
      details: point.description
    }))
  ], []);

  const focusPoint = (point) => {
    setExpandedPoint(point.id);
    setFocusMarker(point.position);
  };

  const directoryPoints = CAMPUS_POINTS.filter((point) => point.group === directoryTab);

  return <div className="sharda-campus-layout">
    <section className="sharda-map-shell" aria-label="Sharda University street map">
      <CampusMap campus={campus} buildings={buildings} onBuildingsChange={onBuildingsChange} refreshToken={refreshToken} markers={mapMarkers} focusMarker={focusMarker} />
    </section>

    <aside className="sharda-directory" aria-label="Sharda University campus directory">
      <header className="sharda-directory-header">
        <p><BookOpen size={14} /> IN-APP CAMPUS DIRECTORY</p>
        <h2>Campus directory</h2>
        <span>Academic blocks, campus facilities, entrances, and food spots.</span>
      </header>
      <nav className="sharda-directory-tabs" aria-label="Campus directory sections">
        {DIRECTORY_TABS.map((tab) => <button key={tab.id} type="button" className={directoryTab === tab.id ? 'active' : ''} aria-pressed={directoryTab === tab.id} onClick={() => setDirectoryTab(tab.id)}>
          {tab.id === 'food' ? <Utensils size={14} /> : tab.id === 'blocks' || tab.id === 'academic' ? <Building2 size={14} /> : <MapPin size={14} />}
          {tab.label}
        </button>)}
      </nav>

      {directoryTab === 'blocks' ? <div className="sharda-block-list">
        {BLOCKS.map((block) => {
          const expanded = expandedBlock === block.id;
          return <article className={`sharda-block-card${expanded ? ' expanded' : ''}`} key={block.id}>
            <button className="sharda-block-toggle" type="button" aria-expanded={expanded} onClick={() => {
              setExpandedBlock(expanded ? '' : block.id);
              if (!expanded && block.position) setFocusMarker(block.position);
            }}>
              <span className="sharda-block-number"><Building2 size={17} />{block.id}</span>
              <span className="sharda-block-title">{block.title}</span>
              <ChevronDown className={expanded ? 'rotated' : ''} size={17} />
            </button>
            {expanded && <div className="sharda-block-details">
              {block.departments.length > 0 && <><h3>Departments & schools</h3><ul>{block.departments.map((department) => <li key={department}>{department}</li>)}</ul></>}
              <h3><Layers3 size={15} /> Facilities & building notes</h3>
              <ul>{block.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul>
              {block.floors && <p className="sharda-floor-note">{block.floors} listed building floors. Floor-by-floor room locations were not included in the supplied information.</p>}
              {!block.position && <p className="sharda-floor-note">No estimated map coordinate was supplied for this block.</p>}
            </div>}
          </article>;
        })}
      </div> : directoryTab === 'food' ? <div className="sharda-food-list">
        <div className="sharda-food-intro"><Coffee size={17} /><p>Food locations and menu notes are based on supplied campus information and are not live-verified. Availability can change.</p></div>
        {directoryPoints.map((point) => <CampusPointCard key={point.id} point={point} expanded={expandedPoint === point.id} onToggle={() => focusPoint(point)} />)}
        {FOOD_GUIDE.map((item) => <article className="sharda-food-card" key={item.place}>
          <span>{item.craving}</span><h3>{item.place}</h3><p>{item.suggestion}</p>
        </article>)}
      </div> : <div className="sharda-block-list">
        {directoryPoints.map((point) => <CampusPointCard key={point.id} point={point} expanded={expandedPoint === point.id} onToggle={() => focusPoint(point)} />)}
      </div>}

      <p className="sharda-directory-note">All newly added coordinates are estimates from the supplied information. The earlier Block 01–07 pins remain in the Blocks tab; some later block-group labels differ, so verify the block numbering and pin locations with Sharda before treating either set as official. Street tiles and building footprints come from OpenStreetMap.</p>
    </aside>
  </div>;
}
