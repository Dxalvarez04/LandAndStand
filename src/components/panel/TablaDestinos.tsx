"use client";

import { useEffect, useRef, useState } from "react";
import type { Resultado } from "@/lib/contract";
import { N } from "@/lib/constants";
import { distanciaDesdeHabitatKm, desnivelDesdeHabitatM, type DestinoMision } from "@/lib/data/targets";
import { AMBAR, BORDE, Chevron, CIFRA, MarcaDestino, num, Seccion, TEXTO } from "./comun";

interface Props {
  resultado: Resultado | null;
  /** Destinos de la misión: propuestos (M1…) y añadidos por la tripulación (P1…) */
  destinosMision: DestinoMision[];
  /** Nombre y tareas que se proponen al añadir un punto de referencia */
  sugerencia?: { nombre: string; tareas: string[] } | null;
  seleccionando: boolean;
  puntoSeleccionado: { fila: number; columna: number } | null;
  onIniciarSeleccion: () => void;
  onCancelarSeleccion: () => void;
  onGuardarDestino: (datos: { nombre: string; tareas: string[] }) => void;
  onEliminarDestino: (id: string) => void;
  /** Al abrir un destino, el mapa vuela hasta él */
  onEnfocar?: (id: string) => void;
}

/** Columnas: destino · distancia · desnivel · probabilidad · flecha */
const COLUMNAS = "grid grid-cols-[minmax(0,1fr)_3.9rem_3.7rem_3.3rem_0.75rem] items-center gap-x-2";

const pct = (p: number) => `${Math.round(p * 100)} %`;
const desnivel = (m: number | null) => (m === null ? "—" : `${m > 0 ? "+" : m < 0 ? "−" : ""}${Math.abs(m)} m`);

/**
 * PERSONA 3 · Destinos de la misión: los propuestos (M1–M6) y los que añade la tripulación sobre el
 * mapa (P1, P2…). Los sitios de Curiosity (T1–T6) no están aquí: en el mapa son puntos de
 * referencia. Muestra distancia, desnivel y probabilidad de ir y volver. Al pulsar un destino se
 * despliega su contexto y sus tareas y el mapa lo enfoca. Cualquiera se puede quitar del plan.
 * Las marcas son las mismas que en el mapa (punto los propuestos, rombo los añadidos).
 */
