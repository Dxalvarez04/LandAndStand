"use client";

/** PERSONA 3 · Quién camina: población, tripulante editable o pareja. */
import type { Modo, Tripulante } from "@/lib/contract";

interface Props {
  modo: Modo;
  tripulantes: Tripulante[];
  onModo: (m: Modo) => void;
  onTripulantes: (t: Tripulante[]) => void;
}

const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: "poblacion", etiqueta: "Población" },
  { valor: "tripulante", etiqueta: "Tripulante" },
  { valor: "pareja", etiqueta: "Pareja" },
];

export default function SelectorCaminante({ modo, tripulantes, onModo, onTripulantes }: Props) {
  const visibles = modo === "tripulante" ? tripulantes.slice(0, 1) : modo === "pareja" ? tripulantes.slice(0, 2) : [];
  const editar = (i: number, campo: keyof Tripulante, v: number) =>
    onTripulantes(tripulantes.map((t, j) => (j === i ? { ...t, [campo]: v } : t)));

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1">Quién camina</legend>
      <div className="flex gap-2">
        {MODOS.map((m) => (
          <button
            key={m.valor}
            onClick={() => onModo(m.valor)}
            className={`rounded px-2 py-1 ${modo === m.valor ? "bg-amber-600 text-white" : "bg-stone-700"}`}
          >
            {m.etiqueta}
          </button>
        ))}
      </div>
      {visibles.map((t, i) => (
        <div key={i} className="flex gap-2">
          <label>
            VO₂pre{" "}
            <input className="w-16 rounded bg-stone-800 px-1" type="number" value={t.vo2pre} onChange={(e) => editar(i, "vo2pre", Number(e.target.value))} />
          </label>
          <label>
            Masa{" "}
            <input className="w-16 rounded bg-stone-800 px-1" type="number" value={t.masa} onChange={(e) => editar(i, "masa", Number(e.target.value))} />
          </label>
        </div>
      ))}
    </fieldset>
  );
}
