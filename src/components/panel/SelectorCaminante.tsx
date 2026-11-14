"use client";

/** PERSONA 3 · Quién camina: tripulante editable, pareja o grupo con 8 perfiles predefinidos. */
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

  const editar = (i: number, campo: keyof Tripulante, v: number) =>
    onTripulantes(tripulantes.map((t, j) => (j === i ? { ...t, [campo]: v } : t)));

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
      <legend className="mb-1 font-semibold">Quién camina</legend>

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
      <div className="flex flex-col gap-2 mt-1">
        {visibles.map((t, i) => {
          const perfilCoincidente = PERFILES_ASTRONAUTAS.find(
            (p) => Math.abs(p.vo2pre - t.vo2pre) < 0.05 && p.masa === t.masa,
          );

          return (
            <div key={i} className="flex flex-col gap-1.5 rounded bg-stone-900/80 p-2 border border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 font-mono">
                  Astronauta {i + 1}
                </span>
                {modo === "grupo" && tripulantes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => quitarAstronauta(i)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold px-1"
                    title="Eliminar del grupo"
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>

              {/* Selector de perfil rápido */}
              <select
                className="w-full text-xs rounded bg-stone-800 border border-stone-700 p-1 text-stone-200"
                value={perfilCoincidente ? perfilCoincidente.id : "manual"}
                onChange={(e) => seleccionarPerfil(i, e.target.value)}
              >
                {!perfilCoincidente && <option value="manual">Personalizado (Manual)</option>}
                {PERFILES_ASTRONAUTAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.nombre} ({p.arquetipo})
                  </option>
                ))}
              </select>

              {perfilCoincidente && (
                <p className="text-[11px] text-stone-400 leading-tight">
                  {perfilCoincidente.descripcion}
                </p>
              )}

              {/* Ajuste fino manual */}
              <div className="flex gap-3 text-xs pt-0.5">
                <label className="flex items-center gap-1">
                  <span className="text-stone-400">VO₂pre:</span>
                  <input
                    className="w-16 rounded bg-stone-800 px-1.5 py-0.5 text-right font-mono border border-stone-700"
                    type="number"
                    step="0.1"
                    value={t.vo2pre}
                    onChange={(e) => editar(i, "vo2pre", Number(e.target.value))}
                  />
                  <span className="text-[10px] text-stone-400">mL/kg/min</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-stone-400">Masa:</span>
                  <input
                    className="w-16 rounded bg-stone-800 px-1.5 py-0.5 text-right font-mono border border-stone-700"
                    type="number"
                    value={t.masa}
                    onChange={(e) => editar(i, "masa", Number(e.target.value))}
                  />
                  <span className="text-[10px] text-stone-400">kg</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {modo === "grupo" && (
        <button
          type="button"
          onClick={anadirAstronauta}
          className="mt-1 self-start rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1 text-xs text-amber-400 font-medium transition-colors"
        >
          + Añadir astronauta al grupo
        </button>
      )}
    </fieldset>
  );
}


