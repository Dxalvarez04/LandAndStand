"use client";

import { useState } from "react";
import type { Modo, Tripulante } from "@/lib/contract";
import { PERFILES_ASTRONAUTAS, type PerfilAstronauta } from "@/lib/data/perfiles";
import { enIdioma, useIdioma } from "@/lib/i18n";
import { BORDE, Chevron, CIFRA, Seccion, TEXTO } from "./comun";

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

/** Apellido para el resumen («Dra. Elena Vega» → «Vega»). */
const apellido = (nombre: string) => nombre.split(" ").slice(-1)[0];

/**
 * PERSONA 3 · Quién sale del hábitat.
 * Usa los 8 perfiles previstos al aterrizaje y permite marcar cualquier número
 * de personas, sin límite (al menos una). El modo se deduce solo: 1 tripulante,
 * 2 en pareja y 3 o más en grupo.
 */
export default function SelectorCaminante({ modo, tripulantes, onModo, onTripulantes }: Props) {
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>(() =>
    idsDesdeTripulantes(tripulantes),
  );

  const { t, idioma, num } = useIdioma();
  const etiquetaModo = t.modo[modo];
  const perfiles = PERFILES_ASTRONAUTAS.map((p) => enIdioma(p, idioma));

  const toggleTripulante = (id: string) => {
    let nuevos: string[];
    if (seleccionados.includes(id)) {
      // Mantener al menos una persona en la salida
      if (seleccionados.length === 1) return;
      nuevos = seleccionados.filter((item) => item !== id);
    } else {
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

  const elegidos = seleccionados
    .map((id) => perfiles.find((p) => p.id === id))
    .filter((p): p is PerfilAstronauta => Boolean(p));

  return (
    <Seccion
      id="titulo-caminante"
      titulo={t.caminaTitulo}
      valor={
        <span className={`text-[13px] ${TEXTO.secundario}`}>
          {etiquetaModo} <span className={`${CIFRA} text-[#eaf0ff]`}>· {seleccionados.length}</span>
        </span>
      }
    >
      {/* Resumen: quién sale, con su identificador */}
      <button
        type="button"
        onClick={() => setDesplegado((v) => !v)}
        aria-expanded={desplegado}
        aria-controls="lista-tripulantes"
        className={`flex min-h-11 w-full items-center gap-3 rounded-[3px] border ${BORDE} bg-[#060a17] px-3 py-2 text-left outline-none transition-colors hover:border-[#a0beff]/30 focus-visible:border-[#eaf0ff]/60`}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-0.5">
          {elegidos.length ? (
            elegidos.map((p) => (
              <span key={p.id} className="whitespace-nowrap text-[13.5px] text-[#eaf0ff]">
                <span className={`${CIFRA} mr-1 text-[11.5px] ${TEXTO.terciario}`}>{p.id}</span>
                {apellido(p.nombre)}
              </span>
            ))
          ) : (
            <span className={`text-[13.5px] ${TEXTO.terciario}`}>{t.elegirTripulantes}</span>
          )}
        </span>
        <span className={`shrink-0 text-[12px] ${TEXTO.terciario}`}>{desplegado ? t.cerrar : t.cambiar}</span>
        <Chevron abierto={desplegado} />
      </button>

      {/* Los 8 perfiles previstos: se marca a quienes salen (sin límite) */}
      {desplegado && (
        <ul id="lista-tripulantes" className={`mt-2 divide-y divide-[#a0beff]/[0.1] rounded-[3px] border ${BORDE} bg-[#060a17]`}>
          {perfiles.map((p: PerfilAstronauta) => {
            const marcado = seleccionados.includes(p.id);
            const ultimo = marcado && seleccionados.length === 1;
            return (
              <li key={p.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.03] ${ultimo ? "cursor-not-allowed" : ""}`}
                  title={ultimo ? t.alMenosUno : undefined}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => toggleTripulante(p.id)}
                    className="peer sr-only"
                  />
                  {/* Casilla propia (cuadrada, como el resto de la interfaz) */}
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff8fd8]/60 ${
                      marcado ? "border-[#eaf0ff] bg-[#eaf0ff]" : "border-[#a0beff]/45"
                    }`}
                  >
                    {marcado && (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                        <path d="M1.8 5.2 4 7.3 8.2 2.7" fill="none" stroke="#060a17" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[13.5px] text-[#eaf0ff]">
                        <span className={`${CIFRA} mr-1.5 text-[11.5px] ${TEXTO.terciario}`}>{p.id}</span>
                        {p.nombre}
                      </span>
                      <span className={`${CIFRA} shrink-0 text-[11.5px] ${TEXTO.secundario}`}>
                        {num(p.vo2pre)} · {p.masa} kg
                      </span>
                    </span>
                    <span className={`block truncate text-[12px] ${TEXTO.terciario}`}>
                      {p.rol} · {p.arquetipo}
                    </span>
                    {marcado && <span className={`mt-1 block text-[12px] leading-snug ${TEXTO.secundario}`}>{p.descripcion}</span>}
                  </span>
                </label>
              </li>
            );
          })}
          <li className={`px-3 py-2 text-[11.5px] ${TEXTO.terciario}`}>
            {t.notaPerfiles}
          </li>
        </ul>
      )}
    </Seccion>
  );
}
