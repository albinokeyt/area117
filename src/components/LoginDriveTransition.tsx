'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, RotateCw } from 'lucide-react';
import { FuelStationScene } from './FuelStationScene';

const noop = () => {};

/** Runs only after a submitted login succeeds. Data hydration runs concurrently;
 *  the cinematic never substitutes for the server's readiness or error result. */
export function LoginDriveTransition({ ready, error, onReveal, onComplete }: { ready: boolean; error: string; onReveal: () => void; onComplete: () => void }) {
  const [motionDone, setMotionDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(prefersReduced);
    root.current?.focus({ preventScroll: true });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => setMotionDone(true), prefersReduced ? 100 : 3000);
    return () => { clearTimeout(timer); document.body.style.overflow = oldOverflow; };
  }, []);

  useEffect(() => {
    if (!motionDone || !ready || error) { setLeaving(false); return; }
    setLeaving(true);
    onReveal();
    const timer = setTimeout(onComplete, reduced ? 150 : 500);
    return () => clearTimeout(timer);
  }, [motionDone, ready, error, reduced, onReveal, onComplete]);

  return <section ref={root} tabIndex={-1} role="region" aria-label="Transición de acceso" aria-busy={!ready && !error}
    className={`login-drive ${leaving ? 'is-leaving' : ''} ${motionDone ? 'has-arrived' : ''}`}>
    <div className="drive-ambient" aria-hidden="true" />
    <div className="drive-brand"><img src="/logo_area117.png" width="46" height="39" alt="AREA117" /><span>CONTIGO EN LA CARRETERA</span><ArrowUpRight size={17} /></div>
    <div className="drive-road" aria-hidden="true"><i /><i /><i /></div>
    <div className="drive-scene" aria-hidden="true"><FuelStationScene connected departing onConnect={noop} /></div>
    <div className="drive-flare" aria-hidden="true" />
    <div className="drive-copy">
      <span className="drive-eyebrow">ACCESO CONFIRMADO</span>
      <h1>Tu próxima ruta<br /><em>empieza aquí.</em></h1>
      <p role="status">{error ? 'No se pudieron cargar los datos.' : motionDone && !ready ? 'Cargando datos de PostgreSQL…' : leaving ? 'Todo listo. Vamos allá.' : 'Preparando tu estación de trabajo…'}</p>
      {error ? <div className="drive-error"><p role="alert">{error}</p><button type="button" onClick={() => window.location.reload()}><RotateCw size={15} />Reintentar conexión</button></div> : <div className="drive-indicator" aria-hidden="true">{motionDone && !ready ? <Loader2 size={17} className="animate-spin" /> : <span />}</div>}
    </div>
    <span className="drive-footer">AREA117 <span> / </span> EFI DATA OIL</span>
  </section>;
}
