"use client";

/** PERSONA 3 · Escenarios: intensidad (f_walk) y energía del traje. */
import type { EnergiaHoras, FWalk } from "@/lib/contract";

interface Props {
  fwalk: FWalk;
  energiaHoras: EnergiaHoras;
  onFwalk: (f: FWalk) => void;
  onEnergia: (e: EnergiaHoras) => void;
}

const OPCIONES_FWALK: { valor: FWalk; etiqueta: string }[] = [
  { valor: "U", etiqueta: "30–40 % (por defecto)" },
  { valor: 0.3, etiqueta: "30 %" },
  { valor: 0.35, etiqueta: "35 %" },
  { valor: 0.4, etiqueta: "40 %" },
  { valor: 0.47, etiqueta: "47 % (simulaciones lunares)" },
  { valor: 0.5, etiqueta: "50 % (prueba de estrés)" },
];

export default function SelectorEscenario({ fwalk, energiaHoras, onFwalk, onEnergia }: Props) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-1">
        Intensidad
        <select
          className="rounded bg-stone-800 px-1 py-1"
          value={String(fwalk)}
          onChange={(e) => onFwalk(e.target.value === "U" ? "U" : (Number(e.target.value) as FWalk))}
        >
          {OPCIONES_FWALK.map((o) => (
            <option key={String(o.valor)} value={String(o.valor)}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Energía del traje
        <select
          className="rounded bg-stone-800 px-1 py-1"
          value={energiaHoras}
          onChange={(e) => onEnergia(Number(e.target.value) as EnergiaHoras)}
        >
          <option value={6}>6 h (por defecto)</option>
          <option value={4}>4 h (diseño del Apolo)</option>
        </select>
      </label>
    </div>
  );
}
