"use client";

/**
 * PERSONA 2 · Mapa 3D de Marte. Mismas props que el mapa 2D (MapaMarte), que queda como plan B si el
 * dispositivo no tiene WebGL o si la escena 3D falla.
 *
 * Fases:
 *   globo     → Marte entero (Viking + MOLA, atmósfera, estrellas) con Gale marcado.
 *   descenso  → la cámara baja hasta Gale (empieza sola a los ~2 s; tocar «Saltar» o el globo la para).
 *   terreno   → la zona de estudio en 3D con la probabilidad, contornos, destinos, ruta y ficha.
 *
 * Esquinas (como en el 2D): arriba izq. indicación · arriba der. controles · abajo izq. clave ·
 * abajo der. fuentes, escala (cenital) y brújula. La ficha se abre junto al punto tocado, sin tapar
 * el camino trazado.
 *
 * El panel flota encima del mapa (no lo redimensiona): las esquinas se apartan de él (`hueco`) y la
 * escena desplaza su centro. En el terreno el lienzo solo se dibuja cuando algo cambia (frameloop
 * «demand»); lo que cambia en cada fotograma va al almacén `vivo` (ver lib/mapa3d/almacen.ts).
 */
import { useProgress, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Component,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { IdDestino } from "@/lib/contract";
import MapaMarte, { type MapaMarteProps } from "@/components/mapa/MapaMarte";
import Inspector from "@/components/mapa/Inspector";
import Tooltip from "@/components/mapa/Tooltip";
import Clave from "@/components/mapa/Clave";
import VisorFoto from "@/components/mapa/VisorFoto";
import Fuentes from "@/components/mapa/Fuentes";
import { celdaDestino } from "@/components/mapa/CapaSitios";
import { CIFRA, jost, plexMono } from "@/components/mapa/fuente";
import { useTransicion } from "@/hooks/useTransicion";
import { useRuta } from "@/hooks/useRuta";
import { calcularContornos } from "@/lib/mapa/contornos";
import { cargarDem } from "@/lib/mapa/cargarDatos";
import { RUTA_CONTEXTO } from "@/lib/mapa/contexto";
import { perfilRuta } from "@/lib/mapa/perfil";
import { acotar, CELDA_HABITAT, indice, type Celda } from "@/lib/mapa/geo";
import { enIdioma, useIdioma } from "@/lib/i18n";
import SelectorIdioma from "@/components/SelectorIdioma";
import { DESTINOS } from "@/lib/data/targets";
import { FOTOS } from "@/lib/data/fotos";
import { cargarAlturas, type Alturas } from "@/lib/mapa3d/alturas";
import { crearAlmacen, estadoVivoInicial, useAlmacen, type Almacen, type EstadoVivo, type PuntoPx } from "@/lib/mapa3d/almacen";
import { CURVA_PANEL, DURACION_PANEL, SIN_HUECO } from "@/lib/panel";
import EscenaGlobo from "./EscenaGlobo";
import EscenaTerreno, { type Orden, type Vista } from "./EscenaTerreno";
import { precalentarTerreno } from "./Terreno";
import Efectos from "./Efectos";
import Controles3D from "./Controles3D";
import Brujula from "./Brujula";

const ESTRECHO = 560;
const CLAVE_PISTA = "landstand.mapa.pistaVista";
const sinSuscripcion = () => () => {};

let webglCache: boolean | null = null;
function hayWebGL() {
  if (webglCache === null) {
    try {
      webglCache = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const consulta = (q: string) => () => {
  try {
    return window.matchMedia(q).matches;
  } catch {
    return false;
  }
};
const esMovil = consulta("(pointer: coarse), (max-width: 900px)");
const esReducido = consulta("(prefers-reduced-motion: reduce)");
function leerPistaVista() {
  try {
    return localStorage.getItem(CLAVE_PISTA) === "1";
  } catch {
    return false;
  }
}

class Respaldo extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("[mapa 3D] se usa el mapa 2D:", e);
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

function MapaMarte3D(props: MapaMarteProps) {
  const webgl = useSyncExternalStore(sinSuscripcion, hayWebGL, () => true);
  if (!webgl) return <Plano2D {...props} />;
  return (
    <Respaldo fallback={<Plano2D {...props} />}>
      <Mapa3D {...props} />
    </Respaldo>
  );
}

/** La página se re-renderiza con el progreso del cálculo; el mapa, solo si cambian sus datos. */
export default memo(MapaMarte3D);

/** Plan B en 2D: no hay globo, así que el panel se ve desde el principio. El mapa 2D sí se ajusta al hueco. */
function Plano2D(props: MapaMarteProps) {
  const { onFase, hueco = SIN_HUECO } = props;
  useEffect(() => onFase?.("terreno"), [onFase]);
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute left-0 top-0 transition-[right,bottom] motion-reduce:transition-none"
        style={{ right: hueco.der, bottom: hueco.abajo, transitionDuration: `${DURACION_PANEL}ms`, transitionTimingFunction: CURVA_PANEL }}
      >
        <MapaMarte {...props} />
      </div>
    </div>
  );
}

type Fase = "globo" | "descenso" | "terreno";
interface Seleccion {
  celda: Celda;
  destino: IdDestino | null;
  /** Destino añadido desde el panel (P1, P2…) */
  propio: string | null;
}

/** Función estable que siempre llama a la última versión de `f` (para no re-renderizar la escena). */
function useEstable<A extends unknown[], R>(f: (...a: A) => R): (...a: A) => R {
  const ref = useRef(f);
  useLayoutEffect(() => {
    ref.current = f;
  });
  return useCallback((...a: A) => ref.current(...a), []);
}

function Mapa3D({
  resultado,
  sol,
  calculando = false,
  pedirRuta,
  destinosMision = [],
  seleccionandoDestino = false,
  puntoDestino = null,
  onElegirPuntoDestino,
  onCancelarSeleccionDestino,
  onFase,
  hueco: huecoProp = SIN_HUECO,
  enfoque = null,
  onAgregarDestino,
}: MapaMarteProps) {
  const movil = useSyncExternalStore(sinSuscripcion, esMovil, () => false);
  const reducido = useSyncExternalStore(sinSuscripcion, esReducido, () => false);
  const { t, idioma, pctEntero } = useIdioma();
  const contRef = useRef<HTMLDivElement>(null);
  const [vistaPx, setVistaPx] = useState({ w: 0, h: 0 });
  const [vivo] = useState<Almacen<EstadoVivo>>(() => crearAlmacen(estadoVivoInicial()));

  const [fase, setFase] = useState<Fase>("globo");
  const [asentado, setAsentado] = useState(false);
  const [fundido, setFundido] = useState(false);
  const [intro, setIntro] = useState(true);
  const [vista, setVista] = useState<Vista>("3d");
  const [orden, setOrden] = useState<Orden>({ tipo: "reset", n: 0 });
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState<IdDestino | null>(null);
  const [fuentesAbiertas, setFuentesAbiertas] = useState(false);
  const [alturas, setAlturas] = useState<Alturas | null>(null);
  const [dem, setDem] = useState<Float32Array | null>(null);
  const [pistaOcultada, setPistaOcultada] = useState(false);
  const pistaVistaAntes = useSyncExternalStore(sinSuscripcion, leerPistaVista, () => true);

  const { active: cargando, progress } = useProgress();
  // La pantalla de carga solo cubre la primera carga (el globo); las siguientes no la vuelven a mostrar
  const [cargaInicial, setCargaInicial] = useState(true);
  if (cargaInicial && !cargando && progress >= 100) setCargaInicial(false);

  // El hueco solo cuenta en el terreno (en el globo no hay panel); objeto estable para la escena
  const { der, abajo } = huecoProp;
  const hueco = useMemo(() => ({ der, abajo }), [der, abajo]);

  // ---- Datos ----
  // Las texturas del terreno se piden mientras se ve el globo: al llegar ya están (sin hueco en negro)
  useEffect(() => {
    if (cargaInicial) return;
    for (const url of [RUTA_CONTEXTO, "/data/aoi_color.jpg", "/data/3d/terreno_normal.jpg"]) useTexture.preload(url);
  }, [cargaInicial]);
  useEffect(() => {
    cargarAlturas().then(setAlturas).catch((e) => console.warn("[mapa 3D] alturas:", e));
    cargarDem().then(setDem);
  }, []);
  // La malla del terreno se prepara mientras se ve el globo: bajar no bloquea la animación
  useEffect(() => {
    if (alturas && !cargaInicial) precalentarTerreno(alturas, movil ? 2 : 1);
  }, [alturas, movil, cargaInicial]);
  useEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setVistaPx({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { fotograma, animando } = useTransicion(resultado?.prob ?? null);
  const contornos = useMemo(() => (fotograma ? calcularContornos(fotograma) : []), [fotograma]);
  const ruta = useRuta(sel?.celda ?? null, resultado, pedirRuta);
  const perfil = useMemo(
    () => (ruta.ruta && dem && !ruta.aproximada ? perfilRuta(ruta.ruta.ida, dem) : null),
    [ruta.ruta, ruta.aproximada, dem],
  );

  const probCelda = useCallback((c: Celda) => fotograma?.[indice(c)], [fotograma]);
  // Destinos de la misión en el mapa: propuestos (M1…) y añadidos por la tripulación (P1…)
  const propios = useMemo(
    () =>
      destinosMision.map((original) => enIdioma(original, idioma)).map((d) => ({
        id: d.id,
        nombre: d.nombre,
        tareas: d.tareas,
        contexto: d.contexto,
        propuesto: !!d.propuesto,
        celda: { fila: d.fila, columna: d.columna },
      })),
    [destinosMision, idioma],
  );
  const probDestino = useCallback(
    (id: IdDestino) => {
      if (!resultado) return undefined;
      if (animando) return probCelda(celdaDestino(id));
      return resultado.destinos.find((d) => d.id === id)?.p;
    },
    [resultado, animando, probCelda],
  );

  // ---- Fases ----
  // El panel entra cuando la cámara ya se ha posado en la zona de estudio (no al empezar a bajar)
  const enTerreno = fase === "terreno" && alturas !== null;
  const faseAviso: Fase = fase === "terreno" ? (enTerreno && asentado ? "terreno" : "descenso") : fase;
  useEffect(() => onFase?.(faseAviso), [faseAviso, onFase]);
  const alAsentar = useCallback(() => setAsentado(true), []);
  // Se baja a la zona de estudio tocando el rótulo de Gale en el globo (no hay descenso automático)
  const alLlegar = useCallback(() => {
    setFundido(true);
    setTimeout(() => {
      setFase("terreno");
      setTimeout(() => setFundido(false), 80);
    }, 260);
  }, []);
  // Al globo con el mismo fundido que a la llegada (sin cortes). Se avisa ya de la fase «globo»
  // para que el panel salga bajo el fundido: montar el globo bloquea el hilo y cortaría su animación.
  const volverAlGlobo = () => {
    setSel(null);
    vivo.set({ hover: null });
    setFundido(true);
    onFase?.("globo");
    setTimeout(() => {
      setIntro(true);
      setAsentado(false);
      setFase("globo");
      setTimeout(() => setFundido(false), 80);
    }, 320);
  };
  const irAGale = () => {
    setIntro(true);
    setFase("descenso");
  };

  // El panel pide un punto para un destino nuevo: se cierra la ficha y, si estábamos en el globo,
  // se baja a la zona de estudio
  const [eligiendoAntes, setEligiendoAntes] = useState(seleccionandoDestino);
  if (seleccionandoDestino !== eligiendoAntes) {
    setEligiendoAntes(seleccionandoDestino);
    if (seleccionandoDestino) {
      setSel(null);
      if (fase === "globo") irAGale();
    }
  }

  // El panel pide enfocar un destino de la misión: se vuela hasta él y se selecciona (ruta y ficha)
  const [enfoqueVisto, setEnfoqueVisto] = useState(enfoque?.n ?? 0);
  if (enfoque && enfoque.n !== enfoqueVisto) {
    setEnfoqueVisto(enfoque.n);
    const propio = propios.find((d) => d.id === enfoque.id);
    const t = propio ? undefined : DESTINOS.find((d) => d.id === enfoque.id);
    const celda = propio?.celda ?? (t ? celdaDestino(t.id) : undefined);
    if (celda && fase === "terreno") {
      if (!seleccionandoDestino) setSel({ celda, destino: t ? t.id : null, propio: propio ? propio.id : null });
      setOrden((o) => ({ tipo: "enfocar", n: o.n + 1, celda }));
    }
  }

  // ---- Selección ----
  const ocultarPista = () => {
    if (pistaVistaAntes || pistaOcultada) return;
    setPistaOcultada(true);
    try {
      localStorage.setItem(CLAVE_PISTA, "1");
    } catch {
      /* sin almacenamiento */
    }
  };
  const elegir = (celda: Celda | null, destino: IdDestino | null = null, propio: string | null = null) => {
    if (seleccionandoDestino) {
      if (celda) onElegirPuntoDestino?.(celda);
      return;
    }
    setSel(celda ? { celda, destino, propio } : null);
    if (celda) ocultarPista();
  };
  // Estables: la escena (memo) no se vuelve a renderizar por ellas
  const elegirCelda = useEstable((c: Celda | null) => elegir(c));
  const elegirDestino = useEstable((id: IdDestino) => elegir(celdaDestino(id), id));
  const elegirPropio = useEstable((id: string) => {
    const d = propios.find((x) => x.id === id);
    if (d) elegir(d.celda, null, id);
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (fotoAbierta || fuentesAbiertas || fase !== "terreno") return;
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
    } else if (e.key === "+" || e.key === "=") setOrden((o) => ({ tipo: "acercar", n: o.n + 1 }));
    else if (e.key === "-") setOrden((o) => ({ tipo: "alejar", n: o.n + 1 }));
    else if (e.key === "0") setOrden((o) => ({ tipo: "reset", n: o.n + 1 }));
    else if (e.key === "c" || e.key === "C") setVista((v) => (v === "3d" ? "cenital" : "3d"));
  };

  // ---- Textos ----
  const probables = resultado ? propios.filter((d) => resultado.prob[indice(d.celda)] >= 0.5).length : 0;
  const resumen = !resultado ? t.resumenCargando : calculando ? t.resumenCalculando : t.resumen(sol, probables, propios.length);

  // Parte visible del mapa (la que no tapa el panel)
  const visible = { w: Math.max(0, vistaPx.w - hueco.der), h: Math.max(0, vistaPx.h - hueco.abajo) };
  const estrecho = visible.w < ESTRECHO;
  const nombreFoto = fotoAbierta ? (DESTINOS.find((d) => d.id === fotoAbierta)?.nombre ?? "") : "";
  const referenciaEnIdioma = (id: IdDestino) => {
    const r = DESTINOS.find((d) => d.id === id);
    return r && enIdioma(r, idioma);
  };
  const post = !movil;
  // Si el panel borra el destino abierto, la ficha queda como un punto normal
  const propioAbierto = sel?.propio ? (propios.find((d) => d.id === sel.propio) ?? null) : null;

  return (
    <div
      className={`${jost.variable} ${plexMono.variable} flex h-full w-full min-w-0 flex-col bg-black text-[#eaf0ff]`}
      style={{ fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif" }}
    >
      <div
        ref={contRef}
        tabIndex={0}
        role="application"
        aria-roledescription={t.rolMapa3d}
        aria-label={`${resumen} ${t.ayudaMapa3d}`}
        onKeyDown={onKeyDown}
        className={`relative min-h-0 flex-1 select-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#eaf0ff]/50 ${seleccionandoDestino && enTerreno ? "cursor-crosshair" : ""}`}
        style={{ touchAction: "none" }}
      >
        <Canvas
          shadows="percentage"
          frameloop={enTerreno ? "demand" : "always"}
          dpr={[1, movil ? 1.25 : 1.75]}
          gl={{ antialias: !post, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 40, near: 0.002, far: 400, position: [0, 0, 3] }}
          onPointerMissed={() => fase === "terreno" && setSel(null)}
        >
          <Suspense fallback={null}>
            {!enTerreno || !alturas ? (
              <EscenaGlobo
                descendiendo={fase === "descenso"}
                hd={!movil}
                reducido={reducido}
                onLlegada={alLlegar}
                onIrAGale={irAGale}
                mostrarMarca={!cargaInicial}
              />
            ) : (
              <EscenaTerreno
                alturas={alturas}
                fotograma={fotograma}
                contornos={contornos}
                probDe={probDestino}
                probCelda={probCelda}
                celdaSel={sel?.celda ?? null}
                destinoSel={sel?.destino ?? null}
                ruta={ruta.ruta}
                vista={vista}
                orden={orden}
                intro={intro}
                movil={movil}
                reducido={reducido}
                compacto={estrecho}
                propios={propios}
                propioSel={sel?.propio ?? null}
                puntoNuevo={puntoDestino}
                eligiendo={seleccionandoDestino}
                hueco={hueco}
                vivo={vivo}
                onElegirCelda={elegirCelda}
                onElegirDestino={elegirDestino}
                onElegirPropio={elegirPropio}
                onAsentado={alAsentar}
              />
            )}
            {post && <Efectos terreno={enTerreno} />}
          </Suspense>
        </Canvas>

        {/* ---- Interfaz: ocupa la parte que no tapa el panel y se aparta con él ---- */}
        <div
          className="pointer-events-none absolute left-0 top-0 transition-[right,bottom] motion-reduce:transition-none"
          style={{ right: hueco.der, bottom: hueco.abajo, transitionDuration: `${DURACION_PANEL}ms`, transitionTimingFunction: CURVA_PANEL }}
        >
          {enTerreno && (
            <>
              <TooltipVivo vivo={vivo} probCelda={probCelda} ancho={visible.w} />
              {/* Elegir el punto de un destino nuevo (lo pide el panel) */}
              {seleccionandoDestino && (
                <div
                  role="status"
                  className="pointer-events-auto absolute left-3 top-3 z-30 flex max-w-[calc(100%-12rem)] items-center gap-3 rounded-md bg-[#060a17]/95 py-1 pl-3 pr-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)] [@media(max-width:560px)]:max-w-[calc(100%-8.5rem)]"
                >
                  <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden className="shrink-0">
                    <path d="M0 -7v4M0 3v4M-7 0h4M3 0h4" stroke="#ff8fd8" strokeWidth="1.6" strokeLinecap="round" />
                    <circle r="1.4" fill="#ff8fd8" />
                  </svg>
                  <p className="min-w-0 text-[13.5px] leading-snug">
                    {t.elegirPunto}
                    <span className="block text-[12px] text-[#8d9cc2]">{t.elegirPuntoAyuda}</span>
                  </p>
                  <button
                    type="button"
                    onClick={onCancelarSeleccionDestino}
                    className="h-11 shrink-0 rounded px-3 text-[13px] text-[#b9c6e6] outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-white/60"
                  >
                    {t.cancelar}
                  </button>
                </div>
              )}
              {/* Volver al globo: arriba a la izquierda, donde se busca «atrás» */}
              {!seleccionandoDestino && (
                <button
                  type="button"
                  onClick={volverAlGlobo}
                  aria-label={t.volverGlobo}
                  title={t.volverGlobo}
                  className="pointer-events-auto absolute left-3 top-3 z-20 flex h-11 items-center gap-2 rounded-md bg-[#060a17]/90 pl-3 pr-4 text-[14px] text-[#eaf0ff] outline-none transition-colors hover:bg-[#0b1226] focus-visible:ring-1 focus-visible:ring-white/60 [@media(max-width:560px)]:w-11 [@media(max-width:560px)]:justify-center [@media(max-width:560px)]:px-0"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                  <span className="[@media(max-width:560px)]:hidden">{t.globoMarte}</span>
                </button>
              )}
              {!pistaVistaAntes && !pistaOcultada && !sel && !seleccionandoDestino && (
                <p className="pointer-events-none absolute left-3 top-[4.25rem] z-20 max-w-[16rem] rounded-md bg-[#060a17]/90 px-3 py-2 text-[13px] leading-snug text-[#b9c6e6]">
                  {t.pista3d}
                </p>
              )}
              <Controles3D
                onAcercar={() => setOrden((o) => ({ tipo: "acercar", n: o.n + 1 }))}
                onAlejar={() => setOrden((o) => ({ tipo: "alejar", n: o.n + 1 }))}
                vista={vista}
                onVista={setVista}
                compacto={estrecho}
              />
              <CapaViva
                vivo={vivo}
                vista={visible}
                estrecho={estrecho}
                cenital={vista === "cenital"}
                onFuentes={() => setFuentesAbiertas(true)}
                ficha={
                  sel && {
                    celda: sel.celda,
                    destino: sel.destino,
                    personalizado: propioAbierto,
                    p: sel.destino ? probDestino(sel.destino) : probCelda(sel.celda),
                    ruta,
                    perfil,
                    onCerrar: () => setSel(null),
                    onAbrirFoto: () => sel.destino && setFotoAbierta(sel.destino),
                    onAgregarDestino:
                      onAgregarDestino &&
                      (() => {
                        // En un punto de referencia se sugieren su nombre y lo que se estudió allí
                        const r = sel.destino ? referenciaEnIdioma(sel.destino) : undefined;
                        onAgregarDestino(sel.celda, r && { nombre: r.nombre, tareas: r.tareas });
                        setSel(null);
                      }),
                  }
                }
              />
            </>
          )}

          {/* ---- Interfaz del globo ---- */}
          {!enTerreno && !cargaInicial && (
            <>
              <SelectorIdioma className="pointer-events-auto absolute right-3 top-3 z-20" />
              <Brujula azimut={0} mPorPx={null} onFuentes={() => setFuentesAbiertas(true)} textoFuentes={t.textoFuentesGlobo} />
            </>
          )}
        </div>

        {/* Carga inicial */}
        {cargaInicial && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black">
            <p className="text-[15px] text-[#eaf0ff]">{t.cargandoMarte}</p>
            <div className="h-[3px] w-48 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-[#eaf0ff] transition-[width] duration-200" style={{ width: `${Math.round(progress)}%` }} />
            </div>
            <p className={`${CIFRA} text-[12px] text-[#8d9cc2]`}>{pctEntero(Math.round(progress))}</p>
          </div>
        )}

        {/* Entrada en la atmósfera */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-[#cfa985] transition-opacity ease-out"
          style={{ opacity: fundido ? 1 : 0, transitionDuration: fundido ? "240ms" : "650ms" }}
        />
      </div>

      {fuentesAbiertas && <Fuentes onCerrar={() => setFuentesAbiertas(false)} />}
      {fotoAbierta && <VisorFoto foto={FOTOS[fotoAbierta]} nombre={nombreFoto} onCerrar={() => setFotoAbierta(null)} />}
    </div>
  );
}

/** Probabilidad bajo el ratón (se renderiza sola con cada movimiento, no el mapa entero). */
function TooltipVivo({ vivo, probCelda, ancho }: { vivo: Almacen<EstadoVivo>; probCelda: (c: Celda) => number | undefined; ancho: number }) {
  const hover = useAlmacen(vivo, (v) => v.hover);
  const p = hover ? probCelda(hover.celda) : undefined;
  if (!hover || p === undefined) return null;
  return <Tooltip x={hover.x} y={hover.y} p={p} ancho={ancho} />;
}

interface DatosFicha {
  celda: Celda;
  destino: IdDestino | null;
  personalizado: { id: string; nombre: string; tareas: string[]; contexto?: string } | null;
  p: number | undefined;
  ruta: ReturnType<typeof useRuta>;
  perfil: ReturnType<typeof perfilRuta> | null;
  onCerrar: () => void;
  onAbrirFoto: () => void;
  onAgregarDestino?: () => void;
}

/** Alto aproximado de la ficha compacta (franja arriba o abajo en pantallas estrechas). */
const FRANJA_PX = 76;

/**
 * Franja de la ficha compacta: arriba o abajo, la que menos tape del camino y nunca encima del punto.
 * A igualdad, como antes: en la mitad contraria a la del punto.
 */
function franjaCompacta(ancla: PuntoPx | null, camino: PuntoPx[], alto: number): "arriba" | "abajo" {
  const cuenta = (arriba: boolean) => {
    const dentro = (q: PuntoPx) => (arriba ? q.y <= FRANJA_PX : q.y >= alto - FRANJA_PX);
    let n = ancla && dentro(ancla) ? 1000 : 0;
    for (const q of camino) if (dentro(q)) n++;
    return n;
  };
  const a = cuenta(true);
  const b = cuenta(false);
  if (a === b) return (ancla?.y ?? 0) > alto / 2 ? "arriba" : "abajo";
  return a < b ? "arriba" : "abajo";
}

/**
 * Lo que sigue a la cámara: ficha junto al punto (sin tapar el camino), clave y brújula. Se
 * renderiza al mover la cámara; el resto del mapa, no.
 */
function CapaViva({
  vivo,
  vista,
  estrecho,
  cenital,
  onFuentes,
  ficha,
}: {
  vivo: Almacen<EstadoVivo>;
  vista: { w: number; h: number };
  estrecho: boolean;
  cenital: boolean;
  onFuentes: () => void;
  ficha: DatosFicha | null;
}) {
  const { t } = useIdioma();
  const ancla = useAlmacen(vivo, (v) => v.ancla);
  const habPx = useAlmacen(vivo, (v) => v.habPx);
  const rutaPx = useAlmacen(vivo, (v) => v.rutaPx);
  const azimut = useAlmacen(vivo, (v) => v.azimut);
  const mPorPx = useAlmacen(vivo, (v) => v.mPorPx);

  const camino = rutaPx.length ? rutaPx : habPx ? [habPx] : [];
  const franja = franjaCompacta(ancla, camino, vista.h);
  // En móvil, la franja de la ficha abajo ocupa el sitio de la clave y la brújula
  const esquinas = !(ficha && estrecho && franja === "abajo");

  return (
    <>
      {ficha && (
        <Inspector
          celda={ficha.celda}
          posicion={franja}
          ancla={ancla ?? { x: 12, y: vista.h / 2 }}
          vista={vista}
          evitar={camino}
          destino={ficha.destino}
          personalizado={ficha.personalizado}
          p={ficha.p}
          ruta={ficha.ruta}
          perfil={ficha.perfil}
          onCerrar={ficha.onCerrar}
          onAbrirFoto={ficha.onAbrirFoto}
          onAgregarDestino={ficha.onAgregarDestino}
          compacto={estrecho}
        />
      )}
      {esquinas && (
        <>
          <Clave />
          <Brujula azimut={azimut} mPorPx={cenital ? mPorPx : null} onFuentes={onFuentes} textoFuentes={t.textoFuentes3d} />
        </>
      )}
    </>
  );
}
