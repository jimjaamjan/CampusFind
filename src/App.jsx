import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import CampusMap from './Campusmap.jsx';
import CampusSelection from './CampusSelection.jsx';
import ShivNadarCampus from './ShivNadarCampus.jsx';
import GalgotiasCampus from './GalgotiasCampus.jsx';
import BennettCampus from './BennettCampus.jsx';
import AmityCampus from './AmityCampus.jsx';
import ShardaCampus from './ShardaCampus.jsx';

const CAMPUS_OPTIONS = [
  { id: 'amity-noida', name: 'Amity University Noida', city: 'Sector 125, Noida, Uttar Pradesh', center: [28.5445, 77.3330], address: 'Amity University Noida, Sector 125, Noida, Uttar Pradesh, India' },
  { id: 'bennett', name: 'Bennett University', city: 'TechZone II, Greater Noida, Uttar Pradesh', center: [28.45064, 77.5838], address: 'Bennett University, TechZone II, Greater Noida, Uttar Pradesh, India', sourceUrl: 'https://www.bennett.edu.in/contact-us/' },
  { id: 'sharda', name: 'Sharda University', city: 'Knowledge Park III, Greater Noida, Uttar Pradesh', center: [28.4725, 77.4821], address: 'Sharda University, Knowledge Park III, Greater Noida, Uttar Pradesh, India', sourceUrl: 'https://www.sharda.ac.in/campuslife/infrastructure' },
  { id: 'galgotias', name: 'Galgotias University', city: 'Sector 17A, Greater Noida, Uttar Pradesh', center: [28.36715, 77.54208], address: 'Galgotias University, Plot 2, Sector 17A, Yamuna Expressway, Greater Noida, Uttar Pradesh, India', sourceUrl: 'https://www.galgotiasuniversity.edu.in/p/contact-us' },
  { id: 'shiv-nadar', name: 'Shiv Nadar University (Dadri)', city: 'Dadri, Gautam Buddha Nagar, Uttar Pradesh', center: [28.5258, 77.5732], address: 'Shiv Nadar University, NH 91, Dadri, Gautam Buddha Nagar, Uttar Pradesh, India', sourceUrl: 'https://snu.edu.in/admissions/faqs/' }
];

export default function App() {
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const handleBuildingsChange = useCallback((nextBuildings) => {
    setBuildings(nextBuildings);
  }, []);

  const selectCampus = (campus) => {
    setBuildings([]);
    setSelectedCampus(campus);
  };

  if (!selectedCampus) return <CampusSelection campuses={CAMPUS_OPTIONS} onSelect={selectCampus} />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 font-black text-slate-950">CF</div>
            <div className="min-w-0"><h1 className="truncate text-lg font-extrabold text-white">CampusFind</h1><p className="hidden truncate text-xs text-slate-400 sm:block">{selectedCampus.name}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {!['shiv-nadar', 'galgotias', 'bennett', 'amity-noida'].includes(selectedCampus.id) && <><span className="hidden text-xs text-slate-400 sm:inline">{buildings.length} mapped building{buildings.length === 1 ? '' : 's'}</span><button type="button" onClick={() => setRefreshToken((token) => token + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-amber-400 hover:text-amber-200" aria-label="Refresh campus buildings"><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Refresh buildings</span></button></>}
            <button type="button" onClick={() => setSelectedCampus(null)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-400 hover:text-amber-200">Change campus</button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-3 sm:p-5">
        <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          {selectedCampus.id === 'shiv-nadar' ? <ShivNadarCampus /> : selectedCampus.id === 'galgotias' ? <GalgotiasCampus /> : selectedCampus.id === 'bennett' ? <BennettCampus /> : selectedCampus.id === 'amity-noida' ? <AmityCampus /> : selectedCampus.id === 'sharda' ? <ShardaCampus
            campus={selectedCampus}
            buildings={buildings}
            onBuildingsChange={handleBuildingsChange}
            refreshToken={refreshToken}
          /> : <CampusMap
            key={selectedCampus.id}
            campus={selectedCampus}
            buildings={buildings}
            onBuildingsChange={handleBuildingsChange}
            refreshToken={refreshToken}
          />}
        </section>
      </main>
    </div>
  );
}

