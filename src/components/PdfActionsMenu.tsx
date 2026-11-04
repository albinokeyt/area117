'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown, Sliders } from 'lucide-react';

export function PdfActionsMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest('[role="dialog"]') && !ref.current?.contains(target)) ref.current?.removeAttribute('open');
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && ref.current?.open && !document.querySelector('[role="dialog"][aria-modal="true"]')) {
        event.preventDefault();
        ref.current.open = false; ref.current.querySelector('summary')?.focus();
      }
    };
    // Inspect modal presence before React handles Escape and unmounts the dialog.
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape, true); };
  }, []);
  return <details ref={ref} className="efi-pdf-actions">
    <summary aria-label="Opciones y descargas PDF"><Sliders size={16} /><span>Opciones y descargas</span><ChevronDown size={16} /></summary>
    <div className="efi-pdf-actions-panel" role="group" aria-label="Herramientas de PDF y clientes">{children}</div>
  </details>;
}
