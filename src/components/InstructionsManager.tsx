'use client';

import React, { useState } from 'react';
import {
  BookOpen, HelpCircle, CheckCircle2, Copy, FileSpreadsheet, ShieldCheck,
  Layers, Download, Users, Server, Database, KeyRound, Terminal, Check,
  Sparkles, ArrowRight, MessageSquare, Fuel, Flame, Droplet, Send, ExternalLink
} from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, badge, defaultOpen = false, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left transition-colors border-b border-slate-800/80"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
            {badge && <span className="text-[11px] text-amber-400 font-mono">{badge}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-semibold">{isOpen ? 'Ocultar' : 'Ver detalle'}</span>
          <div className={`transform transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>
      </button>
      {isOpen && <div className="p-6 text-sm text-slate-300 space-y-4 bg-slate-950/40">{children}</div>}
    </div>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden my-3">
      {title && (
        <div className="px-4 py-2 bg-slate-900 text-xs font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
          <span>{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 text-xs font-sans transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className={copied ? 'text-emerald-400' : ''}>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      )}
      <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function InstructionsManager() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs text-amber-400 font-bold">
            <BookOpen className="h-4 w-4" />
            <span>Documentación y Manual Operativo</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Instrucciones del Sistema EFI DATA OIL
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Aquí encontrarás la explicación completa de cada proceso diario de compra, cálculo, validación,
            exportación al sistema EFI, envío de precios a clientes por PDF y el paso a paso para desplegar
            esta plataforma en <strong>Easypanel</strong> con base de datos lista para producción.
          </p>
        </div>

        {/* Quick Credentials Card */}
        <div className="mt-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Credenciales de Acceso Administrador:</p>
              <p className="text-sm font-bold text-white font-mono">
                Email: <span className="text-amber-300">admin@efidataoil.com</span> | Contraseña: <span className="text-amber-300">admin123</span>
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">
            Sistema Activo y Configurado
          </span>
        </div>
      </div>

      {/* Resumen del Flujo Diario */}
      <Section title="1. Resumen del Flujo de Trabajo Diario" icon={Sparkles} badge="Paso a Paso General" defaultOpen={true}>
        <div className="space-y-4">
          <p>
            El sistema digitaliza y automatiza al 100% el archivo maestro de Excel (<code className="text-amber-300 font-mono">prueba de yanfri.xlsm</code>),
            conectando a los 3 roles de trabajo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs mb-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black">1</span>
                <span>Compañero 1 (Compras)</span>
              </div>
              <p className="text-xs text-slate-400">
                Pasa la Columna P a la O (referencia ayer) y carga los nuevos precios de compra del día (Columna P) en Propias (<code className="text-amber-300">N2:U21</code>) y Colaboradoras (<code className="text-amber-300">N23:U58</code>).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs mb-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-slate-950 flex items-center justify-center text-[11px] font-black">2</span>
                <span>Jefe / Administrador</span>
              </div>
              <p className="text-xs text-slate-400">
                Valida el precio final de venta propuesto (Columna K / R2 / I2), aprueba márgenes y ajusta los postes públicos de estaciones propias (<code className="text-amber-300">C1:C7</code>).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[11px] font-black">3</span>
                <span>Compañeros 2 y 3 (EFI)</span>
              </div>
              <p className="text-xs text-slate-400">
                Cargan precios recibidos de colaboradoras (Columna J, Nieves/Petromiralles sin IVA), exportan la hoja <code className="text-amber-300">IMPORTACION</code> para el sistema EFI y envían avisos a WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Módulo Compañero 1 */}
      <Section title="2. Módulo de Compras (Compañero 1)" icon={FileSpreadsheet} badge="Hoja CALCULO INICIAL - Rangos N2:U21 y N23:U58">
        <div className="space-y-3">
          <h4 className="font-bold text-white text-sm">¿Cómo operar esta pestaña?</h4>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
            <li>
              <strong>Paso 1: Copiar día anterior:</strong> Haz clic en el botón <code className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold font-mono">Copiar P (Actual) &rarr; O (Anterior)</code>. Esto respalda los precios de compra anteriores para calcular variaciones diarias.
            </li>
            <li>
              <strong>Paso 2: Ingresar precios de compra de hoy:</strong> Escribe en la columna <strong>Col P: Compra Hoy (€)</strong> el precio de cotización del combustible de cada estación (ARCOS, ALCUBILLAS, TORREJON, etc.).
            </li>
            <li>
              <strong>Paso 3: Ajustar costos logísticos (si aplican):</strong> Modifica los campos opcionales <code className="text-slate-200">CLH</code>, <code className="text-slate-200">Porte</code>, <code className="text-slate-200">Pase</code> y <code className="text-slate-200">Financiación</code>.
            </li>
            <li>
              <strong>Paso 4: Verificar Costo Total y Precio de Venta (Columna K):</strong> El sistema suma automáticamente:
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 my-2 font-mono text-amber-300">
                Costo Total = Precio Compra (P) + CLH + Porte + Pase + Financiación
              </div>
            </li>
            <li>
              <strong>Paso 5: Guardar:</strong> Pulsa el botón verde <code className="text-emerald-400 font-bold">Guardar Compras del Día</code> para persistir los cambios.
            </li>
          </ol>
        </div>
      </Section>

      {/* Módulo Compañeros 2 y 3 */}
      <Section title="3. Módulo de Validación & Exportación EFI (Compañeros 2 y 3)" icon={ShieldCheck} badge="Hoja IMPORTACION & Estaciones Columna J">
        <div className="space-y-3">
          <p>Este módulo consolida la información para alimentar el sistema central <strong>EFI DATA OIL</strong>:</p>
          
          <div className="space-y-2">
            <h5 className="font-bold text-amber-300 text-xs uppercase">Estaciones Colaboradoras Fijas (Columna J):</h5>
            <p className="text-xs text-slate-400">
              Corresponden a las estaciones que envían diariamente sus precios para cargarse directamente:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {[
                'Z.FRANCA', 'BENAVENTE', 'IRUN ZAISA III', 'AVILESINA',
                'MERIDA', 'SANCTI-SPIRITUS', 'SAN VICENTE DEL PALACIO', 'WATERY ARANDA',
                'PUERTO DE BARCELONA', 'FEGOBLAN PONTEVEDRA', 'VEGA DE VALCARCE', 'HOILA TOLEDO', 'PETREM FIGUERES'
              ].map((s) => (
                <div key={s} className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300">
                  &bull; {s}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h5 className="font-bold text-amber-300 text-xs uppercase">Reglas Especiales de Proveedores:</h5>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
              <li><strong>VALCARCE (H35, H36, H40, H48-H56):</strong> Se ingresa el precio neto directo tal como llega.</li>
              <li><strong>NIEVES (H44, H45):</strong> Viene con IVA incluido. El sistema divide automáticamente entre <code className="text-amber-400 font-bold">1,21</code> para obtener el precio base sin IVA.</li>
              <li><strong>PETROMIRALLES (H30):</strong> Viene con IVA incluido. El sistema divide automáticamente entre <code className="text-amber-400 font-bold">1,21</code>.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <h5 className="font-bold text-amber-300 text-xs uppercase">Exportación 1-Click:</h5>
            <p className="text-xs text-slate-400">
              Al pulsar <strong className="text-blue-400">Generar & Exportar a EFI DATA OIL</strong>, se descarga un archivo <code className="text-emerald-400 font-mono">IMPORTACION_EFI_YYYY-MM-DD.csv</code> con el formato exacto requerido por el sistema EFI.
            </p>
          </div>
        </div>
      </Section>

      {/* Módulo de Postes */}
      <Section title="4. Módulo de Postes & Productos Especiales" icon={Layers} badge="Rangos B2:F30, B37:F40, B43:F47, H62:K73">
        <div className="space-y-3">
          <p className="text-xs">
            Aquí se administran los precios visibles para el público general y los combustibles especiales:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-2">
            <li>
              <strong>Postes Estaciones Propias (<code className="text-amber-300">B2:F30</code>):</strong> Permite definir el precio de <strong>GOA</strong> y <strong>Gasolina 95</strong>.
            </li>
            <li>
              <strong>Fórmula GOA Premium:</strong> Se calcula automáticamente sumando <code className="text-amber-400 font-bold font-mono">+0.04€</code> al precio del Gasóleo A de cada poste.
            </li>
            <li>
              <strong>Ganancia Gasolina:</strong> Cálculo automático de margen en la Columna F.
            </li>
            <li>
              <strong>HVO (<code className="text-amber-300">B37:F40</code>):</strong> Precio para combustible renovable diésel.
            </li>
            <li>
              <strong>Gasóleo B (<code className="text-amber-300">B43:F47</code>):</strong> Precio agrícola y de calefacción.
            </li>
            <li>
              <strong>AdBlue (<code className="text-amber-300">H62:K73</code>):</strong> Tarjetas y poste.
            </li>
          </ul>
        </div>
      </Section>

      {/* Sábana y PDFs */}
      <Section title="5. Sábana de Precios y Emisión de PDFs" icon={Download} badge="Hoja SABANA DE PRECIOS & Tarifas de Clientes">
        <div className="space-y-3 text-xs">
          <p>
            Muestra la matriz de todas las tarifas comerciales (TARIFA 12, TARIFA 18, TARIFA 24, TARIFA 36, ECO, DORADO, etc.) con selector de visualización:
          </p>
          <div className="flex flex-wrap gap-2 my-2">
            <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-amber-300 font-bold">&bull; Precios Sin IVA</span>
            <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-emerald-400 font-bold">&bull; Precios Con IVA (21%)</span>
            <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-blue-300 font-bold">&bull; Vista Dual Completa</span>
          </div>
          <p>
            Cada estación dispone del botón <strong className="text-amber-400">PDF</strong> que prepara la vista de impresión limpia y optimizada para enviar por correo electrónico a tus clientes.
          </p>
        </div>
      </Section>

      {/* Gestión de Usuarios */}
      <Section title="6. Gestión de Usuarios y Roles" icon={Users} badge="Control de Acceso y Permisos">
        <div className="space-y-3 text-xs">
          <p>
            El sistema incluye autenticación completa con persistencia en base de datos / almacenamiento local, permitiendo crear, consultar y eliminar usuarios con los siguientes roles:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/20">
              <span className="text-amber-400 font-bold">Administrador:</span> Acceso total al Dashboard, Compras, EFI, Postes, Tarifas y Usuarios.
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/20">
              <span className="text-blue-400 font-bold">Compañero 1:</span> Especialista en carga de compras diarias y costos logísticos.
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-emerald-400 font-bold">Compañeros 2 y 3:</span> Encargados de colaboradoras fijas, validación y exportación EFI.
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-700">
              <span className="text-slate-300 font-bold">Visualizador:</span> Consulta de sábana de precios y emisión de PDFs.
            </div>
          </div>
        </div>
      </Section>

      {/* Despliegue en Easypanel */}
      <Section title="7. Despliegue Paso a Paso en Easypanel (Docker + DB)" icon={Server} badge="Guía Lista para Copiar y Pegar" defaultOpen={true}>
        <div className="space-y-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300 flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Todo el proyecto ya cuenta con <strong>Dockerfile optimizado multi-etapa</strong>, <strong>Prisma ORM</strong>, <strong>Next.js Standalone</strong> y <strong>docker-compose.yml</strong> listos. Solo sigue estos pasos:
            </span>
          </div>

          {/* Pasos */}
          <div className="space-y-4">
            
            {/* Paso 1 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">1</span>
                <span>Subir el código a tu repositorio de GitHub</span>
              </h4>
              <p className="text-xs text-slate-400">
                Abre tu terminal en la carpeta del proyecto (<code className="text-amber-300">keytber</code>) y ejecuta:
              </p>
              <CodeBlock
                title="Comandos Git para subir a GitHub"
                code={`git init
git add .
git commit -m "Deploy EFI DATA OIL App"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main`}
              />
            </div>

            {/* Paso 2 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">2</span>
                <span>Crear el Proyecto y Servicio en Easypanel</span>
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                <li>Inicia sesión en tu panel de <strong>Easypanel</strong>.</li>
                <li>Crea un nuevo <strong>Project</strong> (por ejemplo: <code className="text-amber-300">efi-data-oil</code>).</li>
                <li>Haz clic en <strong>+ Service</strong> &rarr; selecciona <strong>App</strong>.</li>
                <li>Asigna el nombre al servicio: <code className="text-amber-300">keytber-app</code>.</li>
              </ol>
            </div>

            {/* Paso 3 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">3</span>
                <span>Configurar la Fuente (Source) en Easypanel</span>
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                <li>En la pestaña <strong>Source</strong>, selecciona <strong>GitHub</strong>.</li>
                <li>Conecta tu repositorio (<code className="text-amber-300">TU_USUARIO/TU_REPOSITORIO</code>).</li>
                <li>Rama (Branch): <code className="text-amber-300 font-mono">main</code>.</li>
                <li>Build Type: <code className="text-amber-300 font-mono">Dockerfile</code>.</li>
                <li>Dockerfile Path: <code className="text-amber-300 font-mono">Dockerfile</code> (o déjalo por defecto).</li>
              </ul>
            </div>

            {/* Paso 4 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">4</span>
                <span>Variables de Entorno (Environment Variables)</span>
              </h4>
              <p className="text-xs text-slate-400">
                En la pestaña <strong>Environment</strong> de Easypanel, copia y pega las siguientes variables:
              </p>
              <CodeBlock
                title="Variables de Entorno para Easypanel"
                code={`NODE_ENV=production
PORT=3000
DATABASE_URL=file:./dev.db
NEXT_TELEMETRY_DISABLED=1
SECRET_KEY=efi-data-oil-secure-token-2026`}
              />
              <p className="text-[11px] text-slate-500">
                * Nota: Si creas un servicio de base de datos PostgreSQL en Easypanel, simplemente cambia <code className="text-amber-300">DATABASE_URL</code> por la URL interna de Postgres que te da Easypanel (ej. <code className="text-amber-300">postgresql://user:pass@postgres:5432/efi_db</code>).
              </p>
            </div>

            {/* Paso 5 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">5</span>
                <span>Puertos y Dominios (Domains)</span>
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                <li>En <strong>Port</strong>: Asegúrate que esté configurado el puerto <code className="text-amber-300 font-mono font-bold">3000</code>.</li>
                <li>En <strong>Domains</strong>: Añade tu subdominio o dominio (ej. <code className="text-amber-300">combustibles.tuempresa.com</code> o el subdominio gratuito de Easypanel). Easypanel genera el certificado SSL (HTTPS) de forma 100% automática con Let's Encrypt.</li>
              </ul>
            </div>

            {/* Paso 6 */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">6</span>
                <span>Desplegar (Deploy)</span>
              </h4>
              <p className="text-xs text-slate-300">
                Haz clic en el botón superior <strong>Deploy</strong>. Easypanel descargará el código, compilará el contenedor Docker y levantará la aplicación lista en pocos segundos.
              </p>
            </div>

          </div>
        </div>
      </Section>

      {/* WhatsApp Message Generator Quick Tool */}
      <Section title="8. Generador Automático de Notificaciones WhatsApp" icon={MessageSquare} badge="Comunicación Rápida con Estaciones">
        <div className="space-y-4 text-xs">
          <p>
            Copia con un clic el mensaje listo para enviar a los grupos de WhatsApp de las estaciones cuando se actualicen los precios:
          </p>
          <CodeBlock
            title="Plantilla de Mensaje WhatsApp para Estaciones"
            code={`⛽ *ACTUALIZACIÓN DE PRECIOS - EFI DATA OIL* ⛽
📅 Fecha: 2026-08-18

Estimados compañeros / colaboradores,
Se han actualizado los precios diarios en el sistema:

🔹 *Gasóleo A (GOA):* Precios cargados y validados
🔹 *GOA Premium:* Aplicado incremento de +0,04 €/L
🔹 *Gasolina 95:* Postes actualizados
🔹 *Estaciones Colaboradoras:* Registradas en Columna J

📂 Hoja IMPORTACION generada con éxito para EFI DATA OIL.
Cualquier duda o ajuste favor contactar por este canal.`}
          />
        </div>
      </Section>
    </div>
  );
}
