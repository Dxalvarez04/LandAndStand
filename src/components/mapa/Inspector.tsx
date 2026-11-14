"use client";

/**
 * Ficha del punto tocado. Se abre JUNTO al punto, en el sitio que no tape el camino trazado
 * (la ruta hasta el hábitat) ni el propio punto: prueba a derecha, izquierda, arriba y abajo y se
 * queda con el que menos tape. Mientras se mueve el mapa no salta de lado salvo que el suyo empiece
 * a tapar el camino.
 * Responde por orden: ¿puedo ir y volver?, ¿qué voy a ver? (foto de Curiosity), ¿a qué distancia?,
 * ¿por dónde? Y al final, dónde está. Un punto cualquiera se puede añadir a los destinos de la misión.
 */
import { useEffect, useRef, useState } from "react";
import { FOTOS } from "@/lib/data/fotos";
import type { IdDestino } from "@/lib/contract";
import { DESTINOS, celdaALatLon } from "@/lib/data/targets";
import { CELDA_HABITAT, type Celda, distanciaM } from "@/lib/mapa/geo";
import { TEXTOS, distancia, franjaDe, latLon, pct } from "@/lib/mapa/textos";
import type { EstadoRuta } from "@/hooks/useRuta";
import type { PerfilRuta } from "@/lib/mapa/perfil";
import { COLOR_RUTA } from "./CapaRuta";
import { CIFRA } from "./fuente";

export type Posicion = "arriba" | "abajo";

const ANCHO = 272; // px
const SEPARACION = 20; // px entre el punto y la ficha
const MARGEN = 8; // px hasta el borde de la ventana

type Px = { x: number; y: number };

/**
 * Sitio de la ficha junto al punto. Cada candidato puntúa por lo que tapa (el punto, mucho; cada
 * punto del camino, uno); a igualdad, el orden de preferencia y lo poco que haya que moverlo para
 * que quepa. `previa` (el sitio anterior) se mantiene mientras no tape más que el mejor.
 */
function colocar(ancla: Px, vista: { w: number; h: number }, alto: number, evitar: Px[], previa: string | null) {
  const { x: ax, y: ay } = ancla;
  // Primero hacia el lado contrario al camino
  const mediaX = evitar.length ? evitar.reduce((a, q) => a + q.x, 0) / evitar.length : ax - 1;
  const lados: [string, number][] = [
    ["der", ax + SEPARACION],
    ["izq", ax - SEPARACION - ANCHO],
  ];
  if (mediaX > ax) lados.reverse();
  const candidatos: { id: string; left: number; top: number }[] = [];
  for (const [id, left] of lados) {
    candidatos.push({ id, left, top: ay - alto / 2 }, { id: `${id}-arr`, left, top: ay - alto + 36 }, { id: `${id}-aba`, left, top: ay - 36 });
  }
  candidatos.push({ id: "arr", left: ax - ANCHO / 2, top: ay - SEPARACION - alto }, { id: "aba", left: ax - ANCHO / 2, top: ay + SEPARACION });

  const maxLeft = Math.max(MARGEN, vista.w - ANCHO - MARGEN);
  const maxTop = Math.max(MARGEN, vista.h - alto - MARGEN);
  const puntuados = candidatos.map((c, orden) => {
    const left = Math.min(Math.max(MARGEN, c.left), maxLeft);
    const top = Math.min(Math.max(MARGEN, c.top), maxTop);
    const tapa = (q: Px, m: number) => q.x >= left - m && q.x <= left + ANCHO + m && q.y >= top - m && q.y <= top + alto + m;
    let tapados = tapa(ancla, 14) ? 1000 : 0;
    for (const q of evitar) if (tapa(q, 10)) tapados++;
    const coste = tapados + orden * 0.01 + (Math.abs(left - c.left) + Math.abs(top - c.top)) / 1000;
    return { id: c.id, left, top, tapados, coste };
  });
  const mejor = puntuados.reduce((a, b) => (b.coste < a.coste ? b : a));
  const anterior = previa ? puntuados.find((c) => c.id === previa) : undefined;
  return anterior && anterior.tapados <= mejor.tapados ? anterior : mejor;
}

