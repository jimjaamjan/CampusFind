import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, MapPin } from 'lucide-react';

export default function AuthPanel({ supabase, campus, onBack }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim().toLowerCase(), display_name: displayName.trim() },
            emailRedirectTo: window.location.origin
          }
        });
        if (authError) throw authError;
        setMessage(data.session
          ? 'Your account is ready. You can now choose who sees your location.'
          : 'Check your email to confirm the account, then sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onBack} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Change campus
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-slate-950"><MapPin className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black text-white">CampusFind</h1>
            <p className="text-xs text-slate-400">{campus.name}</p>
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-white">{mode === 'signin' ? 'Sign in to your circle' : 'Create your account'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Connect with people you know. Your live location stays off until you turn sharing on.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'signup' && <>
            <label className="block text-xs font-bold text-slate-300">Display name
              <input required minLength={1} maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400" />
            </label>
            <label className="block text-xs font-bold text-slate-300">Username
              <input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" title="Use letters, numbers, and underscores." value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400" />
            </label>
          </>}
          <label className="block text-xs font-bold text-slate-300">Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400" />
          </label>
          <label className="block text-xs font-bold text-slate-300">Password
            <span className="relative mt-1.5 block">
              <input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 pr-12 text-sm text-white outline-none focus:border-amber-400" />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </span>
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/60 p-3 text-sm text-emerald-200">{message}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
            <LockKeyhole className="h-4 w-4" /> {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {mode === 'signin' ? 'New to CampusFind?' : 'Already have an account?'}{' '}
          <button type="button" onClick={() => { setMode((value) => value === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }} className="font-bold text-amber-300 hover:text-amber-200">
            {mode === 'signin' ? 'Create account' : 'Sign in'}
          </button>
        </p>
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Location sharing is opt-in and only visible to accepted friends while your share is active.</p>
      </section>
    </main>
  );
}

