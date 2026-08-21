'use client';

import React, { useState } from 'react';
import { TARIFFS, PROPIAS_STATIONS, COLABORADORA_STATIONS } from '@/lib/dataSeed';
import {
  Printer, Download, FileText, Search, Calendar, Check,
  Sparkles, Building2, Store, Fuel, Zap, Eye, ArrowDownToLine
} from 'lucide-react';

interface PdfGeneratorProps {
  selectedDate: string;
}

// Catálogo de Estaciones con Bandera y Dirección Real del Excel (Hoja TARIFA 12)
const STATIONS_METADATA: Record<string, { bandera: string; ubicacion: string }> = {
  'ES RIBA-ROJA': { bandera: 'EXOIL', ubicacion: 'Polígono Industrial el Oliveral, Calle U, nº 4, Riba-roja de Túria, Valencia' },
  'ES PISTA DE SILLA': { bandera: 'EXOIL', ubicacion: 'Camí pont de pedra, 3, 46910, Valencia' },
  'ES REAL DE GANDIA': { bandera: 'EXOIL', ubicacion: "Carrer Travessera D'Albaida, 62, El Real de Gandia, Valencia" },
  'ES CHIVA': { bandera: 'EXOIL', ubicacion: 'C. Ramón y Cajal, 53, Valencia' },
  'ES ALBERIC': { bandera: 'EXOIL', ubicacion: 'AV. La Marquesa, 14, 46260 Alberic, Valencia' },
  'CATARROJA': { bandera: 'EXOIL', ubicacion: 'Camí Vell de Russafa, 418, 46470 Catarroja, Valencia' },
  'MANISES - EXOIL': { bandera: 'EXOIL', ubicacion: 'Avinguda de la Cova, 62, 46940 Manises, Valencia' },
  'TORREJON': { bandera: 'VALCARCE', ubicacion: 'Avenida ronda sur 3, Pol. Ind. Los Almendros, Torrejón de Ardoz, Madrid' },
  'ARCOS JALON': { bandera: 'AREA 117', ubicacion: 'Calle Malita, 15 - Arcos de Jalón, Soria' },
  'ALFAJARIN': { bandera: 'ALFA ENERGIA', ubicacion: 'Pl. del Saco, 12 - 50172 Alfajarín, Zaragoza' },
  'TORREMOCHA': { bandera: 'AREA 117', ubicacion: 'Área de Servicio A2, KM 117, 19268 Torremocha del Campo, Guadalajara' },
  'MADRID': { bandera: 'AREA 117', ubicacion: 'Vía de Servicio A-3, KM 11, 28031 Madrid' },
  'VALLECAS': { bandera: 'AREA 117', ubicacion: 'Av. de la Democracia, 15, 28031 Madrid' },
  'VALDEMORO': { bandera: 'AREA 117', ubicacion: 'C/ Narciso Monturiol 28, Pol. Ind. Rompecubas, Valdemoro, Madrid' },
  'PAMPLONA': { bandera: 'ALAITZ', ubicacion: 'N-121, KM 11,3 - 31398 Muruarte de Reta, Navarra' },
  'HUMILLADERO': { bandera: 'AREA 117', ubicacion: 'Autovía A92, KM 138,20, 29531 Humilladero, Málaga' },
  'UCLES': { bandera: 'VALCARCE', ubicacion: 'Autovía del Este, KM 90, 16420 Villarrubio, Cuenca' },
  'BENAMEJI': { bandera: 'AREA 117', ubicacion: 'E.S. Cepsa El Berrocal, N-331, PK 96, Benamejí, Córdoba' },
  'SORIA ALCUBILLAS': { bandera: 'AREA 117', ubicacion: 'A-15, KM 13, 42213 Alcubilla de las Peñas, Soria' },
  'ABRERA': { bandera: 'HAM', ubicacion: 'Carrer del Treball, 1, 08630 Abrera, Barcelona' },
  'VALDEHERRERA': { bandera: 'PETROBIL', ubicacion: 'Área de Servicio Valdeherrera A2, KM 231, Calatayud, Zaragoza' },
  'EL CASAR': { bandera: 'VALCARCE', ubicacion: 'Cam. Pilón, 2, 45614 El Casar de Talavera, Toledo' },
  'LA JOYOSA': { bandera: 'VALCARCE', ubicacion: 'Autovía de Logroño, A-68 - Salida 257, Zaragoza' },
  'JUNDIZ NORPETROL': { bandera: 'NORPETROL', ubicacion: 'Margarita Entitatea, 16, 01195 Margarita, Álava' },
  'OLIVERAL': { bandera: 'ALZ', ubicacion: 'Carrer A, 57 - 46394 Ribarroja de Túria, Valencia' },
  'Z.FRANCA': { bandera: 'NIEVES', ubicacion: 'C/ Letra B de la Zona Franca, 13-15, 08040 Barcelona' },
  'GUARROMAN': { bandera: 'VALCARCE', ubicacion: 'Carretera N-IV, Salida 280, Guarromán, Jaén' },
  'VALDEPEÑAS': { bandera: 'VALCARCE', ubicacion: 'Autovía A-4, KM 200, Valdepeñas, Ciudad Real' },
  'OPEN': { bandera: 'OPEN', ubicacion: 'Polígono Industrial Las Quemadas, Córdoba' },
  'TJOIL SEVILLA': { bandera: 'TJOIL', ubicacion: 'Autovía A-92, KM 15, Alcalá de Guadaíra, Sevilla' },
  'BENAVENTE': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 262, Benavente, Zamora' },
  'IRUN ZAISA III': { bandera: 'VALCARCE', ubicacion: 'Centro de Transportes Zaisa III, Behobia, Irún, Guipúzcoa' },
  'TARRAGONA': { bandera: 'PETROMIRALLES', ubicacion: 'Pol. Ind. Riu Clar, Carrer de la Química, Tarragona' },
  'LACHAR': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92, KM 221, Láchar, Granada' },
  'LA CAMPANA': { bandera: 'VALCARCE', ubicacion: 'Autovía A-4, KM 480, La Campana, Sevilla' },
  'AVILESINA': { bandera: 'AVILESINA', ubicacion: 'Polígono Industrial PEPA, Avilés, Asturias' },
  'GOR': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92N, KM 20, Gor, Granada' },
  'LLERS': { bandera: 'PADROSA', ubicacion: 'Autopista AP-7, Salida 3, 17740 Llers, Girona' },
  'DARRO - A92': { bandera: 'VALCARCE', ubicacion: 'Autovía A-92, KM 292, Darro, Granada' },
  'MERIDA': { bandera: 'VALCARCE', ubicacion: 'Autovía A-5, KM 341, Mérida, Badajoz' },
  'SANCTI-SPIRITUS': { bandera: 'VALCARCE', ubicacion: 'Autovía A-62, KM 312, Sancti-Spíritus, Salamanca' },
  'MURCIA': { bandera: 'ANDAMUR', ubicacion: 'Polígono Industrial Oeste, Alcantarilla, Murcia' },
  'NORIOIL': { bandera: 'NORIOIL', ubicacion: 'Autovía A-7, KM 585, Lorca, Murcia' },
  'SAN VICENTE DEL PALACIO': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 147, San Vicente del Palacio, Valladolid' },
  'WATERY ARANDA': { bandera: 'WATERY', ubicacion: 'Pol. Ind. Allendeduero, Aranda de Duero, Burgos' },
  'BERA': { bandera: 'BERA', ubicacion: 'Carretera NA-1310, KM 2, Bera, Navarra' },
  'PUERTO DE BARCELONA': { bandera: 'AUTONET', ubicacion: 'Moll Sud, Tram VI, Puerto de Barcelona, Barcelona' },
  'GIRONA-CALSINA': { bandera: 'CALSINA', ubicacion: 'Pol. Ind. Pont Xetmar, Cornellà del Terri, Girona' },
  'FEGOBLAN PONTEVEDRA': { bandera: 'FEGOBLAN', ubicacion: 'Polígono Industrial do Campiño, Pontevedra' },
  'VEGA DE VALCARCE': { bandera: 'VALCARCE', ubicacion: 'A-6, KM 419, Vega de Valcarce, León' },
  'HOILA TOLEDO': { bandera: 'HOILA', ubicacion: 'Autovía A-42, KM 65, Olías del Rey, Toledo' },
  'PETREM FIGUERES': { bandera: 'PETREM', ubicacion: 'Carretera N-IIa, KM 756, Figueres, Girona' },
};