interface Props {
  celda: Celda;
  /** Solo en modo compacto: franja arriba o abajo */
  posicion: Posicion;
  /** Punto pulsado, en píxeles de la ventana del mapa */
  ancla: { x: number; y: number };
  /** Tamaño de la ventana del mapa */
  vista: { w: number; h: number };
  /** Lo que la ficha no debe tapar: el camino trazado en pantalla (o al menos el hábitat) */
  evitar?: Px | Px[];
  /** Añadir este punto a los destinos de la misión (no aparece si ya lo es ni en el hábitat) */
  onAgregarDestino?: () => void;
  onAbrirFoto: () => void;
  /** Punto de referencia de Curiosity (T1–T6) */
  destino: IdDestino | null;
  /** Destino de la misión (M1…, P1…): nombre, tareas previstas y qué hay allí */
  personalizado?: { id: string; nombre: string; tareas: string[]; contexto?: string } | null;
  p: number | undefined;
  ruta: EstadoRuta;
  /** Longitud, subida y pendiente máxima de la ruta del modelo (sobre el DEM) */
  perfil?: PerfilRuta | null;
  onCerrar: () => void;
  /** Pantalla estrecha (móvil): franja con lo esencial, para no tapar el terreno */
  compacto?: boolean;
}

function Cerrar({ onCerrar }: { onCerrar: () => void }) {
  return (
    <button
      type="button"
      onClick={onCerrar}
      aria-label={TEXTOS.cerrar}
      className="flex h-11 w-11 shrink-0 items-center justify-center text-[#8d9cc2] transition-colors hover:text-white outline-none focus-visible:text-white"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
      </svg>
    </button>
  );
}

function Linea({ discontinua }: { discontinua?: boolean }) {
  return (
    <svg width="18" height="6" aria-hidden>
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={COLOR_RUTA}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={discontinua ? "1 4.5" : undefined}
      />
    </svg>
  );
}

/** Cifra grande con el signo % pequeño y pegado (en monoespaciada el espacio se ve enorme). */
function Porcentaje({ p, className }: { p: number | undefined; className: string }) {
  if (p === undefined) return <p className={`${CIFRA} ${className} font-light leading-none`}>—</p>;
  const cifra = pct(p).replace(/\s*%$/, "");
  return (
    <p className={`${CIFRA} ${className} whitespace-nowrap font-light leading-none`}>
      {cifra}
      <span className="ml-0.5 text-[0.5em] text-[#b9c6e6]">%</span>
    </p>
  );
}

