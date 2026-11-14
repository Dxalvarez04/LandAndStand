"use client";

/** PERSONA 3 · Quién camina: tripulante editable, pareja o grupo. */
import type { Modo, Tripulante } from "@/lib/contract";

interface Props {
  modo: Modo;
  tripulantes: Tripulante[];
  onModo: (m: Modo) => void;
  onTripulantes: (t: Tripulante[]) => void;
}

const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: "tripulante", etiqueta: "Tripulante" },
  { valor: "pareja", etiqueta: "Pareja" },
  { valor: "grupo", etiqueta: "Grupo" },
];

export default function SelectorCaminante({ modo, tripulantes, onModo, onTripulantes }: Props) {
  const visibles =
    modo === "tripulante"
      ? tripulantes.slice(0, 1)
      : modo === "pareja"
        ? tripulantes.slice(0, 2)
        : tripulantes;

  const editar = (i: number, campo: keyof Tripulante, v: number) =>
    onTripulantes(tripulantes.map((t, j) => (j === i ? { ...t, [campo]: v } : t)));

  const anadirAstronauta = () => {
    onTripulantes([...tripulantes, { vo2pre: 38, masa: 75 }]);
  };

  const quitarAstronauta = (idx: number) => {
    if (tripulantes.length <= 2) return;
    onTripulantes(tripulantes.filter((_, j) => j !== idx));
  };

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-semibold">Quién camina</legend>
      <div className="flex gap-2">
        {MODOS.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => {
              if (m.valor === "grupo" && tripulantes.length < 3) {
                // Si pasamos a grupo y hay menos de 3, completamos a 3
                onTripulantes([
                  tripulantes[0] ?? { vo2pre: 40.6, masa: 75 },
                  tripulantes[1] ?? { vo2pre: 36, masa: 82 },
                  { vo2pre: 42, masa: 70 },
                ]);
              }
              onModo(m.valor);
            }}
            className={`rounded px-3 py-1 font-medium transition-colors ${
              modo === m.valor ? "bg-amber-600 text-white" : "bg-stone-700 hover:bg-stone-600 text-stone-200"
            }`}
          >
            {m.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {visibles.map((t, i) => (
          <div key={i} className="flex items-center gap-2 rounded bg-stone-900/60 p-2 border border-stone-800">
            <span className="text-xs text-stone-400 font-mono w-6">A{i + 1}</span>
            <label className="flex items-center gap-1 text-xs">
              VO₂pre
              <input
                className="w-16 rounded bg-stone-800 px-1 py-0.5 text-right font-mono"
                type="number"
                value={t.vo2pre}
                onChange={(e) => editar(i, "vo2pre", Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-1 text-xs">
              Masa (kg)
              <input
                className="w-16 rounded bg-stone-800 px-1 py-0.5 text-right font-mono"
                type="number"
                value={t.masa}
                onChange={(e) => editar(i, "masa", Number(e.target.value))}
              />
            </label>
            {modo === "grupo" && tripulantes.length > 2 && (
              <button
                type="button"
                onClick={() => quitarAstronauta(i)}
                className="ml-auto text-xs text-red-400 hover:text-red-300 px-1"
                title="Eliminar del grupo"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {modo === "grupo" && (
        <button
          type="button"
          onClick={anadirAstronauta}
          className="mt-1 self-start rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2 py-1 text-xs text-amber-400 font-medium"
        >
          + Añadir astronauta al grupo
        </button>
      )}
    </fieldset>
  );
}

