'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Palette } from 'lucide-react';

export function ThemeSwitcher() {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState('crystal');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setBusy(true);
    void fetch('/api/preferences', { cache: 'no-store', signal: abort.signal }).then(async res => {
      if (!res.ok) throw new Error('No se pudo leer el tema.');
      const data = await res.json();
      if (!abort.signal.aborted) { setTheme(data.theme); document.documentElement.dataset.efiTheme = data.theme; }
    }).catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setBusy(false); });
    return () => { abort.abort(); delete document.documentElement.dataset.efiTheme; };
  }, [currentUser?.id]);

  const changeTheme = async (value: string) => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: value }) });
      if (!res.ok) throw new Error('No se pudo guardar el tema. Vuelve a intentarlo.');
      setTheme(value); document.documentElement.dataset.efiTheme = value;
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };
  return <div className="efi-theme-control">
    <label className="efi-theme-picker" title="Tema visual guardado en tu cuenta"><Palette size={14} /><select aria-label="Tema visual" value={theme} disabled={busy} onChange={e => void changeTheme(e.target.value)}>
      <option value="crystal">Cristal</option><option value="dark">Oscuro</option><option value="cream">Crema</option>
    </select></label>
    {error && <span role="alert" className="efi-theme-error">{error}</span>}
  </div>;
}
