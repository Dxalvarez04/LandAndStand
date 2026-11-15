"use client";

import { useEffect, useRef, useState } from "react";
import type { Resultado } from "@/lib/contract";
import { N } from "@/lib/constants";
import { distanciaDesdeHabitatKm, desnivelDesdeHabitatM, type DestinoMision } from "@/lib/data/targets";
import { colorViridis } from "@/lib/mapa/viridis";
import { enIdioma, useIdioma } from "@/lib/i18n";
import { A_SANGRE, AMBAR, BORDE, Chevron, CIFRA, Despliegue, FOCO, MarcaDestino, MARGEN, MARGEN_FUERA, mostrarEnPanel, Seccion, TEXTO } from "./comun";

interface Props {
  resultado: Resultado | null;
  /** Destinos de la misión: propuestos (M1…) y añadidos por la tripulación (P1…) */
  destinosMision: DestinoMision[];
  /** Destino desplegado (lo lleva la página: también puede elegirse desde el mapa) */
  activo: string | null;
  onActivo: (id: string | null) => void;
  /** Se está calculando otra salida: las probabilidades que se ven van a cambiar */
  calculando?: boolean;
  /** Nombre y tareas que se proponen al añadir un punto de referencia */
  sugerencia?: { nombre: string; tareas: string[] } | null;
  seleccionando: boolean;
  puntoSeleccionado: { fila: number; columna: number } | null;
  onIniciarSeleccion: () => void;
  onCancelarSeleccion: () => void;
  onGuardarDestino: (datos: { nombre: string; tareas: string[] }) => void;
  onEliminarDestino: (id: string) => void;
  /** Al desplegar un destino desde el panel, el mapa vuela hasta él */
  onEnfocar?: (id: string) => void;
}

/**
 * Fila en una línea cuando el panel es ancho (≥ 400 px): destino · distancia · desnivel ·
 * probabilidad · flecha. En estrecho (móvil, ventanas pequeñas) el nombre ocupa toda la línea y la
 * distancia y el desnivel bajan a una segunda, para que el nombre no se corte.
 */
const COLUMNAS =
  "grid grid-cols-[minmax(0,1fr)_auto_0.75rem] items-center gap-x-2 @[400px]:grid-cols-[minmax(0,1fr)_3.3rem_3.2rem_2.9rem_0.75rem] @[400px]:gap-x-1.5";

