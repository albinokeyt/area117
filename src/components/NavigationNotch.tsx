'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Check, ChevronDown, Clock3, CloudOff, Loader2, Bell, Sparkles, X } from 'lucide-react';
import { workspaceStorage } from '@/lib/workspaceStorage';
import { hasUnsyncedChanges, isBusinessKey } from '@/lib/serverSyncService';

type Activity = { phase: 'idle' | 'saving' | 'saved' | 'error'; message?: string };
interface Props {
  items: { id: string; label: string; icon: LucideIcon }[];
  active: string; onSelect: (id: string) => void; name: string;
  busy: boolean; connected: boolean | null; notice: string | null;
  actions: React.ReactNode;
}

// Presentation-only observer: a successful PostgreSQL acknowledgement is required
// for "Guardado". Neither the clock nor menu interactions write business state.
function useNotchActivity() {
  const [activity, setActivity] = useState<Activity>(() => ({ phase: hasUnsyncedChanges() ? 'saving' : 'idle' }));
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    let savedTimer: ReturnType<typeof setTimeout>;
    const unsubscribe = workspaceStorage.subscribe(key => {
      if (isBusinessKey(key) && hasUnsyncedChanges()) setActivity(previous => previous.phase === 'error' || previous.phase === 'saving' ? previous : { phase: 'saving' });
    });
    const synced = () => {
      clearTimeout(savedTimer);
      if (hasUnsyncedChanges()) { setActivity({ phase: 'saving' }); return; }
      setActivity({ phase: 'saved' });
      savedTimer = setTimeout(() => setActivity(previous => previous.phase === 'saved' ? { phase: 'idle' } : previous), 4500);
    };
    const failed = () => { clearTimeout(savedTimer); setActivity({ phase: 'error', message: 'Los cambios siguen pendientes. Revisa la conexión antes de cerrar la aplicación.' }); };
    const offline = () => setOnline(false);
    const reconnected = () => setOnline(true);
    window.addEventListener('efi_server_sync_event', synced);
    window.addEventListener('efi_sync_error', failed);
    window.addEventListener('offline', offline);
    window.addEventListener('online', reconnected);
    return () => {
      unsubscribe(); clearTimeout(savedTimer);
      window.removeEventListener('efi_server_sync_event', synced); window.removeEventListener('efi_sync_error', failed);
      window.removeEventListener('offline', offline); window.removeEventListener('online', reconnected);
    };
  }, []);
  return { activity, online };
}

export function NavigationNotch({ items, active, onSelect, name, busy, connected, notice, actions }: Props) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('');
  const [greet, setGreet] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pinned = useRef(false);
  const focusMenu = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const { activity, online } = useNotchActivity();
  const current = items.find(item => item.id === active) || items[0];
  const clearHover = useCallback(() => { clearTimeout(hoverTimer.current); clearTimeout(leaveTimer.current); }, []);
  const close = useCallback((restoreFocus = false) => { clearHover(); pinned.current = false; setOpen(false); if (restoreFocus) trigger.current?.focus({ preventScroll: true }); }, [clearHover]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    tick(); const clock = setInterval(tick, 1000); const hello = setInterval(() => setGreet(previous => !previous), 14000);
    return () => { clearInterval(clock); clearInterval(hello); clearTimeout(hoverTimer.current); clearTimeout(leaveTimer.current); };
  }, []);
  useEffect(() => {
    if (!open) return;
    if (focusMenu.current) { root.current?.querySelector<HTMLButtonElement>('nav [aria-current="page"]')?.focus(); focusMenu.current = false; }
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(true); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open, close]);

  let phase = 'idle', label = greet ? `Hola, ${name || 'equipo'}` : 'Todo al día';
  let StatusIcon = Sparkles;
  if (notice) { phase = 'notice'; label = notice; StatusIcon = Bell; }
  if (activity.phase === 'saved') { phase = 'saved'; label = 'Guardado en PostgreSQL'; StatusIcon = Check; }
  if (activity.phase === 'saving' || busy) { phase = 'saving'; label = busy ? 'Sincronizando datos' : 'Guardando cambios'; StatusIcon = Loader2; }
  if (!online || connected === false || activity.phase === 'error') { phase = 'error'; label = activity.phase === 'error' ? 'Guardado pendiente' : 'Sin conexión'; StatusIcon = CloudOff; }

  return <div ref={root} className={`efi-notch print:hidden ${open ? 'is-open' : ''}`} data-phase={phase}
    onPointerEnter={event => { clearTimeout(leaveTimer.current); if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) hoverTimer.current = setTimeout(() => setOpen(true), 180); }}
    onPointerLeave={() => { clearTimeout(hoverTimer.current); if (!pinned.current) leaveTimer.current = setTimeout(() => close(), 280); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <div className="notch-rim" aria-hidden="true" />
    <button ref={trigger} type="button" className="notch-trigger" aria-label="Navegación AREA117" aria-expanded={open} aria-controls="area117-navigation"
      onClick={event => { clearHover(); if (open && pinned.current) close(); else { pinned.current = true; focusMenu.current = event.detail === 0; if (open && focusMenu.current) { root.current?.querySelector<HTMLButtonElement>('nav [aria-current="page"]')?.focus(); focusMenu.current = false; } setOpen(true); } }}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); pinned.current = true; focusMenu.current = true; if (open) root.current?.querySelector<HTMLButtonElement>('nav [aria-current="page"]')?.focus(); else setOpen(true); } }}>
      <span className="notch-monogram"><img src="/logo_area117.png" width="30" height="25" alt="" /></span>
      <span className="notch-trigger-copy"><span className="notch-current">{current.label}</span><span key={label} className="notch-live-message" role="status"><StatusIcon size={11} className={phase === 'saving' ? 'notch-spinner' : ''} />{label}</span></span>
      <span className="notch-clock"><Clock3 size={11} /><time>{time || '—:—'}</time></span>
      <span className="notch-toggle-icon">{open ? <X size={14} /> : <ChevronDown size={14} />}</span>
    </button>
    <div className="notch-disclosure" aria-hidden={!open} ref={node => { if (node) node.inert = !open; }}>
      <div className="notch-disclosure-clip">
        <div className="notch-panel">
          <div className="notch-panel-heading"><span>ELIGE TU PRÓXIMO DESTINO</span><span>AREA117 <span>↗</span></span></div>
          <nav id="area117-navigation" aria-label="Navegación principal" className="notch-navigation">
            {items.map(({ id, label: title, icon: Icon }, index) => <button key={id} type="button" aria-label={title} tabIndex={open ? 0 : -1} aria-current={id === active ? 'page' : undefined} className={id === active ? 'is-active' : ''} style={{ '--notch-order': index } as React.CSSProperties}
              onClick={() => { onSelect(id); close(true); }}>
              <span className="notch-section-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{id === active ? 'Estás aquí' : 'Abrir sección'}</small></span><ArrowUpRight size={14} className="notch-section-arrow" />
            </button>)}
          </nav>
          {phase === 'error' && <p className="notch-warning">{activity.message || 'La conexión no está disponible. Los cambios pendientes no se mostrarán como guardados.'}</p>}
          <div className="notch-footer"><span className={`notch-footer-state ${phase}`}><StatusIcon size={12} className={phase === 'saving' ? 'notch-spinner' : ''} />{label}</span><div className="efi-notch-actions" onClick={() => close()}>{actions}</div></div>
        </div>
      </div>
    </div>
  </div>;
}
