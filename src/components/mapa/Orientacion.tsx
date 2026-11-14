"use client";

/**
 * Abajo a la derecha: atribución con acceso a las fuentes oficiales, escala (se ajusta al zoom) y norte.
 * Solo línea y texto.
 */
import { CELDA_M, N } from "@/lib/constants";
import { useIdioma } from "@/lib/i18n";

const PASOS_M = [50, 100, 200, 250, 500, 1000, 2000];
const SOMBRA = "[text-shadow:0_0_3px_rgba(6,10,23,1),0_0_6px_rgba(6,10,23,0.9)]";

export default function Orientacion({ tam, k, onFuentes }: { tam: number; k: number; onFuentes: () => void }) {
  const { t, distancia } = useIdioma();
  const mPorPx = (N * CELDA_M) / (tam * k);
  const maxPx = Math.min(110, tam * 0.25);
  const m = [...PASOS_M].reverse().find((v) => v / mPorPx <= maxPx) ?? PASOS_M[0];
  const px = m / mPorPx;
  return (
    <div className={`pointer-events-none absolute bottom-3 right-4 z-20 flex flex-col items-end gap-2 text-[12px] text-[#eaf0ff] ${SOMBRA}`}>
      <button
        type="button"
        data-no-zoom
        onClick={(e) => {
          e.stopPropagation();
          onFuentes();
        }}
        className="pointer-events-auto -my-3 -mr-2 flex h-11 items-center px-2 text-[11.5px] text-[#b9c6e6] outline-none hover:text-white focus-visible:text-white"
      >
        <span className="underline decoration-[#b9c6e6]/50 underline-offset-2">{t.fuentes}</span>
        <span className="hidden sm:inline">&nbsp;· USGS · NASA/JPL-Caltech</span>
      </button>
      <div className="flex items-end gap-4">
      <div className="flex flex-col items-start gap-1">
        <span className="tabular-nums">{distancia(m)}</span>
        <div className="h-[5px] border-x border-b border-[#eaf0ff] [filter:drop-shadow(0_0_2px_rgba(6,10,23,1))]" style={{ width: px }} />
      </div>
      <div className="flex flex-col items-center leading-none" aria-label={t.norteArriba}>
        <span className="text-[11px] font-medium">N</span>
        <svg width="10" height="13" viewBox="0 0 10 13" className="mt-0.5 [filter:drop-shadow(0_0_2px_rgba(6,10,23,1))]" aria-hidden>
          <path d="M5 0 L9.5 12 L5 9 L0.5 12 Z" fill="#eaf0ff" />
        </svg>
      </div>
      </div>
    </div>
  );
}
