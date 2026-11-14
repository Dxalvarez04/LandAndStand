"use client";

/**
 * PERSONA 2 · El mapa completo, autocontenido. Ver docs/estilo_mapa.md.
 *
 * Ocupa todo su contenedor (pantalla fija de la nave, sin scroll). El área de estudio (3,52 km,
 * cuadrada) se centra en la ventana. Cada esquina tiene una función fija:
 *   arriba izq. → indicación inicial · arriba der. → zoom · abajo izq. → clave · abajo der. → escala
 * La ficha de un punto se abre junto al punto; la foto de Curiosity se abre a pantalla completa.
 *
 * Capas, de abajo arriba:
 *   1. Mundo con zoom (raster): fondo HiRISE/relieve + probabilidad
 *   2. SVG: regla km, contornos 50/90 % y ruta (grosor fijo con el zoom) + etiquetas de contornos
 *   3. HTML: hábitat y destinos, selección, tooltip, ficha, controles, clave, escala
 *
 * Coordenadas: ver src/lib/mapa/geo.ts (la inversión de filas está ahí y solo ahí).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { IdDestino, Resultado, Ruta } from "@/lib/contract";
import { N } from "@/lib/constants";
import { DESTINOS, type DestinoMision } from "@/lib/data/targets";
import { FOTOS } from "@/lib/data/fotos";
import { useDatosMapa } from "@/hooks/useDatosMapa";
import { useRuta } from "@/hooks/useRuta";
import { useTransicion } from "@/hooks/useTransicion";
import { calcularContornos } from "@/lib/mapa/contornos";
import { acotar, CELDA_HABITAT, type Celda, celdaAMundo, indice, mundoACelda, type Punto } from "@/lib/mapa/geo";
import { MARGEN_CTX, RUTA_CONTEXTO, RUTA_RELIEVE } from "@/lib/mapa/contexto";
import { perfilRuta } from "@/lib/mapa/perfil";
import { TEXTOS } from "@/lib/mapa/textos";
import CapaContornos, { EtiquetasContornos } from "./CapaContornos";
import CapaFondo from "./CapaFondo";
import CapaProbabilidad from "./CapaProbabilidad";
import CapaRuta from "./CapaRuta";
import CapaSitios, { celdaDestino } from "./CapaSitios";
import Clave from "./Clave";
import Controles from "./Controles";
import Fuentes from "./Fuentes";
import Inspector from "./Inspector";
import Orientacion from "./Orientacion";
import Regla from "./Regla";
import Reticula from "./Reticula";
import Tooltip from "./Tooltip";
import VisorFoto from "./VisorFoto";
import { jost, plexMono } from "./fuente";
import type { Hueco } from "@/lib/panel";

export interface MapaMarteProps {
  resultado: Resultado | null;
  /** Solo para el resumen accesible */
  sol: number;
  calculando?: boolean;
  /** De useModelo; si no se pasa, el inspector dibuja una ruta aproximada */
  pedirRuta?: (celda: number) => Promise<Ruta | null>;
  /** Destinos de la misión (persona 3): propuestos (M1…) y añadidos por la tripulación (P1…) */
  destinosMision?: DestinoMision[];
  /** El panel pide elegir en el mapa el punto de un destino nuevo */
  seleccionandoDestino?: boolean;
  /** Punto ya elegido, a falta de nombre en el panel */
  puntoDestino?: Celda | null;
  onElegirPuntoDestino?: (punto: Celda) => void;
  onCancelarSeleccionDestino?: () => void;
  /**
   * Mapa 3D: en qué vista está. La página solo muestra el panel en «terreno», que se avisa cuando
   * la cámara ya se ha posado en la zona de estudio (no al empezar a bajar).
   */
  onFase?: (fase: "globo" | "descenso" | "terreno") => void;
  /** Parte del mapa que tapa el panel (px): los controles y el centro de la vista se apartan */
  hueco?: Hueco;
  /** El panel pide enfocar un destino (T1–T6 o P1…); `n` cambia en cada petición */
  enfoque?: { id: string; n: number } | null;
  /**
   * Desde la ficha de un punto: añadirlo a los destinos de la misión (el panel pide el nombre). En un
   * punto de referencia se sugieren su nombre y lo que se estudió allí.
   */
  onAgregarDestino?: (punto: Celda, sugerencia?: { nombre: string; tareas: string[] }) => void;
}