/** La misma escala que el mapa: la barra de cada destino es la clave cortada en su probabilidad. */
const ESCALA = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((v) => colorViridis(v)).join(", ")})`;

const desnivel = (m: number | null) => (m === null ? "—" : `${m > 0 ? "+" : m < 0 ? "−" : ""}${Math.abs(m)} m`);

/**
 * PERSONA 3 · Destinos de la misión: lo que el modelo responde para la salida definida arriba.
 * Están los propuestos (M1–M6) y los que añade la tripulación sobre el mapa (P1, P2…); los sitios
 * de Curiosity (T1–T6) no, porque en el mapa son puntos de referencia. Cada fila da la distancia,
 * el desnivel y la probabilidad de ir y volver, con una barra en la misma escala de color del mapa
 * y la marca del 50 %. Al pulsar un destino se despliegan su contexto y sus tareas y el mapa lo
 * enfoca; cualquiera se puede quitar del plan. Las marcas son las del mapa (punto los propuestos,
 * rombo los añadidos; ámbar si la probabilidad es del 50 % o más).
 */
export default function TablaDestinos({
  resultado,
  destinosMision,
  activo,
  onActivo,
  calculando = false,
  sugerencia = null,
  seleccionando,
  puntoSeleccionado,
  onIniciarSeleccion,
  onCancelarSeleccion,
  onGuardarDestino,
  onEliminarDestino,
  onEnfocar,
}: Props) {
  const { t, idioma } = useIdioma();
  const alternar = (id: string) => {
    if (activo === id) return onActivo(null);
    onEnfocar?.(id);
    onActivo(id);
  };

  return (
    <Seccion id="titulo-destinos" titulo={t.destinosTitulo} valor={<Aclaracion texto={t.colIrVolver} ayuda={t.irVolverAyuda} />}>
      <ul className={`${A_SANGRE} border-t ${BORDE}`}>
        {destinosMision.map((original) => enIdioma(original, idioma)).map((d) => (
          <FilaDestino
            key={d.id}
            etiqueta={d.id}
            nombre={d.nombre}
            distanciaKm={distanciaDesdeHabitatKm(d.fila, d.columna)}
            desnivelM={desnivelDesdeHabitatM(resultado, d.fila, d.columna)}
            probabilidad={resultado?.prob[d.fila * N + d.columna]}
            calculando={calculando}
            contexto={d.contexto ?? t.contextoAnadido(d.fila, d.columna)}
            tareas={d.tareas}
            personalizado={!d.propuesto}
            abierto={activo === d.id}
            onToggle={() => alternar(d.id)}
            onEliminar={() => onEliminarDestino(d.id)}
          />
        ))}
        {destinosMision.length === 0 && (
          <li className={`${MARGEN} border-b ${BORDE} py-3 text-[12.5px] ${TEXTO.terciario}`}>{t.sinDestinos}</li>
        )}
      </ul>

      {/* Alta de destinos sobre el mapa */}
      <div className="mt-2.5">
        {seleccionando ? (
          <div className={`flex min-h-11 items-center gap-3 rounded-[3px] border ${BORDE} border-l-2 border-l-[#ff8fd8] bg-[#060a17] py-1 pl-3 pr-1`} role="status">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#eaf0ff]">
              {t.tocaPuntoMapa}
              <span className={`block text-[12px] ${TEXTO.terciario}`}>{t.tocaPuntoAyuda}</span>
            </p>
            <button
              type="button"
              onClick={onCancelarSeleccion}
              className={`h-10 shrink-0 rounded-[3px] px-3 text-[13px] ${TEXTO.secundario} transition-colors hover:bg-white/[0.06] hover:text-white ${FOCO}`}
            >
              {t.cancelar}
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
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[3px] border border-dashed border-[#a0beff]/30 text-[13.5px] text-[#eaf0ff] transition-colors hover:border-[#a0beff]/55 hover:bg-white/[0.03] [@media(pointer:fine)]:h-10 ${FOCO}`}
          >
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
              <path d="M0 -6v3.4M0 2.6V6M-6 0h3.4M2.6 0H6" stroke="#ff8fd8" strokeWidth="1.5" strokeLinecap="round" />
              <circle r="1.2" fill="#ff8fd8" />
            </svg>
            {t.anadirEnMapa}
          </button>
        )}
      </div>
    </Seccion>
  );
}

/**
 * Rótulo de la columna de probabilidad con su explicación: se ve al pasar el ratón, al tocarlo o al
 * llegar con el teclado (el punteado avisa de que hay algo que leer).
 */
function Aclaracion({ texto, ayuda }: { texto: string; ayuda: string }) {
  return (
    <span className="group relative mr-5 shrink-0">
      <button
        type="button"
        aria-describedby="ayuda-ir-volver"
        className={`-my-2 flex h-9 cursor-help items-center rounded-[3px] text-[12px] ${TEXTO.terciario} underline decoration-[#8d9cc2]/60 decoration-dotted underline-offset-[3px] transition-colors hover:text-[#b9c6e6] ${FOCO}`}
      >
        {texto}
      </button>
      <span
        id="ayuda-ir-volver"
        role="tooltip"
        className={`pointer-events-none absolute -right-5 top-full z-20 mt-0.5 w-60 rounded-[3px] border ${BORDE} bg-[#060a17] px-2.5 py-2 text-left text-[12px] leading-snug ${TEXTO.secundario} opacity-0 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)] transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none`}
      >
        {ayuda}
      </span>
    </span>
  );
}

