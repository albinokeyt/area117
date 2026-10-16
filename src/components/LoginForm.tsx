'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, ArrowUpRight, Check, Eye, EyeOff, Fuel, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { FuelGauge, FuelStationScene } from './FuelStationScene';
import { APP_VERSION } from '@/lib/version';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const username = useRef<HTMLInputElement>(null);
  useEffect(() => { if (connected) username.current?.focus(); }, [connected]);
  const progress = connected ? Math.round(12 + Math.min(email.length / 20, 1) * 35 + Math.min(password.length / 12, 1) * 43 + (busy ? 10 : 0)) : 0;
  const reveal = () => { setConnected(true); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const success = await login(email, password).catch(() => false);
    if (!success) {
      setError('Credenciales inválidas. Comprueba el usuario o correo y la contraseña.');
      setBusy(false);
    }
  };

  return <div className="efi-login">
    <div className="login-ambient" aria-hidden="true"><span /><span /><span /></div>
    <header className="login-masthead">
      <a href="#acceso" className="login-brand" onClick={reveal} aria-label="AREA117, ir al acceso">
        <img src="/logo_area117.png" width="66" height="55" alt="AREA117" />
        <span><strong>AREA<span>117</span></strong><small>ENERGÍA QUE TE ACOMPAÑA</small></span>
      </a>
      <div className="login-masthead-right"><span className="login-secure-dot" />Tu estación de control<span className="login-edition">EFI DATA OIL</span></div>
    </header>

    <main className="login-experience">
      <section className="login-story" aria-label="Estación interactiva AREA117">
        <div className="login-eyebrow"><span />CONTIGO EN LA CARRETERA</div>
        <h1>La energía de<br />tenerlo <em>todo bajo control.</em></h1>
        <p className="login-story-intro">Tu red de estaciones. Tus precios. Un solo destino.<br />Bienvenido a una nueva forma de ponerlo todo en marcha.</p>
        <FuelStationScene connected={connected} onConnect={reveal} />
        <div className="login-story-foot"><span><ShieldCheck size={15} />Acceso privado y protegido</span><span>Diseñado para seguir avanzando<ArrowUpRight size={14} /></span></div>
      </section>

      <section className={`login-crystal ${connected ? 'is-ready' : ''}`} id="acceso" aria-label="Acceso al sistema">
        <div className="login-card-rim" aria-hidden="true" />
        <div className="login-card-topline"><span><span className="login-secure-dot" />EFI DATA OIL</span><span>01 / ACCESO</span></div>
        <FuelGauge value={Math.min(100, progress)} />
        {!connected ? <div className="login-welcome">
          <span className="login-mini-label">TU PRÓXIMA PARADA</span>
          <h2>Todo empieza<br />con una conexión.</h2>
          <p>Conecta el surtidor al coche para abrir tu estación de trabajo.</p>
          <button type="button" className="login-submit" onClick={reveal}><span>Acceder directamente</span><ArrowRight size={18} /></button>
          <div className="login-welcome-note"><Fuel size={15} /><span>También puedes pulsar el surtidor.<br />Tú eliges cómo arrancar.</span></div>
        </div> : <div className="login-form-content">
          <span className="login-mini-label"><Check size={12} />CONEXIÓN LISTA</span>
          <h2>Bienvenido<br />de nuevo<span>.</span></h2>
          <p className="login-form-intro">Tu equipo, tu energía, tu siguiente paso.</p>
          <form onSubmit={handleSubmit} className="login-fields" aria-busy={busy}>
            {error && <div role="alert" className="login-error">{error}</div>}
            <div className="login-field-group">
              <label htmlFor="area117-username">Usuario o correo electrónico</label>
              <div className="login-field"><UserRound size={17} /><input ref={username} id="area117-username" type="text" aria-label="Usuario o correo electrónico" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} placeholder="Tu usuario o correo" /></div>
            </div>
            <div className="login-field-group">
              <label htmlFor="area117-password">Contraseña</label>
              <div className="login-field"><LockKeyhole size={17} /><input id="area117-password" type={showPassword ? 'text' : 'password'} aria-label="Contraseña" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(previous => !previous)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </div>
            <button type="submit" className="login-submit" disabled={busy}><span>{busy ? 'Iniciando sesión…' : 'Iniciar Sesión'}</span>{busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}</button>
          </form>
          <p className="login-privacy"><ShieldCheck size={14} />Acceso exclusivo para usuarios autorizados</p>
        </div>}
        <div className="login-card-bottom"><span>AREA117 · ESTACIÓN DE TRABAJO</span><span>{APP_VERSION}</span></div>
      </section>
    </main>
    <footer className="login-footer"><span>© {new Date().getFullYear()} AREA117. Contigo en la carretera.</span><span><span />Conexión segura<span className="login-footer-rule" />Una experiencia EFI DATA OIL</span></footer>
  </div>;
}
