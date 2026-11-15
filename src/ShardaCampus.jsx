import { useMemo, useState } from 'react';
import { BookOpen, Building2, ChevronDown, Coffee, Layers3, Utensils } from 'lucide-react';
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

const FOOD_GUIDE = [
  { craving: 'Coffee', place: 'More Than Cafe', suggestion: 'Cold coffee' },
  { craving: 'Snacks', place: "Uncle's Cafe", suggestion: 'Fries' },
  { craving: 'Shakes', place: 'Shiva Juice Corner', suggestion: 'Oreo shake' },
  { craving: 'Pizza', place: 'Italian Pizza', suggestion: 'Pizza' },
  { craving: 'South Indian', place: "Mother's Kitchen", suggestion: 'Ask for dosa' }
];

export default function ShardaCampus({ campus, buildings, onBuildingsChange, refreshToken }) {
  const [expandedBlock, setExpandedBlock] = useState('1');
  const [directoryTab, setDirectoryTab] = useState('blocks');
  const [focusMarker, setFocusMarker] = useState(BLOCKS.find((block) => block.id === '1')?.position || null);
  const mapMarkers = useMemo(() => BLOCKS.filter((block) => block.position).map((block) => ({
    id: block.id,
    name: block.mapLabel,
    position: block.position,
    details: [...block.departments, ...block.facilities].join(' · ')
  })), []);

  return <div className="sharda-campus-layout">
    <section className="sharda-map-shell" aria-label="Sharda University street map">
      <CampusMap campus={campus} buildings={buildings} onBuildingsChange={onBuildingsChange} refreshToken={refreshToken} markers={mapMarkers} focusMarker={focusMarker} />
    </section>

    <aside className="sharda-directory" aria-label="Sharda University academic blocks">
      <header className="sharda-directory-header">
        <p><BookOpen size={14} /> IN-APP CAMPUS DIRECTORY</p>
        <h2>Campus directory</h2>
        <span>Academic blocks, campus facilities, and a quick food guide.</span>
      </header>
      <nav className="sharda-directory-tabs" aria-label="Campus directory sections">
        <button type="button" className={directoryTab === 'blocks' ? 'active' : ''} onClick={() => setDirectoryTab('blocks')}><Building2 size={14} /> Blocks</button>
        <button type="button" className={directoryTab === 'food' ? 'active' : ''} onClick={() => setDirectoryTab('food')}><Utensils size={14} /> Food guide</button>
      </nav>
      {directoryTab === 'blocks' ? <div className="sharda-block-list">
        {BLOCKS.map((block) => {
          const expanded = expandedBlock === block.id;
          return <article className={`sharda-block-card${expanded ? ' expanded' : ''}`} key={block.id}>
            <button className="sharda-block-toggle" type="button" aria-expanded={expanded} onClick={() => { setExpandedBlock(expanded ? '' : block.id); if (!expanded && block.position) setFocusMarker(block.position); }}>
              <span className="sharda-block-number"><Building2 size={17} />{block.id}</span>
              <span className="sharda-block-title">{block.title}</span>
              <ChevronDown className={expanded ? 'rotated' : ''} size={17} />
            </button>
            {expanded && <div className="sharda-block-details">
              {block.departments.length > 0 && <><h3>Departments & schools</h3><ul>{block.departments.map((department) => <li key={department}>{department}</li>)}</ul></>}
              <h3><Layers3 size={15} /> Facilities & building notes</h3>
              <ul>{block.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul>
              {block.floors && <p className="sharda-floor-note">{block.floors} listed building floors. Floor-by-floor room locations were not included in the supplied information.</p>}
            </div>}
          </article>;
        })}
      </div> : <div className="sharda-food-list">
        <div className="sharda-food-intro"><Coffee size={17} /><p>Quick picks from the food notes you supplied. Menu items and venue availability are not live-verified.</p></div>
        {FOOD_GUIDE.map((item) => <article className="sharda-food-card" key={item.place}>
          <span>{item.craving}</span><h3>{item.place}</h3><p>{item.suggestion}</p>
        </article>)}
      </div>}
      <p className="sharda-directory-note">Blocks 01, 02, 03, 04 and 07 use the coordinates supplied for their map pins. Other block cards and food suggestions have no supplied coordinates and remain unpinned. Street tiles and building footprints come from OpenStreetMap.</p>
    </aside>
  </div>;
}