/** Desnivel respecto al hábitat: flecha arriba o abajo y metros. */
function Desnivel({ m, titulo }: { m: number | null; titulo: string | undefined }) {
  if (m === null) return <span className={TEXTO.terciario}>—</span>;
  return (
    <span title={titulo} className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
      {m !== 0 && (
        <svg width="7" height="9" viewBox="0 0 7 9" aria-hidden className={`shrink-0 text-[#8d9cc2] ${m < 0 ? "rotate-180" : ""}`}>
          <path d="M3.5 8.2V1.2M0.8 3.8 3.5 1.1l2.7 2.7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {Math.abs(m)} m
    </span>
  );
}

/** Barra de probabilidad: la escala del mapa cortada en `p`, con la marca del 50 % (como el contorno). */
function BarraProbabilidad({ p, tenue }: { p: number | undefined; tenue: boolean }) {
  const hay = p !== undefined && p >= 0.005;
  return (
    <span aria-hidden className={`relative block h-[3px] bg-[#a0beff]/[0.13] ${MARGEN_FUERA}`}>
      {hay && (
        <span
          className={`absolute inset-y-0 left-0 transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none ${tenue ? "opacity-50" : ""}`}
          style={{ width: `${Math.min(1, p) * 100}%`, backgroundImage: ESCALA, backgroundSize: `${100 / Math.min(1, p)}% 100%` }}
        />
      )}
      <span className="absolute -top-[2px] left-1/2 h-[7px] w-px bg-[#e8f1ff]/75" />
    </span>
  );
}

interface FilaDestinoProps {
  etiqueta: string;
  nombre: string;
  distanciaKm: number;
  desnivelM: number | null;
  probabilidad: number | undefined;
  calculando: boolean;
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
  calculando,
  contexto,
  tareas,
  personalizado = false,
  abierto,
  onToggle,
  onEliminar,
}: FilaDestinoProps) {
  const { t, pct, num } = useIdioma();
  const tieneProb = probabilidad !== undefined;
  const alcanzable = tieneProb && probabilidad >= 0.5;
  const probTexto = tieneProb ? pct(probabilidad) : t.sinCalcular;
  const raiz = useRef<HTMLLIElement>(null);

  // Al desplegarse (desde el panel o desde el mapa) queda a la vista, ya con su altura final
  useEffect(() => {
    if (!abierto) return;
    const espera = setTimeout(() => mostrarEnPanel(raiz.current), 230);
    return () => clearTimeout(espera);
  }, [abierto]);

  return (
    <li ref={raiz} className={`relative transition-colors ${abierto ? "bg-[#060a17]" : ""}`}>
      {/* El rosa es la selección, como en el mapa */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[2px] bg-[#ff8fd8] transition-opacity ${abierto ? "opacity-100" : "opacity-0"}`} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls={`tareas-${etiqueta}`}
        aria-label={t.filaDestino(etiqueta, nombre, num(distanciaKm, 2), desnivel(desnivelM), probTexto, abierto)}
        title={abierto ? undefined : t.verEnMapa}
        className={`${COLUMNAS} ${MARGEN} min-h-11 w-full py-1.5 text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.06] @[400px]:py-0 @[400px]:[@media(pointer:fine)]:min-h-9`}
      >
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
          <MarcaDestino alcance={alcanzable} propio={personalizado} />
          <span className={`${CIFRA} shrink-0 text-[11.5px] ${TEXTO.terciario}`}>{etiqueta}</span>
          <span className="truncate text-[13.5px] text-[#eaf0ff]">{nombre}</span>
        </span>
        <span className={`${CIFRA} col-start-1 row-start-2 flex items-center gap-3 pl-5 text-[12px] ${TEXTO.secundario} @[400px]:contents`}>
          <span className="whitespace-nowrap @[400px]:col-start-2 @[400px]:row-start-1 @[400px]:text-right">{num(distanciaKm, 2)} km</span>
          <span className="@[400px]:col-start-3 @[400px]:row-start-1 @[400px]:text-right">
            <Desnivel m={desnivelM} titulo={desnivelM === null ? undefined : t.desnivelTexto(desnivelM)} />
          </span>
        </span>
        <span
          className={`${CIFRA} col-start-2 row-span-2 row-start-1 whitespace-nowrap text-right text-[14px] transition-opacity duration-200 @[400px]:col-start-4 @[400px]:row-span-1 ${calculando ? "opacity-55" : ""}`}
          style={{ color: alcanzable ? AMBAR : tieneProb ? "#eaf0ff" : "#8d9cc2" }}
        >
          {tieneProb ? pct(probabilidad) : "—"}
        </span>
        <Chevron abierto={abierto} className="col-start-3 row-span-2 row-start-1 @[400px]:col-start-5 @[400px]:row-span-1" />
      </button>
      <BarraProbabilidad p={probabilidad} tenue={calculando} />

      <Despliegue abierto={abierto} id={`tareas-${etiqueta}`}>
        <div className={`${MARGEN} pb-3 pt-2.5`}>
          <p className={`text-[12.5px] leading-snug ${TEXTO.secundario}`}>{contexto}</p>
          <p className={`mt-2 text-[12px] ${TEXTO.terciario}`}>{t.tareasPrevistas}</p>
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
            <p className={`mt-1 text-[12.5px] ${TEXTO.terciario}`}>{t.sinTareas}</p>
          )}

          {onEliminar && (
            <button
              type="button"
              onClick={onEliminar}
              className={`-mb-1.5 -ml-2 mt-1.5 h-9 rounded-[3px] px-2 text-[12.5px] ${TEXTO.secundario} underline decoration-[#8d9cc2]/50 underline-offset-2 transition-colors hover:text-white ${FOCO}`}
            >
              {t.quitarMision}
            </button>
          )}
        </div>
      </Despliegue>
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

const CAMPO = `w-full rounded-[3px] border ${BORDE} bg-[#0a0f1f] px-3 text-[13.5px] text-[#eaf0ff] outline-none transition-colors placeholder:text-[#8d9cc2]/70 hover:border-[#a0beff]/30 focus:border-[#eaf0ff]/60`;

function FormularioDestino({ fila, columna, sugerencia, resultado, onGuardar, onCancelar }: FormularioDestinoProps) {
  const [nombre, setNombre] = useState(sugerencia?.nombre ?? "");
  const [tareas, setTareas] = useState<string[]>(sugerencia?.tareas ?? []);
  const [nuevaTarea, setNuevaTarea] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const { t, pct, num } = useIdioma();
  const campoNombre = useRef<HTMLInputElement>(null);

  // Al aparecer (punto elegido en el mapa o «Añadir» desde la ficha) y al crecer con cada tarea,
  // queda a la vista entero, con «Guardar» incluido
  useEffect(() => {
    mostrarEnPanel(raiz.current);
  }, [tareas.length]);
  // Se escribe el nombre nada más aparecer. En pantallas táctiles no se enfoca: el teclado taparía el mapa.
  useEffect(() => {
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
    <div ref={raiz} className={`rounded-[3px] border ${BORDE} border-l-2 border-l-[#ff8fd8] bg-[#060a17] p-3`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-medium text-[#eaf0ff]">{t.destinoNuevo}</p>
        <p className={`${CIFRA} text-[11.5px] ${TEXTO.terciario}`}>{t.celda(fila, columna)}</p>
      </div>

      {/* Lo que dice el modelo de ese punto */}
      <dl className={`mt-2 grid grid-cols-3 divide-x divide-[#a0beff]/[0.12] border-y ${BORDE} py-1.5 text-center`}>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>{t.colDistancia}</dt>
          <dd className={`${CIFRA} text-[13px] text-[#eaf0ff]`}>{num(distanciaKm, 2)} km</dd>
        </div>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>{t.colDesnivel}</dt>
          <dd className={`${CIFRA} text-[13px] text-[#eaf0ff]`}>{desnivel(desnivelM)}</dd>
        </div>
        <div>
          <dt className={`text-[11.5px] ${TEXTO.terciario}`}>{t.colIrVolver}</dt>
          <dd className={`${CIFRA} text-[13px]`} style={{ color: alcanzable ? AMBAR : "#eaf0ff" }}>
            {probabilidad === undefined ? "—" : pct(probabilidad)}
          </dd>
        </div>
      </dl>

      <label className="mt-3 block">
        <span className={`text-[12px] ${TEXTO.terciario}`}>{t.nombre}</span>
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
          placeholder={t.nombrePlaceholder}
          className={`${CAMPO} mt-1 h-10`}
        />
      </label>

      <div className="mt-3">
        <p className={`text-[12px] ${TEXTO.terciario}`}>{t.tareasPrevistas}</p>
        {tareas.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {tareas.map((tarea, i) => (
              <li key={`${tarea}-${i}`} className="flex items-center gap-2 text-[13px] text-[#eaf0ff]">
                <span aria-hidden className="h-px w-2 shrink-0 bg-[#8d9cc2]" />
                <span className="min-w-0 flex-1 truncate">{tarea}</span>
                <button
                  type="button"
                  onClick={() => eliminarTarea(i)}
                  aria-label={t.quitarTarea(tarea)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${TEXTO.terciario} transition-colors hover:bg-white/[0.06] hover:text-white ${FOCO}`}
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
            placeholder={t.tareaPlaceholder}
            aria-label={t.anadirTarea}
            className={`${CAMPO} h-10 min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={agregarTarea}
            disabled={!nuevaTarea.trim()}
            aria-label={t.anadirTarea}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border ${BORDE} text-[#eaf0ff] transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`}
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
          className={`h-10 flex-1 rounded-[3px] bg-[#eaf0ff] px-3 text-[13.5px] font-medium text-[#060a17] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`}
        >
          {t.guardarDestino}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className={`h-10 rounded-[3px] border ${BORDE} px-3 text-[13.5px] ${TEXTO.secundario} transition-colors hover:bg-white/[0.06] hover:text-white ${FOCO}`}
        >
          {t.cancelar}
        </button>
      </div>
    </div>
  );
}
