"use client";

interface Props {
  progreso: number;
  visible: boolean;
}

/**
 * PERSONA 3 · Barra de progreso reactiva.
 * Muestra el avance del Web Worker durante la ejecución de los sorteos de Monte Carlo.
 */
export default function BarraProgreso({ progreso, visible }: Props) {
  const porcentaje = Math.round(progreso * 100);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-stone-800 bg-stone-900/90 p-2 transition-all duration-300 ${
        visible ? "opacity-100 max-h-16" : "opacity-0 max-h-0 pointer-events-none p-0 border-0"
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-[11px] font-mono text-stone-300">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-amber-400" />
          Calculando Monte Carlo...
        </span>
        <span className="font-bold text-amber-400">{porcentaje} %</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-150 ease-out"
          style={{ width: `${Math.max(4, porcentaje)}%` }}
        />
      </div>
    </div>
  );
}
