'use client';

import { useRef, useState } from 'react';
import { Check, Fuel, MoveUpRight } from 'lucide-react';

const HOME = { x: 353, y: 254 };
const PORT = { x: 565, y: 318 };

/** Decorative interaction only: it never authenticates or stores credentials. */
export function FuelStationScene({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const [nozzle, setNozzle] = useState(HOME);
  const position = connected ? PORT : nozzle;
  const connect = () => { setNozzle(PORT); onConnect(); };

  return <div ref={scene} className={`fuel-scene ${connected ? 'is-connected' : ''}`} data-testid="fuel-scene">
    <div className="station-halo" />
    <svg viewBox="0 0 780 470" className="station-art" aria-hidden="true">
      <defs>
        <linearGradient id="station-ground" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4975b9" stopOpacity=".25" /><stop offset="1" stopColor="#0a1635" stopOpacity=".7" /></linearGradient>
        <linearGradient id="station-roof" x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#e7efff" /><stop offset=".5" stopColor="#9fbaeb" /><stop offset="1" stopColor="#3260a5" /></linearGradient>
        <linearGradient id="station-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e0edff" stopOpacity=".95" /><stop offset="1" stopColor="#3768aa" stopOpacity=".5" /></linearGradient>
        <linearGradient id="station-red"><stop stopColor="#ff6b79" /><stop offset="1" stopColor="#c51f42" /></linearGradient>
        <linearGradient id="station-car" x1="0" y1="0" x2=".4" y2="1"><stop stopColor="#f7faff" /><stop offset=".5" stopColor="#b7cce9" /><stop offset="1" stopColor="#567ead" /></linearGradient>
        <linearGradient id="station-window"><stop stopColor="#486689" /><stop offset="1" stopColor="#0c203b" /></linearGradient>
        <radialGradient id="station-light"><stop stopColor="#a5d5ff" stopOpacity=".4" /><stop offset="1" stopColor="#558af5" stopOpacity="0" /></radialGradient>
        <filter id="station-blur"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <ellipse cx="407" cy="365" rx="283" ry="75" fill="#02091e" opacity=".6" filter="url(#station-blur)" />
      <path d="M69 278 346 155 733 334 454 461Z" fill="url(#station-ground)" stroke="#9bc2ff" strokeOpacity=".2" />
      <path d="m83 292 370 170 267-118" fill="none" stroke="#8aadf1" strokeOpacity=".2" />
      <path d="m116 302 334 151m-281-174 335 151m-282-174 337 150m-280-174 335 151m-280-174 334 151m-308-22 241-107m-297 81 241-107m-298 81 241-107m-296 82 241-107" stroke="#b4cefc" strokeOpacity=".055" />
      <path d="m206 345 98-43m-31 74 100-45m-30 78 100-45m-27-167 109 50" stroke="#c8dcff" strokeOpacity=".32" strokeWidth="2" strokeDasharray="18 14" />
      <path d="m153 240 258-113 192 88-259 116Z" fill="#0a1933" stroke="#accdff" strokeOpacity=".23" />
      <path d="m158 240 187 87 255-111" fill="none" stroke="#dbe9ff" strokeOpacity=".4" />
      <path d="m193 174 13 6v104l-13-6Z" fill="#6991c2" /><path d="m206 180 10-5v104l-10 5Z" fill="#c5daf2" />
      <path d="m507 183 13 6v108l-13-6Z" fill="#6991c2" /><path d="m520 189 10-5v108l-10 5Z" fill="#c5daf2" />
      <ellipse cx="363" cy="257" rx="195" ry="60" fill="url(#station-light)" />
      <g className="station-canopy">
        <path d="m125 124 257-114 263 122-258 115Z" fill="url(#station-roof)" stroke="#dceaff" strokeOpacity=".7" />
        <path d="m125 124 262 122v20L125 144Z" fill="url(#station-red)" />
        <path d="m387 246 258-114v20L387 266Z" fill="#a81f41" />
        <path d="m139 128 247 114 244-108" fill="none" stroke="#fff" strokeOpacity=".76" />
        <path d="m156 144 216 100m27 0 213-94" stroke="#fdcdd6" strokeWidth="2" />
        <text x="287" y="135" fill="#12376e" fontFamily="Arial,sans-serif" fontSize="26" fontWeight="800" transform="rotate(25 287 135)">AREA117</text>
        <path d="m257 74 48 22m69-54 48 23m53 24 48 22" stroke="white" strokeOpacity=".5" strokeWidth="3" />
      </g>
      <g>
        <path d="m289 201 39-17 48 22-39 18Z" fill="#dae6fa" />
        <path d="m289 201 48 23v102l-48-23Z" fill="url(#station-glass)" stroke="#c1d6f3" strokeOpacity=".5" />
        <path d="m337 224 39-18v103l-39 17Z" fill="#204574" stroke="#739bc9" strokeOpacity=".5" />
        <path d="m296 216 34 16v35l-34-16Z" fill="#091a32" stroke="#87a9d4" strokeOpacity=".5" />
        <text x="300" y="241" fontSize="10" fill="#bbdbff" fontFamily="monospace" transform="rotate(25 300 239)">{connected ? 'READY' : '117'}</text>
        <path d="m299 270 29 13v10l-29-13Z" fill="url(#station-red)" />
        <path d="m299 294 29 13m-29-6 29 13" stroke="#9fbbdd" strokeOpacity=".4" />
        <path d="m345 233 19-9v61l-19 8Z" fill="#0b1b34" />
        <circle cx="351" cy="249" r="2" fill={connected ? '#70e5ca' : '#ef8398'} />
      </g>
      <g className="station-car">
        <ellipse cx="548" cy="362" rx="131" ry="37" fill="#030b1a" opacity=".72" />
        <path d="m417 290 89-46 81 17 90 57-7 35-101 46-128-59Z" fill="url(#station-car)" stroke="#d3e3f9" strokeOpacity=".6" />
        <path d="m436 291 70-40 73 16 57 37-86 40Z" fill="#e6effc" />
        <path d="m477 273 36-30 60 15 42 39-65 27Z" fill="url(#station-window)" stroke="#afcae9" />
        <path d="m483 271 31-22 55 13 25 26-46 21Z" fill="#8eb0d1" fillOpacity=".37" />
        <path d="m548 309 3 15m-34-73 32 57" fill="none" stroke="#d2e2f4" strokeWidth="3" />
        <path d="m417 290 133 64 127-36m-127 36 19 45" fill="none" stroke="#fafcff" strokeOpacity=".7" />
        <path d="m429 316 17 8m176 21 39-18" stroke="#dcefff" strokeWidth="5" strokeLinecap="round" />
        <path d="m451 340 91 42m44-2 27-12" stroke="#e44964" strokeWidth="3" />
        <path d="m451 317 82 39m-51-55 20 9" stroke="#7d9bbd" strokeWidth="2" />
        <g fill="#0c1628" stroke="#5b7799" strokeWidth="3"><ellipse cx="471" cy="347" rx="13" ry="21" transform="rotate(-24 471 347)" /><ellipse cx="627" cy="353" rx="13" ry="21" transform="rotate(24 627 353)" /></g>
        <g fill="#abc3e1"><ellipse cx="471" cy="347" rx="7" ry="13" transform="rotate(-24 471 347)" /><ellipse cx="627" cy="353" rx="7" ry="13" transform="rotate(24 627 353)" /></g>
        <path d="m557 309 14 7v13l-14-7Z" fill="#29456c" stroke="#91b2d9" />
      </g>
      <path d={`M360 238 C438 261 277 388 ${position.x} ${position.y}`} fill="none" stroke="#020916" strokeWidth="9" strokeLinecap="round" />
      <path d={`M360 238 C438 261 277 388 ${position.x} ${position.y}`} fill="none" stroke={connected ? '#578cdd' : '#526783'} strokeWidth="3" strokeLinecap="round" />
      {connected && <path className="fuel-flow" d={`M360 238 C438 261 277 388 ${PORT.x} ${PORT.y}`} fill="none" stroke="#c3e2ff" strokeWidth="3" strokeDasharray="4 15" />}
    </svg>
    {!connected && <div className="fuel-port" style={{ left: `${PORT.x / 7.8}%`, top: `${PORT.y / 4.7}%` }} aria-hidden="true"><span /><MoveUpRight size={15} /></div>}
    <button type="button" className={`fuel-nozzle ${connected ? 'is-docked' : ''}`} aria-label="Conectar surtidor al coche" aria-describedby="fuel-scene-help" disabled={connected}
      style={{ left: `${position.x / 7.8}%`, top: `${position.y / 4.7}%` }}
      onPointerDown={event => { moved.current = false; drag.current = { x: event.clientX, y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => {
        if (!drag.current || !scene.current) return;
        if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) drag.current.moved = true;
        const box = scene.current.getBoundingClientRect();
        setNozzle({ x: Math.max(30, Math.min(750, (event.clientX - box.left) / box.width * 780)), y: Math.max(30, Math.min(440, (event.clientY - box.top) / box.height * 470)) });
      }}
      onPointerUp={() => { if (!drag.current) return; moved.current = drag.current.moved; drag.current = null; if (Math.hypot(nozzle.x - PORT.x, nozzle.y - PORT.y) < 85) connect(); else setNozzle(HOME); }}
      onPointerCancel={() => { drag.current = null; moved.current = true; setNozzle(HOME); }}
      onClick={event => { if (event.detail === 0 || !moved.current) connect(); }}>
      {connected ? <Check size={22} /> : <Fuel size={24} />}
    </button>
    <div className="station-interaction-caption" id="fuel-scene-help"><span className="scene-status-dot" /><span>{connected ? 'Conectado. Todo listo para tu próxima ruta.' : 'Arrastra el surtidor hasta el coche. O púlsalo para conectar.'}</span></div>
  </div>;
}

export function FuelGauge({ value }: { value: number }) {
  return <div className="fuel-gauge" role="meter" aria-label="Preparación del acceso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <svg viewBox="0 0 220 148" aria-hidden="true">
      <defs><linearGradient id="gauge-progress"><stop stopColor="#729ef2" /><stop offset="1" stopColor="#f2647d" /></linearGradient></defs>
      <path d="M32 115a82 82 0 1 1 156 0" fill="none" stroke="#ffffff12" strokeWidth="7" strokeLinecap="round" />
      <path d="M32 115a82 82 0 1 1 156 0" fill="none" stroke="url(#gauge-progress)" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - value} className="gauge-fill" />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1="110" y1="28" x2="110" y2="34" stroke="#b6c5df" strokeWidth="1" transform={`rotate(${-110 + i * 27.5} 110 102)`} />)}
      <g className="gauge-needle" style={{ transform: `rotate(${-110 + value * 2.2}deg)` }}><path d="m110 102-3-54 6 0Z" fill="#e4eeff" /></g>
      <circle cx="110" cy="102" r="7" fill="#a9c4f5" /><circle cx="110" cy="102" r="3" fill="#142a4b" />
      <text x="28" y="139" fill="#a8bbd6" fontSize="10">E</text><text x="185" y="139" fill="#a8bbd6" fontSize="10">F</text>
    </svg>
    <div className="gauge-readout"><Fuel size={12} /><span>{value.toString().padStart(2, '0')}<small> / 100</small></span></div>
  </div>;
}