const ZOOM_MAX = 8;
const ESTRECHO = 560; // px: por debajo, ficha compacta (móvil)
const CLAVE_PISTA = "landstand.mapa.pistaVista";

const sinSuscripcion = () => () => {};
function leerPistaVista() {
  try {
    return localStorage.getItem(CLAVE_PISTA) === "1";
  } catch {
    return false;
  }
}

interface Seleccion {
  celda: Celda;
  /** Punto de referencia (T1–T6) */
  destino: IdDestino | null;
  /** Destino de la misión (M1…, P1…) */
  propio?: string | null;
}

export default function MapaMarte({
  resultado,
  sol,
  calculando = false,
  pedirRuta,
  seleccionandoDestino = false,
  onElegirPuntoDestino,
  onCancelarSeleccionDestino,
  onAgregarDestino,
  destinosMision = [],
  enfoque = null,
}: MapaMarteProps) {
  const contRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [vista, setVista] = useState({ w: 0, h: 0 }); // ventana del mapa, en px
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ celda: Celda; x: number; y: number } | null>(null);
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<IdDestino | null>(null);
  const [fuentesAbiertas, setFuentesAbiertas] = useState(false);
  const [pistaOcultada, setPistaOcultada] = useState(false);

  // El panel pide enfocar un destino: se selecciona (ruta y ficha); el área entera ya está a la vista
  const [enfoqueVisto, setEnfoqueVisto] = useState(enfoque?.n ?? 0);
  if (enfoque && enfoque.n !== enfoqueVisto) {
    setEnfoqueVisto(enfoque.n);
    const propio = destinosMision.find((d) => d.id === enfoque.id);
    const t = DESTINOS.find((d) => d.id === enfoque.id);
    if (propio) setSel({ celda: { fila: propio.fila, columna: propio.columna }, destino: null, propio: propio.id });
    else if (t) setSel({ celda: celdaDestino(t.id), destino: t.id });
  }

  const idRecorte = useId();
  const datos = useDatosMapa();
  const { fotograma, animando } = useTransicion(resultado?.prob ?? null);
  const contornos = useMemo(() => (fotograma ? calcularContornos(fotograma) : []), [fotograma]);
  const ruta = useRuta(sel?.celda ?? null, resultado, pedirRuta);
  const perfil = useMemo(
    () => (ruta.ruta && datos.dem && !ruta.aproximada ? perfilRuta(ruta.ruta.ida, datos.dem) : null),
    [ruta.ruta, ruta.aproximada, datos.dem],
  );

  // ---- Tamaño ----
  useEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setVista({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Área de estudio: el mayor cuadrado que cabe, centrado en la ventana (con hueco para la regla)
  const estrecho = vista.w < ESTRECHO;
  const margen = estrecho ? 8 : 40;
  // Si a los lados no queda sitio para la clave (abajo izq.) y la escala (abajo der.), se les reserva una franja abajo
  const ladoLibre = (vista.w - (Math.min(vista.w, vista.h) - 2 * margen)) / 2;
  const reservaAbajo = !estrecho && vista.h > 500 && ladoLibre < 240 ? 56 : 0;
  const tam = Math.max(0, Math.min(vista.w - 2 * margen, vista.h - 2 * margen - reservaAbajo));
  const ox = (vista.w - tam) / 2;
  const oy = (vista.h - reservaAbajo - tam) / 2;
  const u = tam / N; // píxeles por celda sin zoom
  // Terreno de contexto alrededor (solo visual), en píxeles con zoom 1
  const ctx = {
    x0: ox - MARGEN_CTX.oeste * u,
    y0: oy - MARGEN_CTX.norte * u,
    x1: ox + (N + MARGEN_CTX.este) * u,
    y1: oy + (N + MARGEN_CTX.sur) * u,
  };
  // Se puede alejar hasta que el contexto llene la ventana (nunca se ve vacío fuera de él)
  const kMin = tam > 0 ? Math.min(1, Math.max(vista.w / (ctx.x1 - ctx.x0), vista.h / (ctx.y1 - ctx.y0))) : 1;

  // ---- Zoom y desplazamiento (d3-zoom) ----
  useEffect(() => {
    const el = contRef.current;
    if (!el || !vista.w || !vista.h) return;
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([kMin, ZOOM_MAX])
      .extent([
        [0, 0],
        [vista.w, vista.h],
      ])
      .translateExtent([
        [Math.min(0, ctx.x0), Math.min(0, ctx.y0)],
        [Math.max(vista.w, ctx.x1), Math.max(vista.h, ctx.y1)],
      ])
      .clickDistance(6)
      .filter((ev: Event) => {
        const e = ev as MouseEvent;
        if ((e.target as Element | null)?.closest?.("[data-no-zoom]")) return false;
        return (!e.ctrlKey || e.type === "wheel") && !e.button;
      })
      .on("zoom", (ev) => setT(ev.transform));
    const s = select(el).call(z);
    s.call(z.transform, zoomIdentity); // al cambiar de tamaño, reencuadrar
    zoomRef.current = z;
    return () => {
      s.on(".zoom", null);
    };
    // ctx y kMin dependen solo del tamaño de la ventana
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista.w, vista.h]);

  const aPantalla = useCallback(
    (p: Punto): Punto => ({ x: t.applyX(ox + p.x * u), y: t.applyY(oy + p.y * u) }),
    [t, u, ox, oy],
  );
  const aMundo = useCallback(
    (x: number, y: number): Punto => ({ x: (t.invertX(x) - ox) / u, y: (t.invertY(y) - oy) / u }),
    [t, u, ox, oy],
  );

  const zoomPor = (k: number) => {
    const el = contRef.current;
    if (el && zoomRef.current) zoomRef.current.scaleBy(select(el).transition().duration(250), k);
  };
  const verTodo = () => {
    const el = contRef.current;
    if (el && zoomRef.current) zoomRef.current.transform(select(el).transition().duration(350), zoomIdentity);
  };

  // ---- Indicación de la primera vez (en el servidor no se muestra) ----
  const pistaVistaAntes = useSyncExternalStore(sinSuscripcion, leerPistaVista, () => true);
  const pistaVisible = !pistaVistaAntes && !pistaOcultada;
  const ocultarPista = () => {
    if (!pistaVisible) return;
    setPistaOcultada(true);
    try {
      localStorage.setItem(CLAVE_PISTA, "1");
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  };

  // ---- Probabilidades que se muestran (siguen la animación) ----
  const probCelda = (c: Celda) => fotograma?.[indice(c)];
  const probDestino = (id: IdDestino) => {
    if (!resultado) return undefined;
    if (animando) return probCelda(celdaDestino(id));
    return resultado.destinos.find((d) => d.id === id)?.p;
  };

  // ---- Interacción ----
  const elegir = (celda: Celda, destino: IdDestino | null = null, propio: string | null = null) => {
    setSel({ celda, destino, propio });
    ocultarPista();
  };

  const posRaton = (e: React.PointerEvent | React.MouseEvent) => {
    const r = contRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onClick = (e: React.MouseEvent) => {
    const { x, y } = posRaton(e);
    const c = mundoACelda(aMundo(x, y));
    if (c && seleccionandoDestino) onElegirPuntoDestino?.(c);
    else if (c) elegir(c);
    else setSel(null); // fuera del área de estudio: cerrar la ficha
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.buttons) return setHover(null);
    if ((e.target as Element).closest("[data-no-zoom]")) return setHover(null);
    const { x, y } = posRaton(e);
    const c = mundoACelda(aMundo(x, y));
    setHover(c ? { celda: c, x, y } : null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (fotoAbierta) return;
    const paso = e.shiftKey ? 5 : 1;
    const mover: Record<string, [number, number]> = {
      ArrowUp: [paso, 0],
      ArrowDown: [-paso, 0],
      ArrowLeft: [0, -paso],
      ArrowRight: [0, paso],
    };
    if (mover[e.key]) {
      e.preventDefault();
      const base = sel?.celda ?? CELDA_HABITAT;
      const [df, dc] = mover[e.key];
      elegir(acotar({ fila: base.fila + df, columna: base.columna + dc }));
    } else if (e.key === "Escape") {
      if (seleccionandoDestino) onCancelarSeleccionDestino?.();
      else setSel(null);
    }
    else if (e.key === "+" || e.key === "=") zoomPor(1.6);
    else if (e.key === "-") zoomPor(1 / 1.6);
    else if (e.key === "0") verTodo();
  };

  // ---- Textos de estado ----
  const probables = resultado ? resultado.destinos.filter((d) => d.p >= 0.5).length : 0;
  // Mientras calcula se mantiene el resultado anterior: el resumen no anuncia el sol nuevo con cifras viejas
  const resumen = !resultado
    ? "Mapa de alcance a pie, cargando."
    : calculando
      ? "Mapa de alcance a pie, calculando el nuevo escenario."
      : TEXTOS.resumen(sol, probables, DESTINOS.length);

  const posSel = sel ? aPantalla(celdaAMundo(sel.celda)) : null;
  const hoverP = hover ? probCelda(hover.celda) : undefined;
  const nombreFoto = fotoAbierta ? DESTINOS.find((d) => d.id === fotoAbierta)?.nombre ?? "" : "";

  return (
    <div
      className={`${jost.variable} ${plexMono.variable} flex h-full w-full min-w-0 flex-col bg-[#060a17] p-2 text-[#eaf0ff]`}
      style={{ fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif" }}
    >
      <div
        ref={contRef}
        tabIndex={0}
        role="application"
        aria-roledescription="mapa"
        aria-label={`${resumen} Flechas para moverse por el mapa, más y menos para el zoom, Escape para cerrar.`}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        className="relative min-h-0 flex-1 cursor-crosshair select-none overflow-hidden bg-[#060a17] outline-none focus-visible:ring-1 focus-visible:ring-[#eaf0ff]/50"
        style={{ touchAction: "none" }}
      >
        {tam > 0 && (
          <>
            {/* 1 · Mundo con zoom */}
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: vista.w, height: vista.h, transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}
            >
              {/* Terreno alrededor, apagado: aquí no hay cálculo */}
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen científica a tamaño fijo */}
              <img
                src={RUTA_CONTEXTO}
                alt=""
                draggable={false}
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="pointer-events-none absolute max-w-none select-none [filter:saturate(0.55)_brightness(0.5)]"
                style={{ left: ctx.x0, top: ctx.y0, width: ctx.x1 - ctx.x0, height: ctx.y1 - ctx.y0 }}
              />
              <div className="absolute overflow-hidden ring-1 ring-[#eaf0ff]/45" style={{ left: ox, top: oy, width: tam, height: tam }}>
                <CapaFondo dem={datos.dem} hayImagen={datos.hayImagen} />
                <CapaProbabilidad prob={fotograma} />
                {/* Relieve de 8 m encima del color: se ven las crestas y por qué el alcance se corta */}
                {/* eslint-disable-next-line @next/next/no-img-element -- capa de relieve a tamaño fijo */}
                <img
                  src={RUTA_RELIEVE}
                  alt=""
                  draggable={false}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none opacity-90 mix-blend-soft-light"
                />
              </div>
            </div>

            {/* 2 · Vectores */}
            <Regla aPantalla={aPantalla} ancho={vista.w} alto={vista.h} rotulos={!estrecho} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <g transform={`translate(${t.x + t.k * ox} ${t.y + t.k * oy}) scale(${t.k * u})`}>
                {/* Las líneas no salen del área de estudio (los contornos se cierran por fuera) */}
                <clipPath id={idRecorte}>
                  <rect x={0} y={0} width={N} height={N} />
                </clipPath>
                <g clipPath={`url(#${idRecorte})`}>
                  <CapaContornos contornos={contornos} />
                  <CapaRuta ruta={sel ? ruta.ruta : null} />
                </g>
              </g>
              <EtiquetasContornos
                contornos={contornos}
                aPantalla={aPantalla}
                pxPorCelda={u * t.k}
                evitar={aPantalla(celdaAMundo(CELDA_HABITAT))}
              />
            </svg>

            {/* 3 · Sitios, selección e información */}
            <CapaSitios
              aPantalla={aPantalla}
              probDe={probDestino}
              seleccionado={sel?.destino ?? null}
              compacto={tam * t.k < 520}
              tam={vista.w}
              onElegir={(id) => elegir(celdaDestino(id), id)}
              mision={destinosMision}
              probCelda={probCelda}
              misionSel={sel?.propio ?? null}
              onElegirMision={(id) => {
                const d = destinosMision.find((x) => x.id === id);
                if (d) elegir({ fila: d.fila, columna: d.columna }, null, id);
              }}
            />
            {posSel && <Reticula x={posSel.x} y={posSel.y} />}

            {hover && hoverP !== undefined && <Tooltip x={hover.x} y={hover.y} p={hoverP} ancho={vista.w} />}

            {sel && posSel && (
              <Inspector
                celda={sel.celda}
                posicion={posSel.y > vista.h / 2 ? "arriba" : "abajo"}
                ancla={posSel}
                vista={vista}
                evitar={aPantalla(celdaAMundo(CELDA_HABITAT))}
                destino={sel.destino}
                personalizado={sel.propio ? (destinosMision.find((d) => d.id === sel.propio) ?? null) : null}
                p={sel.destino ? probDestino(sel.destino) : probCelda(sel.celda)}
                ruta={ruta}
                perfil={perfil}
                onCerrar={() => setSel(null)}
                onAbrirFoto={() => sel.destino && setFotoAbierta(sel.destino)}
                onAgregarDestino={
                  onAgregarDestino &&
                  (() => {
                    const t = sel.destino ? DESTINOS.find((d) => d.id === sel.destino) : undefined;
                    onAgregarDestino(sel.celda, t && { nombre: t.nombre, tareas: t.tareas });
                    setSel(null);
                  })
                }
                compacto={estrecho}
              />
            )}

            {pistaVisible && !sel && (
              <p className="pointer-events-none absolute left-3 top-3 z-20 max-w-[16rem] rounded-md bg-[#060a17]/90 px-3 py-2 text-[13px] leading-snug text-[#b9c6e6]">
                {TEXTOS.pista}
              </p>
            )}

            <Controles
              onAcercar={() => zoomPor(1.6)}
              onAlejar={() => zoomPor(1 / 1.6)}
              onVerTodo={verTodo}
              movido={Math.abs(t.k - 1) > 0.001 || Math.abs(t.x) > 0.5 || Math.abs(t.y) > 0.5}
              puedeAcercar={t.k < ZOOM_MAX - 0.001}
              puedeAlejar={t.k > kMin + 0.001}
            />
            {/* En móvil, la franja de la ficha abajo ocupa el sitio de la clave y la escala */}
            {!(sel && estrecho && posSel && posSel.y <= vista.h / 2) && (
              <>
                <Clave />
                <Orientacion tam={tam} k={t.k} onFuentes={() => setFuentesAbiertas(true)} />
              </>
            )}
          </>
        )}
      </div>

      {fuentesAbiertas && <Fuentes onCerrar={() => setFuentesAbiertas(false)} />}
      {fotoAbierta && <VisorFoto foto={FOTOS[fotoAbierta]} nombre={nombreFoto} onCerrar={() => setFotoAbierta(null)} />}
    </div>
  );
}