export default function TablaDestinos({
  resultado,
  destinosMision,
  sugerencia = null,
  seleccionando,
  puntoSeleccionado,
  onIniciarSeleccion,
  onCancelarSeleccion,
  onGuardarDestino,
  onEliminarDestino,
  onEnfocar,
}: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const alternar = (id: string) => {
    if (abierto !== id) onEnfocar?.(id);
    setAbierto(abierto === id ? null : id);
  };

  return (
    <Seccion
      id="titulo-destinos"
      titulo="Destinos de la misión"
      valor={<span className={`text-[12px] ${TEXTO.terciario}`}>Toca uno para verlo en el mapa</span>}
    >
      {/* Cabecera de columnas */}
      <div className={`${COLUMNAS} px-2 pb-1 text-[11.5px] ${TEXTO.terciario}`} aria-hidden>
        <span>Destino</span>
        <span className="text-right">Distancia</span>
        <span className="text-right">Desnivel</span>
        <span className="text-right">Ir y volver</span>
        <span />
      </div>

      <ul className={`divide-y divide-[#a0beff]/[0.1] border-y ${BORDE}`}>
        {destinosMision.map((d) => (
          <FilaDestino
            key={d.id}
            etiqueta={d.id}
            nombre={d.nombre}
            distanciaKm={distanciaDesdeHabitatKm(d.fila, d.columna)}
            desnivelM={desnivelDesdeHabitatM(resultado, d.fila, d.columna)}
            probabilidad={resultado?.prob[d.fila * N + d.columna]}
            contexto={d.contexto ?? `Destino añadido por la tripulación · celda ${d.fila}, ${d.columna}`}
            tareas={d.tareas}
            personalizado={!d.propuesto}
            abierto={abierto === d.id}
            onToggle={() => alternar(d.id)}
            onEliminar={() => onEliminarDestino(d.id)}
          />
        ))}
        {destinosMision.length === 0 && (
          <li className={`px-2 py-3 text-[12.5px] ${TEXTO.terciario}`}>Sin destinos. Añade uno en el mapa.</li>
        )}
      </ul>

      {/* Alta de destinos sobre el mapa */}
      <div className="mt-3">
        {seleccionando ? (
          <div className={`flex items-center gap-3 rounded-[3px] border ${BORDE} border-l-2 border-l-[#ff8fd8] bg-[#060a17] py-1 pl-3 pr-1`} role="status">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#eaf0ff]">
              Toca el punto en el mapa
              <span className={`block text-[12px] ${TEXTO.terciario}`}>Al pasar por encima verás su probabilidad</span>
            </p>
            <button
              type="button"
              onClick={onCancelarSeleccion}
              className={`h-10 shrink-0 rounded-[3px] px-3 text-[13px] ${TEXTO.secundario} outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-white/60`}
            >
              Cancelar
            </button>
          </div>
        ) : puntoSeleccionado ? (
          <FormularioDestino
            key={`${puntoSeleccionado.fila}-${puntoSeleccionado.columna}`}
            fila={puntoSeleccionado.fila}
            columna={puntoSeleccionado.columna}
            sugerencia={sugerencia}
            resultado={resultado}
            onGuardar={onGuardarDestino}
            onCancelar={onCancelarSeleccion}
          />
        ) : (
          <button
            type="button"
            onClick={onIniciarSeleccion}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-dashed border-[#a0beff]/30 text-[13.5px] text-[#eaf0ff] outline-none transition-colors hover:border-[#a0beff]/50 hover:bg-white/[0.03] focus-visible:border-[#eaf0ff]/70`}
          >
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
              <path d="M0 -6v3.4M0 2.6V6M-6 0h3.4M2.6 0H6" stroke="#ff8fd8" strokeWidth="1.5" strokeLinecap="round" />
              <circle r="1.2" fill="#ff8fd8" />
            </svg>
            Añadir destino en el mapa
          </button>
        )}
      </div>
    </Seccion>
  );
}

interface FilaDestinoProps {
  etiqueta: string;
  nombre: string;
  distanciaKm: number;
  desnivelM: number | null;
  probabilidad: number | undefined;
  contexto: string;
  tareas: string[];
  personalizado?: boolean;
  abierto: boolean;
  onToggle: () => void;
  onEliminar?: () => void;
}

function FilaDestino({
  etiqueta,
  nombre,
  distanciaKm,
  desnivelM,
  probabilidad,
  contexto,
  tareas,
  personalizado = false,
  abierto,
  onToggle,
  onEliminar,
}: FilaDestinoProps) {
  const tieneProb = probabilidad !== undefined;
  const alcanzable = tieneProb && probabilidad >= 0.5;
  const probTexto = tieneProb ? pct(probabilidad) : "sin calcular";

  return (
    <li className={abierto ? "bg-[#060a17]" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls={abierto ? `tareas-${etiqueta}` : undefined}
        aria-label={`${etiqueta} ${nombre}: ${num(distanciaKm, 2)} km, desnivel ${desnivel(desnivelM)}, probabilidad de ir y volver ${probTexto}. ${
          abierto ? "Ocultar tareas" : "Ver en el mapa y sus tareas"
        }.`}
        className={`${COLUMNAS} min-h-10 w-full px-2 py-1.5 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.05]`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MarcaDestino alcance={alcanzable} propio={personalizado} />
          <span className={`${CIFRA} shrink-0 text-[11.5px] ${TEXTO.terciario}`}>{etiqueta}</span>
          <span className="truncate text-[13.5px] text-[#eaf0ff]">{nombre}</span>
        </span>
        <span className={`${CIFRA} whitespace-nowrap text-right text-[12px] ${TEXTO.secundario}`}>{num(distanciaKm, 2)} km</span>
        <span className={`${CIFRA} whitespace-nowrap text-right text-[12px] ${desnivelM === null ? TEXTO.terciario : TEXTO.secundario}`}>
          {desnivel(desnivelM)}
        </span>
        <span className={`${CIFRA} whitespace-nowrap text-right text-[13px]`} style={{ color: alcanzable ? AMBAR : tieneProb ? "#eaf0ff" : "#8d9cc2" }}>
          {tieneProb ? pct(probabilidad) : "—"}
        </span>
        <Chevron abierto={abierto} />
      </button>

      {abierto && (
        <div id={`tareas-${etiqueta}`} className="px-2 pb-3 pl-[2.6rem]">
          <p className={`text-[12.5px] leading-snug ${TEXTO.secundario}`}>{contexto}</p>
          <p className={`mt-2 text-[12px] ${TEXTO.terciario}`}>Tareas previstas</p>
          {tareas.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {tareas.map((tarea, i) => (
                <li key={`${etiqueta}-${i}`} className="flex items-start gap-2 text-[13px] leading-snug text-[#eaf0ff]">
                  <span aria-hidden className="mt-[0.6em] h-px w-2 shrink-0 bg-[#8d9cc2]" />
                  <span>{tarea}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-1 text-[12.5px] ${TEXTO.terciario}`}>Sin tareas registradas.</p>
          )}

          {onEliminar && (
            <button
              type="button"
              onClick={onEliminar}
              className={`-ml-2 mt-2 h-9 rounded-[3px] px-2 text-[12.5px] ${TEXTO.secundario} underline decoration-[#8d9cc2]/50 underline-offset-2 outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white/60`}
            >
              Quitar de la misión
            </button>
          )}
        </div>
      )}
    </li>
  );
}

interface FormularioDestinoProps {
  fila: number;
  columna: number;
  sugerencia: { nombre: string; tareas: string[] } | null;
  resultado: Resultado | null;
  onGuardar: (datos: { nombre: string; tareas: string[] }) => void;
  onCancelar: () => void;
}

const CAMPO = `w-full rounded-[3px] border ${BORDE} bg-[#0a0f1f] px-3 text-[13.5px] text-[#eaf0ff] outline-none transition-colors placeholder:text-[#8d9cc2]/70 focus:border-[#eaf0ff]/60`;

function FormularioDestino({ fila, columna, sugerencia, resultado, onGuardar, onCancelar }: FormularioDestinoProps) {
  const [nombre, setNombre] = useState(sugerencia?.nombre ?? "");
  const [tareas, setTareas] = useState<string[]>(sugerencia?.tareas ?? []);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const campoNombre = useRef<HTMLInputElement>(null);

  // Al aparecer (punto elegido en el mapa o «Añadir» desde la ficha) se ve y se escribe el nombre.
  // En pantallas táctiles no se enfoca: el teclado taparía el mapa.
  useEffect(() => {
    raiz.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    let tactil = false;
    try {
      tactil = window.matchMedia("(pointer: coarse)").matches;
    } catch {
      /* sin matchMedia */
    }
    if (!tactil) campoNombre.current?.focus({ preventScroll: true });
  }, []);

  const distanciaKm = distanciaDesdeHabitatKm(fila, columna);
  const desnivelM = desnivelDesdeHabitatM(resultado, fila, columna);
  const probabilidad = resultado?.prob[fila * N + columna];
  const alcanzable = probabilidad !== undefined && probabilidad >= 0.5;

  const agregarTarea = () => {
    const tarea = nuevaTarea.trim();
    if (!tarea) return;
    setTareas((actuales) => [...actuales, tarea]);
    setNuevaTarea("");
  };

  const eliminarTarea = (indice: number) => {
    setTareas((actuales) => actuales.filter((_, i) => i !== indice));
  };

  const guardar = () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    onGuardar({ nombre: nombreLimpio, tareas });
  };

  return (
    <div ref={raiz} className={`scroll-my-3 rounded-[3px] border ${BORDE} border-l-2 border-l-[#ff8fd8] bg-[#060a17] p-3`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[13.5px] font-medium text-[#eaf0ff]">Destino nuevo</p>
        <p className={`${CIFRA} text-[11.5px] ${TEXTO.terciario}`}>
          celda {fila}, {columna}
        </p>
      </div>

      {/* Lo que dice el modelo de ese punto */}
      <dl className={`mt-2 grid grid-cols-3 divide-x divide-[#a0beff]/[0.12] border-y ${BORDE} py-1.5 text-center`}>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>Distancia</dt>
          <dd className={`${CIFRA} text-[13px] text-[#eaf0ff]`}>{num(distanciaKm, 2)} km</dd>
        </div>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>Desnivel</dt>
          <dd className={`${CIFRA} text-[13px] text-[#eaf0ff]`}>{desnivel(desnivelM)}</dd>
        </div>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>Ir y volver</dt>
          <dd className={`${CIFRA} text-[13px]`} style={{ color: alcanzable ? AMBAR : "#eaf0ff" }}>
            {probabilidad === undefined ? "—" : pct(probabilidad)}
          </dd>
        </div>
      </dl>

      <label className="mt-3 block">
        <span className={`text-[12px] ${TEXTO.terciario}`}>Nombre</span>
        <input
          ref={campoNombre}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              guardar();
            }
          }}
          placeholder="Nombre del destino"
          className={`${CAMPO} mt-1 h-10`}
        />
      </label>

      <div className="mt-3">
        <p className={`text-[12px] ${TEXTO.terciario}`}>Tareas previstas</p>
        {tareas.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {tareas.map((tarea, i) => (
              <li key={`${tarea}-${i}`} className="flex items-center gap-2 text-[13px] text-[#eaf0ff]">
                <span aria-hidden className="h-px w-2 shrink-0 bg-[#8d9cc2]" />
                <span className="min-w-0 flex-1 truncate">{tarea}</span>
                <button
                  type="button"
                  onClick={() => eliminarTarea(i)}
                  aria-label={`Quitar tarea: ${tarea}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${TEXTO.terciario} outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white/60`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1 flex gap-1.5">
          <input
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarTarea();
              }
            }}
            placeholder="Añadir tarea..."
            className={`${CAMPO} h-10 min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={agregarTarea}
            disabled={!nuevaTarea.trim()}
            aria-label="Añadir tarea"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border ${BORDE} text-[#eaf0ff] outline-none transition-colors hover:bg-white/[0.06] focus-visible:border-[#eaf0ff]/60 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M6 1v10M1 6h10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={!nombre.trim()}
          className="h-10 flex-1 rounded-[3px] bg-[#eaf0ff] px-3 text-[13.5px] font-medium text-[#060a17] outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#ff8fd8]/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Guardar destino
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className={`h-10 rounded-[3px] border ${BORDE} px-3 text-[13.5px] ${TEXTO.secundario} outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:border-[#eaf0ff]/60`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
