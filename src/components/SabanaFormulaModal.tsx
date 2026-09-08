'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Calculator, Search, Check, AlertCircle, RotateCcw,
  Layers, Fuel, Table, Star, Flame, FileSpreadsheet
} from 'lucide-react';
import {
  getProgramVariables,
  evaluateFormula
} from '@/lib/sabanaFormulaEngine';

interface SabanaFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellKey: string;
  cellTitle: string;
  cellDefaultValue: number;
  currentFormula?: string;
  selectedDate: string;
  onSave: (formulaStr: string, evaluatedVal: number) => void;
  onRemove: () => void;
  onApplyToColumn?: (formulaStr: string) => void;
  columnLabel?: string;
}

export function SabanaFormulaModal({
  isOpen,
  onClose,
  cellKey,
  cellTitle,
  cellDefaultValue,
  currentFormula,
  selectedDate,
  onSave,
  onRemove,
  onApplyToColumn,
  columnLabel,
}: SabanaFormulaModalProps) {
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [activeWindowTab, setActiveWindowTab] = useState<'all' | 'compras' | 'postes' | 'especial' | 'sabana' | 'bronco'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar variables de todo el programa
  const { list: variablesList, map: variablesMap } = useMemo(() => {
    return getProgramVariables(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      const initial = currentFormula && currentFormula.trim() !== ''
        ? currentFormula
        : `=${cellDefaultValue.toFixed(3)}`;
      setFormulaInput(initial);
      setSearchQuery('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, currentFormula, cellDefaultValue]);

  // Evaluación en tiempo real
  const evalResult = useMemo(() => {
    return evaluateFormula(formulaInput, variablesMap);
  }, [formulaInput, variablesMap]);

  if (!isOpen) return null;

  // Insertar texto o token en la fórmula
  const handleInsertToken = (token: string) => {
    const tokenStr = `[${token}]`;
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? formulaInput.length;
      const end = input.selectionEnd ?? formulaInput.length;
      const before = formulaInput.substring(0, start);
      const after = formulaInput.substring(end);
      
      let nextFormula = '';
      if (!before.startsWith('=')) {
        nextFormula = `=${before}${tokenStr}${after}`;
      } else {
        nextFormula = `${before}${tokenStr}${after}`;
      }
      setFormulaInput(nextFormula);
      setTimeout(() => {
        input.focus();
        const newPos = (before.startsWith('=') ? start : start + 1) + tokenStr.length;
        input.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setFormulaInput((prev) => {
        if (!prev.startsWith('=')) return `=${prev}${tokenStr}`;
        return `${prev}${tokenStr}`;
      });
    }
  };

  // Insertar operador rápido
  const handleInsertOperator = (op: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? formulaInput.length;
      const end = input.selectionEnd ?? formulaInput.length;
      const before = formulaInput.substring(0, start);
      const after = formulaInput.substring(end);

      let next = `${before} ${op} ${after}`;
      if (!before.startsWith('=')) {
        next = `=${next.trim()}`;
      }
      setFormulaInput(next);
      setTimeout(() => {
        input.focus();
        const newPos = start + op.length + 2;
        input.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setFormulaInput((prev) => `${prev} ${op} `);
    }
  };

  // Filtrado de variables
  const filteredVariables = variablesList.filter((v) => {
    const matchesTab = activeWindowTab === 'all' || v.windowId === activeWindowTab;
    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      v.fieldLabel.toLowerCase().includes(q) ||
      (v.stationName && v.stationName.toLowerCase().includes(q)) ||
      v.groupName.toLowerCase().includes(q) ||
      v.token.toLowerCase().includes(q)
    );
  });

  const handleSave = () => {
    if (!evalResult.success) return;
    onSave(formulaInput.trim(), evalResult.value);
    onClose();
  };

  const handleApplyToColumn = () => {
    if (!evalResult.success || !onApplyToColumn) return;
    if (window.confirm(`¿Deseas aplicar esta fórmula a todas las estaciones de la columna "${columnLabel || 'seleccionada'}"?`)) {
      onApplyToColumn(formulaInput.trim());
      onClose();
    }
  };

  const isModified = Boolean(currentFormula && currentFormula.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Editor de Fórmulas Tipo Excel
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  Modo Formular
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Celda: <strong className="text-white">{cellTitle}</strong> • Valor Base: <span className="font-mono text-amber-300 font-bold">{cellDefaultValue.toFixed(3)} €</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* 1. Formula Input Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300 flex items-center space-x-1.5">
                <span className="font-mono bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[11px]">fx</span>
                <span>Barra de Fórmula / Valor Matemático:</span>
              </label>
              <span className="text-slate-500 text-[11px]">
                Escribe un número directo o fórmula con '=' (ej: = [COMPRAS:ARCOS:COSTO_TOTAL] + 0.018 * 1.21)
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                placeholder="Ejemplo: = [COMPRAS:ARCOS:COSTO_TOTAL] + 0.018 * 1.21"
                className="w-full bg-slate-950 border-2 border-amber-500/50 rounded-2xl px-4 py-3 text-sm sm:text-base font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-inner"
              />
            </div>

            {/* Live Evaluated Preview Box */}
            <div className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              evalResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center space-x-2.5">
                {evalResult.success ? (
                  <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                )}
                <div className="text-xs">
                  {evalResult.success ? (
                    <div>
                      <span className="text-slate-400">Resultado Evaluado: </span>
                      <strong className="text-lg font-mono font-black text-emerald-400">
                        {evalResult.value.toFixed(3)} €
                      </strong>
                      <span className="ml-3 text-[11px] text-slate-400">
                        (Diferencia vs base: {(evalResult.value - cellDefaultValue >= 0 ? '+' : '') + (evalResult.value - cellDefaultValue).toFixed(3)} €)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <strong className="text-rose-300 font-bold">Error en la fórmula: </strong>
                      <span>{evalResult.error}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono text-right">
                {evalResult.success && (
                  <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    Formato oficial 3 decimales
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Quick Math Operator Keyboard */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>Operadores Matemáticos Rápidos:</span>
              <span className="text-slate-500">Haz clic para insertar en la fórmula</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['+', '-', '*', '/', '(', ')'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => handleInsertOperator(op)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all border border-slate-700"
                >
                  {op}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleInsertOperator('* 1.21')}
                className="px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 rounded-xl text-xs font-mono font-bold transition-all border border-emerald-500/30"
                title="Multiplica por 1.21 para aplicar el 21% de IVA"
              >
                + 21% IVA (* 1.21)
              </button>

              <button
                type="button"
                onClick={() => handleInsertOperator('/ 1.21')}
                className="px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 rounded-xl text-xs font-mono font-bold transition-all border border-emerald-500/30"
                title="Divide entre 1.21 para quitar el 21% de IVA"
              >
                - 21% IVA (/ 1.21)
              </button>

              <button
                type="button"
                onClick={() => handleInsertOperator('+ 0.008')}
                className="px-3 py-1.5 bg-blue-950/50 hover:bg-blue-500 hover:text-slate-950 text-blue-300 rounded-xl text-xs font-mono font-bold transition-all border border-blue-500/30"
              >
                + 0,008 €
              </button>

              <button
                type="button"
                onClick={() => handleInsertOperator('+ 0.015')}
                className="px-3 py-1.5 bg-purple-950/50 hover:bg-purple-500 hover:text-slate-950 text-purple-300 rounded-xl text-xs font-mono font-bold transition-all border border-purple-500/30"
                title="Porte 0.005 + Pase 0.010"
              >
                + 0,015 € (Porte+Pase)
              </button>

              <button
                type="button"
                onClick={() => setFormulaInput('=')}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-500 hover:text-white text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-500/30 ml-auto"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* 3. Catalog of System Cells from ANY Window */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                  <Layers className="h-4 w-4 text-amber-400" />
                  <span>Seleccionar Celda de Cualquier Ventana del Programa:</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Haz clic sobre cualquier celda para insertarla automáticamente como variable en tu fórmula.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar estación o campo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Window Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Todas las Ventanas', icon: Layers },
                { id: 'compras', label: '⛽ Compras', icon: Fuel },
                { id: 'postes', label: '📊 Postes', icon: Table },
                { id: 'especial', label: '⭐ Tarifas Especiales', icon: Star },
                { id: 'sabana', label: '📋 Sábana de Precios', icon: FileSpreadsheet },
                { id: 'bronco', label: '🔥 Bronco', icon: Flame },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveWindowTab(tab.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      activeWindowTab === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid of Available Variables */}
            <div className="border border-slate-800 rounded-2xl bg-slate-950/80 p-3 max-h-56 overflow-y-auto">
              {filteredVariables.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No se encontraron celdas con el criterio "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredVariables.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => handleInsertToken(v.token)}
                      className="text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {v.windowName}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-amber-400">
                          {v.currentValue.toFixed(3)} €
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate mt-0.5">
                        {v.fieldLabel}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate mt-1">
                        [{v.token}]
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {isModified && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restablecer a Fórmula Original</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            {onApplyToColumn && (
              <button
                type="button"
                disabled={!evalResult.success}
                onClick={handleApplyToColumn}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                title="Aplica esta fórmula a todas las estaciones de esta columna"
              >
                Aplicar a Toda la Columna
              </button>
            )}

            <button
              type="button"
              disabled={!evalResult.success}
              onClick={handleSave}
              className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>Guardar Fórmula</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
