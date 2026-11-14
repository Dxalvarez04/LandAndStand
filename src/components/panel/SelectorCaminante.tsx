"use client";

/**
 * PERSONA 3 · Quién camina: tripulante, pareja o grupo.
 * Los valores de VO₂ y masa no son editables porque en Marte no se pueden medir in situ;
 * provienen de las estimaciones y perfiles modelados antes del aterrizaje.
 */
import type { Modo, Tripulante } from "@/lib/contract";
import { PERFILES_ASTRONAUTAS, buscarPerfil } from "@/lib/data/perfiles";

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

  const seleccionarPerfil = (i: number, perfilId: string) => {
    const p = buscarPerfil(perfilId);
    if (!p) return;
    onTripulantes(tripulantes.map((t, j) => (j === i ? { vo2pre: p.vo2pre, masa: p.masa } : t)));
  };

  const anadirAstronauta = () => {
    // Escoger el primer perfil que aún no esté en el grupo, o el primero por defecto
    const siguiente =
      PERFILES_ASTRONAUTAS.find((p) => !tripulantes.some((t) => t.vo2pre === p.vo2pre && t.masa === p.masa)) ||
      PERFILES_ASTRONAUTAS[2];
    onTripulantes([...tripulantes, { vo2pre: siguiente.vo2pre, masa: siguiente.masa }]);
  };

  const quitarAstronauta = (idx: number) => {
    if (tripulantes.length <= 2) return;
    onTripulantes(tripulantes.filter((_, j) => j !== idx));
  };

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <legend className="font-semibold text-stone-200">Quién camina</legend>
        <span className="text-[11px] text-stone-400 italic">Perfiles previstos al aterrizaje</span>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2">
        {MODOS.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => {
              if (m.valor === "grupo" && tripulantes.length < 3) {
                onTripulantes([
                  tripulantes[0] ?? { vo2pre: PERFILES_ASTRONAUTAS[0].vo2pre, masa: PERFILES_ASTRONAUTAS[0].masa },
                  tripulantes[1] ?? { vo2pre: PERFILES_ASTRONAUTAS[1].vo2pre, masa: PERFILES_ASTRONAUTAS[1].masa },
                  { vo2pre: PERFILES_ASTRONAUTAS[3].vo2pre, masa: PERFILES_ASTRONAUTAS[3].masa },
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

      {/* Lista de astronautas activos */}
      <div className="flex flex-col gap-2.5 mt-1">
        {visibles.map((t, i) => {
          const perfilCoincidente =
            PERFILES_ASTRONAUTAS.find((p) => Math.abs(p.vo2pre - t.vo2pre) < 0.05 && p.masa === t.masa) ||
            PERFILES_ASTRONAUTAS[0];

          return (
            <div key={i} className="flex flex-col gap-2 rounded bg-stone-900/90 p-2.5 border border-stone-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 font-mono tracking-wide">
                  Astronauta {i + 1}
                </span>
                {modo === "grupo" && tripulantes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => quitarAstronauta(i)}
                    className="text-xs text-red-400 hover:text-red-300 font-medium px-1"
                    title="Eliminar de la expedición"
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>

              {/* Selector de perfil */}
              <select
                className="w-full text-xs rounded bg-stone-800 border border-stone-700 p-1.5 text-stone-200 font-medium focus:outline-none focus:border-amber-500"
                value={perfilCoincidente.id}
                onChange={(e) => seleccionarPerfil(i, e.target.value)}
              >
                {PERFILES_ASTRONAUTAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.nombre} ({p.rol})
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-stone-400 leading-snug">
                {perfilCoincidente.descripcion}
              </p>

              {/* Indicadores fijos no editables */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-800/80">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-800/70 border border-stone-700/50 text-xs">
                  <span className="text-stone-400 text-[11px]">VO₂pre:</span>
                  <span className="font-mono font-bold text-amber-400">{perfilCoincidente.vo2pre.toFixed(1)}</span>
                  <span className="text-[10px] text-stone-400">mL/kg/min</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-800/70 border border-stone-700/50 text-xs">
                  <span className="text-stone-400 text-[11px]">Masa estimada:</span>
                  <span className="font-mono font-bold text-stone-200">{perfilCoincidente.masa}</span>
                  <span className="text-[10px] text-stone-400">kg</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-stone-800/40 text-[11px] text-stone-400 ml-auto">
                  {perfilCoincidente.arquetipo}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modo === "grupo" && (
        <button
          type="button"
          onClick={anadirAstronauta}
          className="mt-1 self-start rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 text-xs text-amber-400 font-medium transition-colors"
        >
          + Añadir astronauta al grupo
        </button>
      )}
    </fieldset>
  );
}



