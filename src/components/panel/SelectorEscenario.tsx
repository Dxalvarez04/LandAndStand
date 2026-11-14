"use client";

import type { FWalk } from "@/lib/contract";

interface Props {
  fwalk: FWalk;
  onFwalk: (f: FWalk) => void;
}

const OPCIONES_INTENSIDAD: { valor: FWalk; label: string }[] = [
  { valor: 0.3, label: "30 %" },
  { valor: 0.35, label: "35 %" },
  { valor: 0.4, label: "40 %" },
  { valor: 0.45, label: "45 %" },
  { valor: 0.5, label: "50 %" },
];

/**
 * PERSONA 3 · Intensidad aproximada empleado.
 * Slider con marcas equivalentes cada 5 %, de 30 % a 50 %.
 * Cada posición corresponde exactamente con su porcentaje.
 */
export default function SelectorEscenario({ fwalk, onFwalk }: Props) {
  // Buscar índice actual; si es "U", por defecto cae en 35 % (índice 1)
  const indiceActual = OPCIONES_INTENSIDAD.findIndex((o) => o.valor === fwalk);
  const indice = indiceActual >= 0 ? indiceActual : 1;
  const opcionActiva = OPCIONES_INTENSIDAD[indice];

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Intensidad aproximada empleado</span>
        <span className="rounded-full border border-stone-700 bg-stone-800 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-400">
          {opcionActiva.label}
        </span>
      </div>

      <div className="relative pt-1 pb-4">
        <input
          type="range"
          min={0}
          max={OPCIONES_INTENSIDAD.length - 1}
          step={1}
          value={indice}
          onChange={(e) => onFwalk(OPCIONES_INTENSIDAD[Number(e.target.value)].valor)}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-700 accent-amber-500"
        />

        {/* Marcas de porcentaje alineadas exactamente con cada posición del slider */}
        <div className="relative h-4 w-full">
          {OPCIONES_INTENSIDAD.map((opc, i) => {
            const porcentajeX = (i / (OPCIONES_INTENSIDAD.length - 1)) * 100;
            const esPrimero = i === 0;
            const esUltimo = i === OPCIONES_INTENSIDAD.length - 1;

            return (
              <span
                key={opc.label}
                style={{ left: `${porcentajeX}%` }}
                className={`absolute top-1 text-[10px] font-mono whitespace-nowrap transition-colors ${
                  indice === i ? "text-amber-400 font-bold" : "text-stone-400"
                } ${
                  esPrimero
                    ? "translate-x-0"
                    : esUltimo
                    ? "-translate-x-full"
                    : "-translate-x-1/2"
                }`}
              >
                {opc.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
