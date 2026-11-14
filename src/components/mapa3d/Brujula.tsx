"use client";

/**
 * Abajo a la derecha del 3D: atribución (acceso a las fuentes), escala (solo en cenital, donde es
 * constante) y brújula que gira con la cámara: la flecha siempre apunta al norte del terreno.
 */
import { useIdioma } from "@/lib/i18n";

const PASOS_M = [50, 100, 200, 250, 500, 1000, 2000, 5000];
const SOMBRA = "[text-shadow:0_0_3px_rgba(6,10,23,1),0_0_6px_rgba(6,10,23,0.9)]";

interface Props {
  azimut: number;
  /** Metros por píxel en el centro (solo se usa en cenital) */
  mPorPx: number | null;
  onFuentes: () => void;
  textoFuentes: string;
}

export default function Brujula({ azimut, mPorPx, onFuentes, textoFuentes }: Props) {
  const { t, distancia } = useIdioma();
  let escala: { m: number; px: number } | null = null;
  if (mPorPx && mPorPx > 0) {
    const m = [...PASOS_M].reverse().find((v) => v / mPorPx <= 110) ?? PASOS_M[0];
    escala = { m, px: m / mPorPx };
  }
  return (
    <div className={`pointer-events-none absolute bottom-3 right-4 z-20 flex flex-col items-end gap-2 text-[12px] text-[#eaf0ff] ${SOMBRA}`}>
      <button
        type="button"
        data-no-zoom
        onClick={(e) => {
          e.stopPropagation();
          onFuentes();
        }}
        className="pointer-events-auto -my-3 -mr-2 flex h-11 items-center px-2 text-[11.5px] text-[#d9dfee] outline-none hover:text-white focus-visible:text-white"
      >
        <span className="underline decoration-[#d9dfee]/50 underline-offset-2">{t.fuentes}</span>
        <span className="hidden sm:inline">&nbsp;· {textoFuentes}</span>
      </button>
      <div className="flex items-end gap-4">
        {escala && (
          <div className="flex flex-col items-start gap-1">
            <span className="tabular-nums">{distancia(escala.m)}</span>
            <div className="h-[5px] border-x border-b border-[#eaf0ff] [filter:drop-shadow(0_0_2px_rgba(6,10,23,1))]" style={{ width: escala.px }} />
          </div>
        )}
        <div
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#060a17]/75 ring-1 ring-inset ring-[#a0beff]/20"
          role="img"
          aria-label={t.norteA(Math.round(((azimut % 360) + 360) % 360))}
        >
          {/* Rosa: marcas cada 45°, aguja de rombo (mitad norte clara, mitad sur apagada) y la N en la punta */}
          <svg width="48" height="48" viewBox="-24 -24 48 48" style={{ transform: `rotate(${azimut}deg)` }} aria-hidden>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
              <line
                key={g}
                x1="0"
                y1={g % 90 === 0 ? -21 : -21.5}
                x2="0"
                y2={g % 90 === 0 ? -18 : -20}
                stroke="#eaf0ff"
                strokeOpacity={g === 0 ? 0 : 0.45}
                strokeWidth="1.2"
                transform={`rotate(${g})`}
              />
            ))}
            <path d="M0 -12 L3.2 0 L-3.2 0 Z" fill="#eaf0ff" />
            <path d="M0 12 L3.2 0 L-3.2 0 Z" fill="#eaf0ff" opacity="0.28" />
            <text
              x="0"
              y="-15"
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="#eaf0ff"
              transform={`rotate(${-azimut} 0 -17.5)`}
              style={{ fontFamily: "inherit" }}
            >
              N
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