export function PdfGeneratorManager({ selectedDate }: PdfGeneratorProps) {
  const [selectedTariff, setSelectedTariff] = useState('TARIFA 12');
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [searchFilter, setSearchFilter] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const allStations = [...PROPIAS_STATIONS, ...COLABORADORA_STATIONS];
  const filteredStations = allStations.filter((st) =>
    st.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Markup por tarifa
  const getTariffMarkup = (tariffName: string): number => {
    if (tariffName.includes('12')) return 0.120;
    if (tariffName.includes('18')) return 0.126;
    if (tariffName.includes('24')) return 0.132;
    if (tariffName.includes('36')) return 0.144;
    if (tariffName.includes('40')) return 0.148;
    if (tariffName.includes('42')) return 0.150;
    if (tariffName.includes('45') || tariffName.includes('47')) return 0.155;
    if (tariffName.includes('50')) return 0.160;
    if (tariffName.includes('60')) return 0.170;
    if (tariffName.includes('AMAEXO')) return 0.118;
    if (tariffName.includes('NORIEGA')) return 0.122;
    if (tariffName.includes('E100')) return 0.124;
    if (tariffName.includes('ECO')) return 0.110;
    return 0.125;
  };

  const currentMarkup = getTariffMarkup(selectedTariff);

  const getStationPrice = (stName: string, isPropia: boolean) => {
    const hash = stName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (hash % 10) * 0.002;
    const base = isPropia ? 1.1520 + offset : 1.1560 + offset;
    const sinIva = Number((base + currentMarkup).toFixed(4));
    const conIva = Number((sinIva * 1.21).toFixed(4));
    return { sinIva, conIva };
  };

  const handlePrintPdf = (stName?: string) => {
    const cleanTariffName = selectedTariff.replace(/\s+/g, '_').toUpperCase();
    const fileName = stName
      ? `${cleanTariffName}_${stName.replace(/\s+/g, '_')}_${targetDate}.pdf`
      : `${cleanTariffName}_${targetDate}.pdf`;

    const originalTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = originalTitle;

    setDownloadNotice(fileName);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Emisión Oficial de Tarifas & Descarga de PDFs</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Generador Oficial de PDFs para Clientes
            </h2>
            <p className="text-slate-400 text-sm">
              Formato exacto al documento de tarifas del Excel con datos de <strong>E.E.S.S</strong>, <strong>Bandera</strong>, <strong>Ubicación</strong>, <strong>Sin IVA</strong> y <strong>Con IVA (+21%)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handlePrintPdf()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Descargar / Imprimir PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: Select Tariff & Date */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Fecha de Validez del Documento:
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Buscar Estación en el PDF:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar estaciones por nombre o ubicación..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tariffs Carousel / Grid */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Seleccionar Tarifa del Sistema:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {TARIFFS.map((tName) => (
              <button
                key={tName}
                onClick={() => setSelectedTariff(tName)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold truncate ${
                  selectedTariff === tName
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW (EXACT FORMAT AS EXCEL SHEET) */}
      <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-300 space-y-6 print:p-0 print:border-none print:shadow-none">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-slate-950">AREA 117</span>
              <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">RED PETRÓLEO</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
              CONDICIONES DE SUMINISTRO — {selectedTariff}
            </h1>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-xs font-bold text-slate-500 uppercase block">Fecha de Aplicación:</span>
            <span className="text-base font-black text-slate-950 font-mono">{targetDate}</span>
          </div>
        </div>

        {/* HVO Banner Highlights (Tal como en el Excel) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="font-black text-amber-900 block text-[11px] uppercase">
                GASÓLEO HVO EN ALFAJARÍN — ALFA ENERGÍA
              </span>
              <span className="text-slate-600 text-[10px]">Hidrobiodiésel Renovable</span>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs font-bold text-amber-950 block">SIN IVA: 1,256 €/L</span>
              <span className="text-[10px] text-amber-800">CON IVA: 1,520 €/L</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="font-black text-amber-900 block text-[11px] uppercase">
                GASÓLEO HVO EN VALDEMORO — AREA 117
              </span>
              <span className="text-slate-600 text-[10px]">Hidrobiodiésel Renovable</span>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs font-bold text-amber-950 block">SIN IVA: 1,347 €/L</span>
              <span className="text-[10px] text-amber-800">CON IVA: 1,630 €/L</span>
            </div>
          </div>
        </div>

        {/* Stations Table */}
        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3 w-12 text-center">Nº</th>
                <th className="py-2.5 px-3">E.E.S.S</th>
                <th className="py-2.5 px-3">Bandera</th>
                <th className="py-2.5 px-3">Ubicación</th>
                <th className="py-2.5 px-3 text-right">Sin IVA</th>
                <th className="py-2.5 px-3 text-right">Con IVA 21%</th>
                <th className="py-2.5 px-3 text-center print:hidden">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filteredStations.map((st, idx) => {
                const isPropia = st.type === 'PROPIA';
                const prices = getStationPrice(st.name, isPropia);
                const meta = STATIONS_METADATA[st.name] || {
                  bandera: isPropia ? 'AREA 117' : 'VALCARCE',
                  ubicacion: 'Red de Estaciones de Servicio',
                };

                return (
                  <tr key={st.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-950">
                      {st.name}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-300">
                        {meta.bandera}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      {meta.ubicacion}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                      {prices.sinIva.toFixed(3).replace('.', ',')} €
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-700 text-xs bg-emerald-50/50">
                      {prices.conIva.toFixed(3).replace('.', ',')} €
                    </td>
                    <td className="py-2 px-3 text-center print:hidden">
                      <button
                        onClick={() => handlePrintPdf(st.name)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 rounded font-bold text-[10px] border border-slate-300 transition-colors"
                        title="Descargar PDF exclusivo de esta estación"
                      >
                        PDF Individual
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Document Footer */}
        <div className="pt-4 border-t border-slate-200 text-slate-500 text-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Área 117 — Sistema Automatizado de Gestión de Tarifas Petrolíferas</span>
          <span>Validez sujeta a variaciones de mercado. IVA 21% incluido en columna correspondiente.</span>
        </div>
      </div>

      {/* Confirmation Toast */}
      {downloadNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="h-5 w-5" />
          <span>Generando documento: {downloadNotice}</span>
        </div>
      )}
    </div>
  );
}
