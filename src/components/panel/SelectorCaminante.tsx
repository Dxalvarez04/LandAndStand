"use client";

import { useMemo, useState } from "react";
import type { EnergiaHoras, FWalk, Modo, Tripulante } from "@/lib/contract";
import { PERFILES_ASTRONAUTAS, type PerfilAstronauta } from "@/lib/data/perfiles";
import { enIdioma, useIdioma } from "@/lib/i18n";
import { alcanceLlanoKm, ESCALA_ALCANCE_KM, limitante as quienLimita } from "./alcance";
import { BORDE, Casilla, Chevron, CIFRA, Despliegue, FOCO, Seccion, TEXTO } from "./comun";

interface Props {
  tripulantes: Tripulante[];
  onModo: (m: Modo) => void;
  onTripulantes: (t: Tripulante[]) => void;
  /** El resto de la salida: de ella depende hasta dónde llega cada persona */
  sol: number;
  fwalk: FWalk;
  energiaHoras: EnergiaHoras;
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

const ancho = (km: number) => `${Math.min(100, Math.max(0, (km / ESCALA_ALCANCE_KM) * 100))}%`;

/**
 * PERSONA 3 · Segunda pregunta de la salida: quién sale.
 * Los 8 perfiles previstos al aterrizaje están siempre a la vista y se marcan con un toque, sin
 * límite (al menos una persona). El modo se deduce solo: 1 persona, pareja (2) o grupo (3 o más).
 * En pareja y en grupo caminan juntos: una celda solo cuenta si todos pueden ir y volver, así que
 * manda quien menos alcanza. La barra de cada perfil es su alcance en llano ese sol (ver alcance.ts)
 * y, con varias personas, una marca señala el del grupo (el menor). «Perfiles» despliega la ficha
 * de cada uno.
 */
export default function SelectorCaminante({ tripulantes, onModo, onTripulantes, sol, fwalk, energiaHoras }: Props) {
  const [desplegado, setDesplegado] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>(() =>
    idsDesdeTripulantes(tripulantes),
  );

  const { t, idioma, num } = useIdioma();
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

  // Alcance en llano de cada perfil con la salida actual, y quién limita entre los que salen
  const alcances = useMemo(() => {
    const km: Record<string, number> = {};
    for (const p of PERFILES_ASTRONAUTAS) km[p.id] = alcanceLlanoKm(p, sol, fwalk, energiaHoras);
    return km;
  }, [sol, fwalk, energiaHoras]);
  const limitante = quienLimita(seleccionados, alcances);
  const perfilLimitante = perfiles.find((p) => p.id === limitante);
  const kmLimite = limitante ? alcances[limitante] : 0;
  const varios = seleccionados.length > 1;

  return (
    <Seccion
      id="titulo-caminante"
      titulo={t.caminaTitulo}
      ayuda={varios ? t.caminaAyudaGrupo : t.caminaAyudaSolo}
      valor={<span className={`text-[13px] ${TEXTO.secundario}`}>{t.salen(seleccionados.length)}</span>}
    >
      {/* Los 8 perfiles, siempre a la vista: un toque mete o saca a cada persona */}
      <div role="group" aria-label={t.tripulacionAria} className="mt-0.5 grid grid-cols-2 gap-1.5 @[400px]:grid-cols-4">
        {perfiles.map((p) => {
          const marcado = seleccionados.includes(p.id);
          const ultimo = marcado && seleccionados.length === 1;
          const km = alcances[p.id];
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={marcado}
              aria-disabled={ultimo || undefined}
              aria-label={t.tripulante(p.id, p.nombre, num(km))}
              title={ultimo ? t.alMenosUno : `${p.nombre} · ${t.perfilTitulo(p.rol, num(p.vo2pre), p.masa, num(km))}`}
              onClick={() => toggleTripulante(p.id)}
              className={`grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-[3px] border px-2 pb-1.5 pt-1 text-left transition-colors @[400px]:min-h-0 @[400px]:grid-cols-[minmax(0,1fr)_auto] [@media(pointer:fine)]:min-h-0 ${FOCO} ${
                marcado
                  ? "border-[#eaf0ff]/50 bg-[#eaf0ff]/[0.07] hover:bg-[#eaf0ff]/[0.1]"
                  : `${BORDE} hover:border-[#a0beff]/35 hover:bg-white/[0.03]`
              } ${ultimo ? "cursor-not-allowed" : ""}`}
            >
              {/* Estrecho: id, apellido y casilla en una línea. Ancho: id y casilla arriba, apellido debajo */}
              <span className={`${CIFRA} text-[11px] leading-[14px] ${marcado ? TEXTO.secundario : TEXTO.terciario}`}>{p.id}</span>
              <span
                className={`truncate text-[13px] leading-4 @[400px]:col-span-2 @[400px]:row-start-2 ${marcado ? "text-[#eaf0ff]" : TEXTO.secundario}`}
              >
                {apellido(p.nombre)}
              </span>
              <Casilla marcada={marcado} tam={11} className="@[400px]:col-start-2 @[400px]:row-start-1" />
              <span aria-hidden className="relative col-span-full mt-[5px] block h-[3px] bg-[#a0beff]/[0.14]">
                <span className={`absolute inset-y-0 left-0 ${marcado ? "bg-[#eaf0ff]" : "bg-[#8d9cc2]/60"}`} style={{ width: ancho(km) }} />
                {varios && marcado && <span className="absolute -top-[2px] h-[7px] w-px bg-[#eaf0ff]" style={{ left: ancho(kmLimite) }} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Qué es la barra y quién manda en el grupo; a la derecha, la ficha de cada perfil */}
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className={`min-w-0 text-[12px] leading-snug ${TEXTO.terciario}`}>
          {t.alcanceLlano}
          {perfilLimitante && (
            <span className={TEXTO.secundario}>
              {varios ? ` · ${t.limita(apellido(perfilLimitante.nombre), num(kmLimite))}` : `: ${num(kmLimite)} km`}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setDesplegado((v) => !v)}
          aria-expanded={desplegado}
          aria-controls="lista-tripulantes"
          className={`-my-2 -mr-1.5 flex h-9 shrink-0 items-center gap-1.5 rounded-[3px] px-1.5 text-[12.5px] ${TEXTO.secundario} transition-colors hover:text-white ${FOCO}`}
        >
          {t.perfiles}
          <Chevron abierto={desplegado} />
        </button>
      </div>

      {/* La ficha de cada perfil: rol, VO₂ previo, masa y alcance; también se marca desde aquí */}
      <Despliegue abierto={desplegado} id="lista-tripulantes">
        <ul className={`mt-1.5 divide-y divide-[#a0beff]/[0.1] rounded-[3px] border ${BORDE} bg-[#060a17]`}>
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
                  <Casilla marcada={marcado} className="mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff8fd8]/70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-[#eaf0ff]">
                      <span className={`${CIFRA} mr-1.5 text-[11.5px] ${TEXTO.terciario}`}>{p.id}</span>
                      {p.nombre}
                    </span>
                    <span className={`block truncate text-[12px] ${TEXTO.secundario}`}>
                      {p.rol} · {p.arquetipo}
                    </span>
                    <span className={`flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] ${TEXTO.terciario}`}>
                      <span>
                        {t.vo2Previo} <span className={CIFRA}>{num(p.vo2pre)}</span> · <span className={CIFRA}>{p.masa} kg</span>
                      </span>
                      <span>
                        {t.hoyEnLlano} <span className={`${CIFRA} text-[#eaf0ff]`}>{num(alcances[p.id])} km</span>
                      </span>
                    </span>
                    {marcado && <span className={`mt-1 block text-[12px] leading-snug ${TEXTO.secundario}`}>{p.descripcion}</span>}
                  </span>
                </label>
              </li>
            );
          })}
          <li className={`px-3 py-2 text-[11.5px] leading-snug ${TEXTO.terciario}`}>
            {t.notaPerfiles}
          </li>
        </ul>
      </Despliegue>
    </Seccion>
  );
}
