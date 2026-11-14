"use client";

interface Props {
  sol: number;
  onChange: (sol: number) => void;
}

const MARCAS_SOL = [
  { sol: 1, label: "Sol 1" },
  { sol: 7, label: "Sol 7" },
  { sol: 14, label: "Sol 14" },
  { sol: 21, label: "Sol 21" },
  { sol: 30, label: "Sol 30" },
];

/**
 * PERSONA 3 · Deslizador de Línea Temporal (Sol 1 a 30).
 * Slider directo y limpio, con etiquetas alineadas matemáticamente a cada sol.
 */
export default function DeslizadorSol({ sol, onChange }: Props) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Línea temporal</span>
        <span className="rounded-full border border-stone-700 bg-stone-800 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-400">
          Sol {sol}
        </span>
      </div>

      <div className="relative pt-1 pb-4">
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={sol}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-700 accent-amber-500"
        />

        {/* Marcas de días colocadas exactamente en la posición matemática del slider */}
        <div className="relative h-4 w-full">
          {MARCAS_SOL.map((m) => {
            const porcentaje = ((m.sol - 1) / 29) * 100;
            const esExtremoIzquierdo = m.sol === 1;
            const esExtremoDerecho = m.sol === 30;

            return (
              <span
                key={m.sol}
                style={{ left: `${porcentaje}%` }}
                className={`absolute top-1 text-[10px] font-mono whitespace-nowrap transition-colors ${
                  sol === m.sol ? "text-amber-400 font-bold" : "text-stone-400"
                } ${
                  esExtremoIzquierdo
                    ? "translate-x-0"
                    : esExtremoDerecho
                    ? "-translate-x-full"
                    : "-translate-x-1/2"
                }`}
              >
                {m.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
