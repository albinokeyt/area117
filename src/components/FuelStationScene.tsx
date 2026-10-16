'use client';

import { useRef, useState } from 'react';
import { Check, Fuel, MoveUpRight } from 'lucide-react';

const HOME = { x: 353, y: 254 };
const PORT = { x: 438, y: 309 };

/** Decorative interaction only: it never authenticates or stores credentials. */
export function FuelStationScene({ connected, onConnect, departing = false }: { connected: boolean; onConnect: () => void; departing?: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const [nozzle, setNozzle] = useState(HOME);
  const position = connected ? PORT : nozzle;
  const connect = () => { setNozzle(PORT); onConnect(); };

  return <div ref={scene} className={`fuel-scene ${connected ? 'is-connected' : ''} ${departing ? 'is-departing' : ''}`} data-testid="fuel-scene">
    <div className="station-halo" />
    <svg viewBox="0 0 780 470" className="station-art" aria-hidden="true">
      <defs>
        <linearGradient id="station-ground" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4975b9" stopOpacity=".25" /><stop offset="1" stopColor="#0a1635" stopOpacity=".7" /></linearGradient>
        <linearGradient id="station-roof" x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#e7efff" /><stop offset=".5" stopColor="#9fbaeb" /><stop offset="1" stopColor="#3260a5" /></linearGradient>
        <linearGradient id="station-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e0edff" stopOpacity=".95" /><stop offset="1" stopColor="#3768aa" stopOpacity=".5" /></linearGradient>
        <linearGradient id="station-red"><stop stopColor="#ff6b79" /><stop offset="1" stopColor="#c51f42" /></linearGradient>
        <linearGradient id="station-car" x1="0" y1="0" x2=".25" y2="1"><stop stopColor="#fff" /><stop offset=".38" stopColor="#edf4ff" /><stop offset=".65" stopColor="#b9cce5" /><stop offset="1" stopColor="#6786ae" /></linearGradient>
        <linearGradient id="station-window" x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#7199be" /><stop offset=".45" stopColor="#25425d" /><stop offset="1" stopColor="#091b30" /></linearGradient>
        <linearGradient id="car-hood" x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#fff" /><stop offset=".55" stopColor="#dce9fa" /><stop offset="1" stopColor="#8ba8cc" /></linearGradient>
        <linearGradient id="car-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e7f0ff" /><stop offset=".42" stopColor="#cbdcf2" /><stop offset=".52" stopColor="#94b1d4" /><stop offset="1" stopColor="#bdd0e8" /></linearGradient>
        <radialGradient id="car-rim"><stop stopColor="#f4f8ff" /><stop offset=".68" stopColor="#a5bbd5" /><stop offset="1" stopColor="#3f5874" /></radialGradient>
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
        <ellipse cx="548" cy="362" rx="142" ry="29" transform="rotate(9 548 362)" fill="#020917" opacity=".7" />
        {/* The two visible wheels share the side plane; the far wheel sits behind
            the nose. Rounded arches and a separate bonnet make the silhouette readable. */}
        <ellipse cx="666" cy="339" rx="12" ry="21" transform="rotate(14 666 339)" fill="#0a1322" stroke="#263c55" strokeWidth="3" />
        <path d="M418 305 Q416 296 432 290 L470 282 Q484 257 506 250 Q514 247 531 250 L580 260 Q589 262 596 272 L622 304 L670 318 Q687 323 692 336 L687 353 Q682 362 654 378 L433 346 Q423 343 420 330Z" fill="url(#station-car)" stroke="#bfd4ee" strokeWidth="1.2" />
        {/* Roof, rear screen and windshield: three distinct curved glass surfaces. */}
        <path d="M450 290 Q471 262 506 252 L479 269 Q463 277 450 298Z" fill="#284662" stroke="#abc4df" />
        <path d="M479 267 Q492 255 511 251 Q518 250 532 253 L579 263 Q584 265 587 269 L556 283Z" fill="#f2f7ff" />
        <path d="M559 281 588 267 Q599 279 617 302 L591 322 Q581 300 559 281Z" fill="url(#station-window)" stroke="#9ebad9" strokeWidth="1.2" />
        <path d="m566 282 20-10 23 28-16 10Z" fill="#c5e2fa" opacity=".2" />
        <path d="m571 283 29 16" stroke="#e2f3ff" strokeOpacity=".48" strokeWidth="1.4" />
        {/* Near side has a continuous window line, a B-pillar and two doors. */}
        <path d="M447 299 Q458 281 479 273 L552 285 Q572 302 586 322 Q520 312 447 299Z" fill="url(#station-window)" stroke="#a2bddc" strokeWidth="1.6" />
        <path d="M455 295 Q465 283 480 278 L503 282 504 307Z" fill="#b2d2ed" opacity=".21" />
        <path d="m511 283 2 26" stroke="#152b43" strokeWidth="5" />
        <path d="m518 286 28 5 26 24-49-9Z" fill="#bedbf1" opacity=".15" />
        <path d="M419 308 Q475 315 589 334 L652 346 Q663 350 663 360 L654 378 637 381 Q639 343 618 340 Q594 336 594 372 L482 353 Q482 315 459 312 Q438 310 438 347 L432 346 Q420 341 419 328Z" fill="url(#car-side)" stroke="#adc5e2" strokeWidth="1.1" />
        <path d="M591 325 621 306 Q647 310 671 321 Q681 325 684 330 L652 347 Q624 333 591 325Z" fill="url(#car-hood)" />
        <path d="m610 324 42 12m-30-23 37 9" fill="none" stroke="#fff" strokeOpacity=".62" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M653 348 687 331 Q693 337 687 352 Q682 364 655 377Z" fill="#8fabc9" stroke="#c3d8f0" />
        {/* Thin LED lights, a dark grille, bumper and rear lamp. */}
        <path d="m655 349 12-6m12-10 7-3" stroke="#e6f7ff" strokeWidth="4" strokeLinecap="round" />
        <path d="m658 357 25-13-2 10-22 12Z" fill="#15273d" stroke="#b8cfeb" strokeWidth=".8" />
        <path d="m660 361 19-10" stroke="#647d99" strokeWidth="1" />
        <path d="m659 371 18-10" stroke="#1b3149" strokeWidth="3" strokeLinecap="round" />
        <path d="m420 313 15 3" stroke="#ed526a" strokeWidth="4" strokeLinecap="round" />
        <path d="M424 305 Q487 312 587 330" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.8" />
        <path d="m488 319 1 27m59-18 2 26" fill="none" stroke="#6788ac" strokeOpacity=".65" strokeWidth="1" />
        <path d="m493 321 10 2m50 8 11 2" stroke="#6683a6" strokeWidth="2.4" strokeLinecap="round" />
        <path d="m485 352 106 17" stroke="#d63d5e" strokeWidth="2" strokeLinecap="round" />
        <path d="m485 356 107 17" stroke="#183553" strokeWidth="3" strokeLinecap="round" />
        {/* Mirror projects from the A-pillar instead of becoming part of the glass. */}
        <path d="m578 318 7-5 12 3 1 6-8 3-10-3Z" fill="#e3efff" stroke="#7b9abd" />
        <path d="m585 321 7 3" stroke="#142e4b" strokeWidth="2" />
        {[{ x: 459, y: 338 }, { x: 618, y: 363 }].map(({ x, y }) => <g key={x} transform={`translate(${x} ${y}) rotate(-9)`}>
          <ellipse rx="17" ry="25" fill="#080f1b" stroke="#47617f" strokeWidth="2" />
          <ellipse rx="12" ry="19" fill="url(#car-rim)" stroke="#c5d6ec" strokeWidth="1.2" />
          <ellipse rx="9" ry="15" fill="#263c55" />
          <g transform="scale(.6 1)">{[0, 72, 144, 216, 288].map(angle => <path key={angle} d="M-1-3-3-14 1-16 3-3Z" transform={`rotate(${angle})`} fill="#cbdced" />)}</g>
          <ellipse rx="3.5" ry="5" fill="#dce9f8" /><ellipse rx="1.4" ry="2" fill="#5f7793" />
          <path d="M-14-6Q-12-22 0-23" fill="none" stroke="#95abc5" strokeOpacity=".4" strokeWidth="1.2" />
        </g>)}
        <path d="M437 330Q437 306 458 310Q477 312 481 342M595 356Q599 333 618 338Q639 342 639 372" fill="none" stroke="#e4efff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m432 302 12 2 1 12-12-2Z" fill="#c0d3eb" stroke="#6d8cac" strokeWidth="1" />
      </g>
      {!departing && <><path d={`M360 238 C438 261 277 388 ${position.x} ${position.y}`} fill="none" stroke="#020916" strokeWidth="9" strokeLinecap="round" />
      <path d={`M360 238 C438 261 277 388 ${position.x} ${position.y}`} fill="none" stroke={connected ? '#578cdd' : '#526783'} strokeWidth="3" strokeLinecap="round" />
      {connected && <path className="fuel-flow" d={`M360 238 C438 261 277 388 ${PORT.x} ${PORT.y}`} fill="none" stroke="#c3e2ff" strokeWidth="3" strokeDasharray="4 15" />}</>}
    </svg>
    {!connected && !departing && <div className="fuel-port" style={{ left: `${PORT.x / 7.8}%`, top: `${PORT.y / 4.7}%` }} aria-hidden="true"><span /><MoveUpRight size={15} /></div>}
    {!departing && <><button type="button" className={`fuel-nozzle ${connected ? 'is-docked' : ''}`} aria-label="Conectar surtidor al coche" aria-describedby="fuel-scene-help" disabled={connected}
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
    <div className="station-interaction-caption" id="fuel-scene-help"><span className="scene-status-dot" /><span>{connected ? 'Conectado. Todo listo para tu próxima ruta.' : 'Arrastra el surtidor hasta el coche. O púlsalo para conectar.'}</span></div></>}
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