/** Miniatura de lo que vio Curiosity; al pulsarla se abre el visor. */
function Vista({ id, onAbrir, compacta }: { id: IdDestino; onAbrir: () => void; compacta?: boolean }) {
  const f = FOTOS[id];
  const etiqueta = f.tipo === "360" ? "360°" : f.tipo === "panoramica" ? "Panorámica" : "Foto";
  if (compacta)
    return (
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Ver lo que vio Curiosity: ${f.titulo}`}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[2px] border border-[#a0beff]/25"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local ya reducida */}
        <img src={f.mini} alt="" className="h-full w-full object-cover" />
      </button>
    );
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group relative block h-[96px] w-full overflow-hidden rounded-[2px] border border-[#a0beff]/20 text-left outline-none focus-visible:ring-1 focus-visible:ring-white/70"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local ya reducida */}
      <img src={f.mini} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#060a17]/85 px-2 py-1 text-[12px]">
        <span>Lo que vio Curiosity</span>
        <span className={`${CIFRA} text-[11px] text-[#b9c6e6]`}>{etiqueta} ↗</span>
      </span>
    </button>
  );
}

export default function Inspector({
  celda,
  posicion,
  ancla,
  vista,
  evitar,
  onAbrirFoto,
  destino,
  personalizado = null,
  p,
  ruta,
  perfil,
  onCerrar,
  onAgregarDestino,
  compacto = false,
}: Props) {
  // Alto real de la ficha (cambia al llegar la ruta o el perfil)
  const ref = useRef<HTMLElement>(null);
  const [altoMedido, setAltoMedido] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || compacto) return;
    const ro = new ResizeObserver(() => setAltoMedido(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [compacto]);
  const clave = `${celda.fila}-${celda.columna}`;
  const [previa, setPrevia] = useState<{ clave: string; id: string } | null>(null);

  const referencia = destino ? DESTINOS.find((d) => d.id === destino) : undefined;
  const nombre = referencia ? referencia.nombre : (personalizado?.nombre ?? null);
  const contexto = referencia ? `Punto de referencia · ${referencia.contexto}` : personalizado?.contexto;
  const etiqueta = destino ?? personalizado?.id ?? null;
  const tareas = personalizado?.tareas.filter((t) => t.trim()) ?? [];
  const f = p !== undefined ? franjaDe(p) : null;
  const { lat, lon } = celdaALatLon(celda.fila, celda.columna);
  const esHabitat = celda.fila === CELDA_HABITAT.fila && celda.columna === CELDA_HABITAT.columna;
  const alcance = f?.id === "muy" || f?.id === "probable";
  const titulo = nombre ?? (esHabitat ? TEXTOS.habitat : "Punto seleccionado");
  const colorFrase = alcance ? "text-[#ffcf70]" : "text-[#b9c6e6]";
  // Un punto cualquiera o un punto de referencia se pueden añadir; un destino de la misión ya lo es
  const puedeAgregar = !!onAgregarDestino && !personalizado && !esHabitat;

  if (compacto) {
    return (
      <section
        data-no-zoom
        aria-live="polite"
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto absolute inset-x-2 ${posicion === "arriba" ? "top-2 right-[3.75rem]" : "bottom-2"} z-30 flex items-center gap-2 rounded-[3px] border border-[#a0beff]/20 bg-[#070c1b] py-1.5 pl-2 text-[#eaf0ff]`}
      >
        {destino && <Vista id={destino} onAbrir={onAbrirFoto} compacta />}
        <Porcentaje p={p} className="text-[22px]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[14px]">{titulo}</p>
          <p className={`truncate text-[12px] ${colorFrase}`}>
            {f ? f.nombre : "Sin resultado"}
            {!esHabitat && <span className={`${CIFRA} text-[#8d9cc2]`}> · {distancia(distanciaM(CELDA_HABITAT, celda))}</span>}
          </p>
        </div>
        {puedeAgregar && (
          <button
            type="button"
            onClick={onAgregarDestino}
            aria-label="Añadir a los destinos de la misión"
            title="Añadir a los destinos de la misión"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-[#a0beff]/30 outline-none transition-colors hover:bg-white/[0.04] focus-visible:border-[#eaf0ff]/70"
          >
            <IconoAgregar />
          </button>
        )}
        <Cerrar onCerrar={onCerrar} />
      </section>
    );
  }

  // Junto al punto, donde no tape el camino trazado (ver colocar). Antes de medirla, alto estimado.
  const alto =
    altoMedido ??
    (destino ? 350 : 220) + (contexto && !destino ? 34 : 0) + (esHabitat ? -90 : 0) + (perfil ? 52 : 0) + (tareas.length ? 30 + Math.min(3, tareas.length) * 20 : 0) + (puedeAgregar ? 62 : 0);
  const puntos = !evitar ? [] : Array.isArray(evitar) ? evitar : [evitar];
  const sitio = colocar(ancla, vista, alto, puntos, previa?.clave === clave ? previa.id : null);
  if (!previa || previa.clave !== clave || previa.id !== sitio.id) setPrevia({ clave, id: sitio.id });
  const { left, top } = sitio;

  return (
    <section
      ref={ref}
      data-no-zoom
      aria-live="polite"
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute z-30 rounded-[3px] border border-[#a0beff]/20 bg-[#070c1b] text-[#eaf0ff] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)]"
      style={{ left, top, width: ANCHO }}
    >
      <header className="flex items-center justify-between border-b border-[#a0beff]/15 pl-3.5">
        <h3 className="flex min-w-0 items-baseline gap-2 text-[15px] font-medium">
          {etiqueta && <span className={`${CIFRA} text-[12px] font-normal text-[#8d9cc2]`}>{etiqueta}</span>}
          <span className="truncate">{titulo}</span>
        </h3>
        <Cerrar onCerrar={onCerrar} />
      </header>

      {/* ¿Puedo ir y volver? */}
      <div className="px-3.5 pb-3 pt-2.5">
        <Porcentaje p={p} className="text-[36px]" />
        <p className={`mt-1.5 text-[13.5px] ${colorFrase}`}>{f ? f.frase : "Sin resultado todavía"}</p>
        {contexto && <p className="mt-2 text-[12px] leading-snug text-[#8d9cc2]">{contexto}</p>}
        {destino && (
          <div className="mt-3">
            <Vista id={destino} onAbrir={onAbrirFoto} />
          </div>
        )}
      </div>

      {/* Destino de la misión: lo que la tripulación quiere hacer allí (se edita en el panel) */}
      {tareas.length > 0 && (
        <div className="border-t border-[#a0beff]/15 px-3.5 py-2">
          <p className="text-[12px] text-[#8d9cc2]">Tareas previstas</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {tareas.slice(0, 3).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] h-px w-2 shrink-0 bg-[#8d9cc2]" />
                <span className="min-w-0 truncate">{t}</span>
              </li>
            ))}
            {tareas.length > 3 && <li className="pl-4 text-[12px] text-[#8d9cc2]">y {tareas.length - 3} más en el panel</li>}
          </ul>
        </div>
      )}

      {!esHabitat && (
        <dl className="border-t border-[#a0beff]/15 px-3.5 py-2 text-[13px]">
          {/* ¿A qué distancia? */}
          <div className="flex items-baseline justify-between py-1">
            <dt className="text-[#8d9cc2]">Distancia al hábitat</dt>
            <dd className={CIFRA}>{distancia(distanciaM(CELDA_HABITAT, celda))}</dd>
          </div>
          {/* ¿Por dónde? */}
          <div className="flex items-center justify-between py-1">
            <dt className="text-[#8d9cc2]">Ruta{ruta.aproximada && " (aprox.)"}</dt>
            <dd className="flex items-center gap-3">
              {ruta.ruta ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Linea /> {TEXTOS.rutaIda}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Linea discontinua /> {TEXTOS.rutaVuelta}
                  </span>
                </>
              ) : (
                <span className="text-[#8d9cc2]">{ruta.cargando ? "…" : "Sin ruta"}</span>
              )}
            </dd>
          </div>
          {/* La ruta es la de menor energía según el modelo: cuánto sube y cuánto se empina */}
          {perfil && (
            <>
              <div className="flex items-baseline justify-between py-1">
                <dt className="text-[#8d9cc2]">Recorrido de ida</dt>
                <dd className={CIFRA}>
                  {distancia(perfil.longitudM)} · +{Math.round(perfil.subidaM)} m
                </dd>
              </div>
              <div className="flex items-baseline justify-between py-1">
                <dt className="text-[#8d9cc2]">Pendiente máx.</dt>
                <dd className={CIFRA}>{Math.round(perfil.pendienteMax)} %</dd>
              </div>
            </>
          )}
        </dl>
      )}

      {puedeAgregar && (
        <div className="border-t border-[#a0beff]/15 px-3.5 py-2.5">
          <button
            type="button"
            onClick={onAgregarDestino}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[3px] border border-dashed border-[#a0beff]/30 text-[13.5px] text-[#eaf0ff] outline-none transition-colors hover:border-[#a0beff]/50 hover:bg-white/[0.03] focus-visible:border-[#eaf0ff]/70"
          >
            <IconoAgregar />
            Añadir a los destinos de la misión
          </button>
        </div>
      )}

      <p className={`${CIFRA} border-t border-[#a0beff]/15 px-3.5 py-2 text-[11.5px] text-[#8d9cc2]`}>{latLon(lat, lon)}</p>
    </section>
  );
}

/** Mismo icono que «Añadir destino en el mapa» del panel. */
function IconoAgregar() {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden className="shrink-0">
      <path d="M0 -6v3.4M0 2.6V6M-6 0h3.4M2.6 0H6" stroke="#ff8fd8" strokeWidth="1.5" strokeLinecap="round" />
      <circle r="1.2" fill="#ff8fd8" />
    </svg>
  );
}
