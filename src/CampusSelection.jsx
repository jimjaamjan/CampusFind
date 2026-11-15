import { ChevronDown, MapPin } from 'lucide-react';

export default function CampusSelection({ campuses, onSelect }) {
  const handleCampusChange = (event) => {
    const campus = campuses.find((option) => option.id === event.target.value);
    if (campus) onSelect(campus);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-10">
        <a href="#top" className="flex items-center gap-3 font-extrabold text-white no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-lg text-slate-950">CF</span>
          <span>CampusFind</span>
        </a>
        <span className="hidden rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 sm:inline-flex">Campus access</span>
      </header>

      <section id="top" className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col items-start justify-center px-5 py-16 sm:px-10 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-1/4 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-amber-300">
          <MapPin className="h-3.5 w-3.5" /> Campus Guide
        </p>
        <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Find your way around <span className="text-amber-400">campus.</span>
        </h1>
        <div className="mt-9 w-full max-w-xl">
          <label htmlFor="campus-select" className="mb-2 block text-sm font-bold text-slate-200">Select Your Campus</label>
          <div className="relative">
            <MapPin aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-amber-300" />
            <select
              id="campus-select"
              defaultValue=""
              onChange={handleCampusChange}
              className="w-full appearance-none rounded-xl border border-amber-500/70 bg-slate-900 py-4 pl-12 pr-12 text-base font-bold text-white shadow-lg shadow-amber-400/10 transition hover:border-amber-300 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
            >
              <option value="" disabled>Select Your Campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id} className="bg-slate-900 text-white">
                  {campus.name} — {campus.city}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
          <p className="mt-3 text-xs text-slate-500">{campuses.length} campuses available. Choose one to open its street map.</p>
        </div>

        <p className="mt-12 max-w-3xl text-xs leading-5 text-slate-500">
          Street tiles and mapped building footprints come from OpenStreetMap, and map coverage can vary by campus.
        </p>
      </section>
    </main>
  );
}

