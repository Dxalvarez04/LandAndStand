"use client";

import { useState } from "react";
import type { Modo, Tripulante } from "@/lib/contract";
import { PERFILES_ASTRONAUTAS, type PerfilAstronauta } from "@/lib/data/perfiles";

interface Props {
  modo: Modo;
  tripulantes: Tripulante[];
  onModo: (m: Modo) => void;
  onTripulantes: (t: Tripulante[]) => void;
}

function idsDesdeTripulantes(tripulantes: Tripulante[]): string[] {
  const ids = tripulantes
    .map(
      (t) =>
        PERFILES_ASTRONAUTAS.find(
          (p) => Math.abs(p.vo2pre - t.vo2pre) < 0.05 && p.masa === t.masa,
        )?.id,
    )
    .filter((id): id is string => Boolean(id));

  return ids.length > 0
    ? Array.from(new Set(ids))
    : [PERFILES_ASTRONAUTAS[1].id, PERFILES_ASTRONAUTAS[0].id];
}

/**
 * PERSONA 3 · Selector de tripulantes de la expedición.
 * Usa los 8 perfiles previstos al aterrizaje y permite marcar cualquier número
 * de personas, sin límite. El modo se deduce automáticamente: 1 tripulante,
 * 2 en pareja y 3 o más en grupo.
 */
export default function SelectorCaminante({ modo, tripulantes, onModo, onTripulantes }: Props) {
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>(() =>
    idsDesdeTripulantes(tripulantes),
  );

  const etiquetaModo = modo === "tripulante" ? "Tripulante" : modo === "pareja" ? "Pareja" : "Grupo";

  const toggleTripulante = (id: string) => {
    let nuevos: string[];
    if (seleccionados.includes(id)) {
      // Mantener al menos una persona en la salida
      if (seleccionados.length === 1) return;
      nuevos = seleccionados.filter((item) => item !== id);
    } else {
      // Sin límite: se añade a la expedición
      nuevos = [...seleccionados, id];
    }

    setSeleccionados(nuevos);

    const tripulantesData: Tripulante[] = nuevos.map((idAstro) => {
      const p =
        PERFILES_ASTRONAUTAS.find((perfil) => perfil.id === idAstro) ??
        PERFILES_ASTRONAUTAS[0];
      return { vo2pre: p.vo2pre, masa: p.masa };
    });

    const nuevoModo: Modo =
      nuevos.length === 1 ? "tripulante" : nuevos.length === 2 ? "pareja" : "grupo";
    onModo(nuevoModo);
    onTripulantes(tripulantesData);
  };

  const nombresSeleccionados = seleccionados
    .map((id) => PERFILES_ASTRONAUTAS.find((p) => p.id === id)?.nombre)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative rounded-xl border border-stone-800 bg-stone-900/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
          Quién camina
        </span>
        <span className="rounded-full border border-stone-700 bg-stone-800 px-2 py-0.5 text-[11px] font-mono text-amber-400">
          {seleccionados.length} · {etiquetaModo}
        </span>
      </div>

      {/* Botón activador del desplegable */}
      <button
        type="button"
        onClick={() => setDesplegado((v) => !v)}
        aria-expanded={desplegado}
        aria-controls="lista-tripulantes"
        className="flex w-full items-center justify-between rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-left text-xs transition hover:border-stone-600 focus:outline-none"
      >
        <span className="line-clamp-2 pr-2 text-left text-xs font-medium leading-snug text-white">
          {nombresSeleccionados || "Seleccionar tripulantes..."}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-stone-400">
          {desplegado ? "▲" : "▼"}
        </span>
      </button>

      {/* Menú desplegable con checklist */}
      {desplegado && (
        <div
          id="lista-tripulantes"
          className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-lg border border-stone-700 bg-stone-950 p-2 shadow-xl"
        >
          <div className="px-1 pb-1 text-[10px] text-stone-400">
            Marca a quienes saldrán (sin límite):
          </div>
          {PERFILES_ASTRONAUTAS.map((p: PerfilAstronauta) => {
            const marcado = seleccionados.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2 text-xs transition ${
                  marcado
                    ? "border-amber-500/40 bg-amber-500/15 text-white"
                    : "border-transparent text-stone-300 hover:bg-stone-900"
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => toggleTripulante(p.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-stone-700 bg-stone-900 accent-amber-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 font-mono text-[9px] font-bold text-amber-500">
                      {p.id}
                    </span>
                    <p className="truncate font-semibold leading-tight text-stone-100">
                      {p.nombre}
                    </p>
                  </div>
                  <p className="truncate text-[10px] leading-tight text-stone-400">
                    {p.rol} · {p.arquetipo}
                  </p>
                  <p className="font-mono text-[9px] leading-tight text-stone-500">
                    VO₂ {p.vo2pre.toFixed(1)} · {p.masa} kg
                  </p>
                  {marcado && (
                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-stone-400">
                      {p.descripcion}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
