"use client";

/**
 * Escena del terreno (zona de estudio, su entorno y la región de Gale) en metros. Ver coordenadas.ts.
 *
 *   luz      sol del oestesuroeste a 32° (como en las imágenes HiRISE) con sombras + luz del cielo
 *   cielo    cúpula «butterscotch» y bruma de polvo por altura, del mismo color (atmosfera.ts)
 *   terreno  tres niveles encajados con datos reales (Terreno.tsx, relieve.ts)
 *   sitios   hábitat, T1–T6, destinos de la misión, ruta del modelo y retícula de la selección
 *   cámara   vista 3D (oblicua) o cenital (norte arriba, sin girar). Gestos: lib/mapa3d/control.ts
 *
 * Llegada y salida: la escena empieza (y termina) al pasar por la órbita baja sobre la zona, la
 * misma vista por la que pasa el globo, y con el zoom en marcha: la cámara no se para en el cambio
 * de escena (ver MapaMarte3D y lib/mapa3d/transito.ts). Desde ahí baja en arco hasta la vista 3D.
 *
 * Rendimiento (el lienzo se dibuja SOLO cuando algo cambia: frameloop «demand» en MapaMarte3D):
 *   - cada animación propia (vuelos, inercia, desplazamiento por el panel) pide fotogramas mientras dura;
 *   - el mapa de sombras se dibuja una vez (luz y terreno fijos);
 *   - el puntero y los gestos cortan rayos contra la rejilla de alturas, no contra la malla;
 *   - lo que cambia en cada fotograma (selección y hábitat en pantalla, ruta, rumbo, escala, celda
 *     bajo el ratón) va al almacén `vivo`, fuera del estado de React.
 *
 * El panel tapa parte del lienzo sin cambiar su tamaño (redimensionar un lienzo WebGL con
 * posprocesado en cada fotograma de la animación es caro): se desplaza el centro óptico de la cámara
 * para que la escena quede centrada en la parte visible (hueco).
 */
import { Html, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Matrix4, Vector3, type Mesh, type PerspectiveCamera, type Texture } from "three";
import { easeCubicInOut } from "d3-ease";
import type { IdDestino, Ruta } from "@/lib/contract";
import { CELDA_HABITAT, celdaDeIndice, type Celda } from "@/lib/mapa/geo";
import type { Contorno } from "@/lib/mapa/contornos";
import { RUTA_CONTEXTO } from "@/lib/mapa/contexto";
import { alturaEn } from "@/lib/mapa3d/alturas";
import type { Almacen, EstadoVivo, PuntoPx } from "@/lib/mapa3d/almacen";
import { CENIT, SOL } from "@/lib/mapa3d/atmosfera";
import { aEscena, celdaAProyectadas, deEscena, LADO_M, proyectadasACelda, XC, YC } from "@/lib/mapa3d/coordenadas";
import { LADO_PROB, pintarProbabilidad } from "@/lib/mapa3d/superposicion";
import { frenar, lanzar, pendiente, PENDIENTE_MAX, TRANSITO, type FotoTransito } from "@/lib/mapa3d/transito";
import { desplazarVista, planosDeCorte, ponerAnisotropia, ponerSRGB, quitarDesplazamiento, refrescar, sombrasFijas } from "@/lib/mapa3d/imperativo";
import { caminoCorto, copiarEncuadre, LIMITES, mezclar, ORBITA, suave, type Encuadre } from "@/lib/mapa3d/camara";
import { ControlMapa, type Suelo } from "@/lib/mapa3d/control";
import { cortarSuperficie } from "@/lib/mapa3d/rayo";
import { conPausa, despejarRotulos } from "@/lib/mapa3d/rotulos";
import { alturaCompuesta, cajaMalla, resolucionEn, type Relieve } from "@/lib/mapa3d/relieve";
import { DURACION_PANEL } from "@/lib/panel";
import { useIdioma } from "@/lib/i18n";
import Cielo from "./Cielo";
import Terreno, { zRefDe } from "./Terreno";
import Sitios3D, { Reticula3D, type SitioPropio } from "./Sitios3D";
import Ruta3D from "./Ruta3D";
import Lineas3D from "./Lineas3D";

export type { PuntoPx };
export type Vista = "3d" | "cenital";
export type Orden =
  | { tipo: "acercar" | "alejar" | "reset"; n: number }
  /** Volar hasta una celda (un destino elegido en el panel) */
  | { tipo: "enfocar"; n: number; celda: Celda };

/** Imagen de la zona de estudio: 1,3 m/px en escritorio; la del mapa 2D (2,7 m/px) en móvil */
export const rutaZona = (movil: boolean) => (movil ? "/data/aoi_color.jpg" : "/data/3d/zona_color.jpg");
export const RUTA_NORMAL = "/data/3d/terreno_normal.jpg";
export const RUTA_REGION = "/data/3d/gale_color.jpg";
export const rutaEntorno = (movil: boolean) => (movil ? "/data/3d/entorno_color_m.jpg" : "/data/3d/entorno_color.jpg");
/** Posición de la imagen de normales en `rutasTerreno` (la única que no es de color) */
const I_NORMAL = 2;
/**
 * Imágenes del terreno, en el orden en que se piden. La lista entera es la clave de la caché de
 * useTexture: la precarga (mientras se ve el globo) y la escena tienen que pedir exactamente la misma,
 * o al bajar se volverían a descodificar y a subir a la GPU.
 */
export function rutasTerreno(movil: boolean, entorno: boolean, region: boolean): string[] {
  return [RUTA_CONTEXTO, rutaZona(movil), RUTA_NORMAL, ...(entorno ? [rutaEntorno(movil)] : []), ...(region ? [RUTA_REGION] : [])];
}
/**
 * Carga las imágenes del terreno y las deja listas (sRGB, anisotropía) antes de subirlas a la GPU.
 * Lo usan la escena y la precarga.
 */
export function useTexturasTerreno(movil: boolean, entorno: boolean, region: boolean): Texture[] {
  const gl = useThree((s) => s.gl);
  return useTexture(rutasTerreno(movil, entorno, region), (ts) => {
    const todas = Array.isArray(ts) ? ts : [ts];
    ponerSRGB(...todas.filter((_, i) => i !== I_NORMAL));
    ponerAnisotropia(gl.capabilities.getMaxAnisotropy(), ...todas);
  });
}

interface Props {
  relieve: Relieve;
  /** Imagen de la región a más resolución (escritorio), si ya ha cargado */
  regionHd: Texture | null;
  fotograma: Float32Array | null;
  contornos: Contorno[];
  probDe: (id: IdDestino) => number | undefined;
  probCelda: (c: Celda) => number | undefined;
  celdaSel: Celda | null;
  destinoSel: IdDestino | null;
  ruta: Ruta | null;
  vista: Vista;
  orden: Orden;
  intro: boolean;
  movil: boolean;
  reducido: boolean;
  compacto: boolean;
  /** Destinos añadidos desde el panel y punto pendiente de nombre */
  propios: SitioPropio[];
  propioSel: string | null;
  puntoNuevo: Celda | null;
  /** Eligiendo el punto de un destino nuevo: se ocultan la ruta y la retícula */
  eligiendo: boolean;
  /** Parte del lienzo que tapa el panel (px a la derecha y abajo) */
  hueco: { der: number; abajo: number };
  /** Valores que cambian en cada fotograma (ver lib/mapa3d/almacen.ts) */
  vivo: Almacen<EstadoVivo>;
  onElegirCelda: (c: Celda | null) => void;
  onElegirDestino: (id: IdDestino) => void;
  onElegirPropio: (id: string) => void;
  /** Volver al globo: la cámara sube a la órbita baja y avisa (onSalida) */
  saliendo: boolean;
  /** La escena ya se ve (primeros fotogramas dibujados): se puede retirar la imagen fija del cambio */
  onLista: () => void;
  /** La cámara ya se ha posado en la zona de estudio (después de la llegada) */
  onAsentado: () => void;
  /** La cámara ha llegado a la órbita baja al salir; `ritmo`: el del zoom en ese momento (0 = parada) */
  onSalida: (ritmo: number) => void;
  /** Foto del cambio de escena: al llegar del globo, el terreno empieza donde va ella */
  foto: FotoTransito;
}

const DUR = { llegada: 1800, salida: 1500, vista: 950, reset: 700, enfoque: 1100 };
/** Momento de la llegada (0–1) en que se considera posada la cámara: entra el panel */
const ASENTADO = 0.86;
/** Medio lado (m) de lo que se ve alrededor de un destino al enfocarlo */
const MEDIO_ENFOQUE = 650;
/** Plano de corte lejano (m): más allá del alero que prolonga la región */
const FONDO = 900_000;
/** Hasta dónde se puede llevar el punto de mira fuera de la zona (m desde su centro), si hay entorno */
const MARGEN_PASEO = 2500;
/**
 * Detalle de las etiquetas según la distancia (m) al punto de mira, con holgura para que no parpadeen:
 * 2 = nombres y cifras · 1 = solo marcas y siglas · 0 = un único rótulo de la zona de estudio
 */
const ETIQUETAS = { medio: 13_000, lejos: 30_000, holgura: 0.12 };

interface Vuelo {
  t0: number;
  dur: number;
  desde: Encuadre;
  hasta: Encuadre;
  /**
   * Vuelo de llegada o de salida: no se interrumpe con gestos. La distancia lleva su propio avance
   * (pendiente `m` en el extremo de la órbita baja: ahí el zoom no se para, lo sigue la otra escena);
   * el giro, la inclinación y el punto de mira arrancan y frenan parados.
   */
  tipo?: "llegada" | "salida";
  m?: number;
  /** Hasta cuándo (reloj) la foto de la otra escena acompaña el zoom */
  fundido?: number;
}

function nivelEtiquetas(r: number, actual: 0 | 1 | 2): 0 | 1 | 2 {
  const h = ETIQUETAS.holgura;
  if (r > ETIQUETAS.lejos * (actual === 0 ? 1 - h : 1 + h)) return 0;
  if (r > ETIQUETAS.medio * (actual === 2 ? 1 + h : 1 - h)) return 1;
  return 2;
}

function EscenaTerreno(p: Props) {
  const { relieve, vivo } = p;
  const alturas = relieve.zona;
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  // Los gestos se escuchan donde R3F escucha sus eventos (el contenedor del lienzo, que también
  // contiene las etiquetas): se puede arrastrar o usar la rueda empezando sobre una etiqueta
  const zonaGestos = useThree((s) => (s.events.connected as HTMLElement | undefined) ?? s.gl.domElement);
  const malla = useRef<Mesh>(null);
  // Durante la llegada no se ven las etiquetas: aparecen cuando la cámara se posa
  const [llegando, setLlegando] = useState(p.intro && !p.reducido);
  const [detalle, setDetalle] = useState<0 | 1 | 2>(2);
  const { t, pctEntero } = useIdioma();

  // Altura de referencia: el hábitat queda en y = 0
  const zRef = useMemo(() => zRefDe(alturas), [alturas]);

  // ---- Texturas ----
  const hayEntorno = relieve.entorno !== null;
  const hayRegion = relieve.region !== null;
  const cargadas = useTexturasTerreno(p.movil, hayEntorno, hayRegion);
  const texturas = useMemo(() => {
    const [contexto, detalleZona, normal, ...resto] = cargadas;
    const entorno = hayEntorno ? resto.shift()! : null;
    const region = hayRegion ? (p.regionHd ?? resto.shift()!) : null;
    const color = [contexto, detalleZona, entorno, region].filter((x): x is Texture => x !== null);
    ponerAnisotropia(gl.capabilities.getMaxAnisotropy(), normal, ...color);
    ponerSRGB(...color);
    return { contexto, detalle: detalleZona, normal, entorno, region };
  }, [cargadas, hayEntorno, hayRegion, p.regionHd, gl]);

  const lienzos = useMemo(() => {
    const prob = document.createElement("canvas");
    prob.width = prob.height = LADO_PROB;
    const tProb = new CanvasTexture(prob);
    ponerSRGB(tProb);
    ponerAnisotropia(gl.capabilities.getMaxAnisotropy(), tProb);
    const ctxProb = prob.getContext("2d")!;
    return { ctxProb, img: ctxProb.createImageData(LADO_PROB, LADO_PROB), tProb };
  }, [gl]);
  useEffect(() => () => lienzos.tProb.dispose(), [lienzos]);

  useEffect(() => {
    pintarProbabilidad(lienzos.ctxProb, p.fotograma, lienzos.img);
    refrescar(lienzos.tProb);
    invalidate();
  }, [p.fotograma, lienzos, invalidate]);
  // Rótulos que no se pisan: se revisan al mover la cámara (unas veces por segundo) y al cambiar ellos
  const despejar = useMemo(() => conPausa(() => despejarRotulos(zonaGestos), 130), [zonaGestos]);
  useEffect(() => despejar.cancelar, [despejar]);

  // Lo demás que cambia la imagen sin pasar por la cámara: se pide un fotograma
  useEffect(() => {
    invalidate();
    despejar();
  }, [despejar, t, invalidate, p.contornos, p.ruta, p.celdaSel, p.destinoSel, p.propios, p.propioSel, p.puntoNuevo, p.eligiendo, p.compacto, llegando, detalle, texturas, p.saliendo]);

  // ---- Sombras fijas ----
  useEffect(() => {
    sombrasFijas(gl, true);
    invalidate();
    return () => sombrasFijas(gl, false);
  }, [gl, invalidate]);

  // ---- Suelo: la superficie compuesta, para los gestos y para que la cámara no la atraviese ----
  const suelo = useMemo<Suelo>(() => {
    const techo = Math.max(relieve.zona.zmax, relieve.entorno?.zmax ?? -Infinity, relieve.region?.zmax ?? -Infinity) - zRef + 10;
    const altura = (x: number, z: number) => alturaCompuesta(relieve, x + XC, YC - z) - zRef;
    const resolucion = (x: number, z: number) => resolucionEn(relieve, x + XC, YC - z);
    return { altura, cortar: (o, d, tMax) => cortarSuperficie(altura, resolucion, o, d, tMax, techo) };
  }, [relieve, zRef]);

  // El punto de mira se puede llevar por todo el entorno (sin él, por el terreno local)
  const caja = useMemo<[number, number, number, number]>(() => {
    const base = cajaMalla(relieve.entorno ?? relieve.zona);
    const m = relieve.entorno ? MARGEN_PASEO : 0;
    const no = aEscena(base[0] + m, base[3] - m);
    const se = aEscena(base[2] - m, base[1] + m);
    return [no.x, no.z, se.x, se.z];
  }, [relieve]);

  // ---- Cámara ----
  const control = useMemo(
    () => new ControlMapa(camera, zonaGestos, suelo, { ...LIMITES, caja }, invalidate),
    [camera, zonaGestos, suelo, caja, invalidate],
  );
  useEffect(() => control.conectar(), [control]);
  useEffect(() => () => quitarDesplazamiento(camera), [camera]);

  const alturaCentro = useMemo(() => alturaEn(alturas, XC, YC) - zRef, [alturas, zRef]);

  /**
   * Medidas de la parte visible (la que no tapa el panel). La tangente del medio campo vertical es la
   * del lienzo entero (el desplazamiento no cambia la escala): en la parte visible es proporcional.
   */
  const visible = () => {
    const tg = Math.tan((camera.fov * Math.PI) / 360);
    const H = Math.max(1, size.height);
    const w = Math.max(1, size.width - p.hueco.der);
    const h = Math.max(1, size.height - p.hueco.abajo);
    return { t: tg, tv: (tg * h) / H, aspecto: w / h };
  };

  /** Encuadre de cada vista: la zona de estudio entera, centrada en la parte visible. */
  const encuadreDe = (vista: Vista): Encuadre => {
    const objetivo = new Vector3(0, alturaCentro, 0);
    const { t: tg, tv, aspecto } = visible();
    if (vista === "cenital") {
      const medio = (LADO_M / 2) * 1.1;
      return { theta: 0, phi: LIMITES.minPolar, r: Math.max(medio / tv, medio / (tv * aspecto)), objetivo };
    }
    // Desde el sursuroeste, mirando al nornoreste (como llega uno desde el globo). En vertical
    // (móvil) se mira más desde arriba y más cerca: la zona llena el ancho de la pantalla.
    if (aspecto < 1) return { theta: -0.32, phi: 0.78, r: Math.max(4200, 2350 / tv / aspecto), objetivo };
    return { theta: -0.32, phi: 0.98, r: Math.max(5200, (2900 / tg) * 0.62), objetivo };
  };

  /** Encuadre cercano de una celda, sin cambiar el rumbo (en 3D) para no desorientar. */
  const encuadreCelda = (celda: Celda): Encuadre => {
    const { este, norte } = celdaAProyectadas(celda);
    const { x, z } = aEscena(este, norte);
    const objetivo = new Vector3(x, alturaEn(alturas, este, norte) - zRef, z);
    const { tv, aspecto } = visible();
    const r = Math.min(LIMITES.maxDistancia, MEDIO_ENFOQUE / (tv * Math.min(1, aspecto)));
    if (p.vista === "cenital") return { theta: 0, phi: LIMITES.minPolar, r, objetivo };
    return { theta: control.enc.theta, phi: Math.min(1.05, Math.max(0.55, control.enc.phi)), r, objetivo };
  };

  /** Órbita baja sobre la zona: donde se cambia de escena con el globo. */
  const orbita = (): Encuadre => ({ theta: ORBITA.theta, phi: ORBITA.phi, r: ORBITA.r, objetivo: new Vector3(0, alturaCentro, 0) });

  const vuelo = useRef<Vuelo | null>(null);
  const volar = (hasta: Encuadre, dur: number, tipo?: Vuelo["tipo"]) => {
    control.detener();
    if (p.reducido || dur <= 0) {
      vuelo.current = null;
      control.fijar(hasta);
      invalidate();
      return;
    }
    const desde = copiarEncuadre(control.enc);
    vuelo.current = { t0: performance.now(), dur, desde, hasta: caminoCorto(desde, hasta), tipo };
    invalidate();
  };

  // Gestos según la vista; un gesto cancela el vuelo en curso (salvo la llegada y la salida)
  useEffect(() => {
    control.configurar({
      cenital: p.vista === "cenital",
      alEmpezar: () => {
        if (!vuelo.current?.tipo) vuelo.current = null;
      },
    });
  }, [control, p.vista]);

  // Llegada: la escena se monta en la órbita baja (la vista con la que termina el globo) y, cuando ya
  // se ve, sigue bajando desde donde va la foto del globo (que ha seguido acercándose mientras tanto)
  // y a su ritmo, en arco hasta la vista 3D
  const llegar = () => {
    control.detener();
    const { z, v } = p.foto.estado();
    const desde = orbita();
    desde.r = ORBITA.r * Math.exp(-Math.max(0, z));
    control.fijar(desde);
    const hasta = caminoCorto(desde, encuadreDe(p.vista));
    const largo = Math.log(desde.r / hasta.r);
    // Si el ritmo de entrada pide más pendiente de la que admite el avance, el vuelo se acorta
    const dur = v > 0 && largo > 0 ? Math.min(DUR.llegada, (1000 * PENDIENTE_MAX * largo) / v) : DUR.llegada;
    const ahora = performance.now();
    vuelo.current = { t0: ahora, dur, desde, hasta, tipo: "llegada", m: pendiente(v, dur, largo), fundido: ahora + TRANSITO.fundido };
    invalidate();
  };
  const asentado = useRef(false);
  const avisarAsentado = () => {
    if (asentado.current) return;
    asentado.current = true;
    p.onAsentado();
  };
  const etapa = useRef<"montaje" | "espera" | "marcha">("montaje");
  const fotogramas = useRef(0);
  const cerca = useRef(0);
  useEffect(() => {
    if (etapa.current !== "montaje") return;
    // Los planos de corte del terreno, antes del primer fotograma: las etiquetas (<Html>) calculan
    // con ellos su orden y con los del globo (400 de fondo) quedarían detrás del lienzo
    cerca.current = 300;
    planosDeCorte(camera, cerca.current, FONDO);
    const conLlegada = p.intro && !p.reducido;
    control.configurar({ bloqueado: conLlegada });
    control.fijar(conLlegada ? orbita() : encuadreDe(p.vista));
    etapa.current = "espera";
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salida: sube a la órbita baja y avisa
  const { saliendo, onSalida } = p;
  useEffect(() => {
    if (!saliendo) return;
    control.configurar({ bloqueado: true });
    if (p.reducido) return onSalida(0);
    // Sube a la órbita baja y llega con el zoom en marcha: el globo lo continúa
    control.detener();
    const desde = copiarEncuadre(control.enc);
    const hasta = caminoCorto(desde, orbita());
    vuelo.current = { t0: performance.now(), dur: DUR.salida, desde, hasta, tipo: "salida", m: pendiente(TRANSITO.ritmo, DUR.salida, Math.log(hasta.r / desde.r)) };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saliendo]);

  // Cambio de vista: vuelo en arco hasta el encuadre de esa vista
  const ultimaVista = useRef(p.vista);
  useEffect(() => {
    if (ultimaVista.current === p.vista) return;
    ultimaVista.current = p.vista;
    if (vuelo.current?.tipo) return;
    volar(encuadreDe(p.vista), DUR.vista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.vista]);

  // Al girar la pantalla (vertical ↔ horizontal) el encuadre anterior queda lejos o cortado: se
  // vuelve a encuadrar. En móvil no hay tecla 0 para hacerlo a mano.
  const vertical = size.width < size.height;
  const ultimaOrientacion = useRef(vertical);
  useEffect(() => {
    if (ultimaOrientacion.current === vertical) return;
    ultimaOrientacion.current = vertical;
    if (vuelo.current?.tipo) return;
    volar(encuadreDe(p.vista), DUR.reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical]);

  // Órdenes: zoom suavizado hacia el centro; «reset» (tecla 0) y «enfocar» con vuelo
  useEffect(() => {
    const o = p.orden;
    if (o.n === 0 || vuelo.current?.tipo || etapa.current !== "marcha") return;
    if (o.tipo === "reset") return volar(encuadreDe(p.vista), DUR.reset);
    if (o.tipo === "enfocar") return volar(encuadreCelda(o.celda), DUR.enfoque);
    vuelo.current = null;
    control.zoomPor(o.tipo === "acercar" ? 0.55 : 1 / 0.55);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.orden.n]);

  // ---- Desplazamiento de la vista por el panel ----
  const desp = useRef({ x: 0, y: 0 });
  const animDesp = useRef<{ t0: number; desde: { x: number; y: number }; hasta: { x: number; y: number } } | null>(null);
  const aplicado = useRef({ x: NaN, y: NaN, w: 0, h: 0 });
  useEffect(() => {
    const hasta = { x: p.hueco.der / 2, y: p.hueco.abajo / 2 };
    if (p.reducido) {
      desp.current = hasta;
      animDesp.current = null;
    } else animDesp.current = { t0: performance.now(), desde: { ...desp.current }, hasta };
    invalidate();
  }, [p.hueco.der, p.hueco.abajo, p.reducido, invalidate]);

  // ---- Seguimiento: selección, hábitat, ruta, rumbo y escala ----
  const tmp = useMemo(() => new Vector3(), []);
  const encVuelo = useMemo<Encuadre>(() => ({ theta: 0, phi: 0, r: 1, objetivo: new Vector3() }), []);
  const ultimoEmit = useRef({ ax: NaN, ay: NaN, hx: NaN, hy: NaN, az: NaN, esc: NaN });
  const vistaPrev = useRef<{ m: Matrix4; p: Matrix4; w: number; h: number } | null>(null);
  const rutaEmitida = useRef<Float32Array | null | undefined>(undefined);
  const detalleRef = useRef<0 | 1 | 2>(2);

  const enMundo = (celda: Celda) => {
    const { este, norte } = celdaAProyectadas(celda);
    const { x, z } = aEscena(este, norte);
    return { x, z, y: alturaEn(alturas, este, norte) - zRef };
  };
  const selMundo = useMemo(() => (p.celdaSel ? enMundo(p.celdaSel) : null), [p.celdaSel, alturas, zRef]); // eslint-disable-line react-hooks/exhaustive-deps
  const habMundo = useMemo(() => enMundo(CELDA_HABITAT), [alturas, zRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camino hasta la selección (para que la ficha no lo tape): ruta del modelo o, mientras llega, recta
  const rutaMundo = useMemo(() => {
    if (!selMundo || !p.celdaSel || p.eligiendo) return null;
    const puntos: { x: number; y: number; z: number }[] = [];
    if (p.ruta && p.ruta.ida.length > 1) {
      for (const i of p.ruta.ida) puntos.push(enMundo(celdaDeIndice(i)));
      for (const i of p.ruta.vuelta) puntos.push(enMundo(celdaDeIndice(i)));
    } else {
      for (let k = 0; k <= 16; k++) {
        const f = k / 16;
        const celda = {
          fila: Math.round(CELDA_HABITAT.fila + (p.celdaSel.fila - CELDA_HABITAT.fila) * f),
          columna: Math.round(CELDA_HABITAT.columna + (p.celdaSel.columna - CELDA_HABITAT.columna) * f),
        };
        puntos.push(enMundo(celda));
      }
    }
    const a = new Float32Array(puntos.length * 3);
    puntos.forEach((q, i) => a.set([q.x, q.y, q.z], i * 3));
    return a;
  }, [selMundo, p.celdaSel, p.ruta, p.eligiendo]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((estado, delta) => {
    // Hasta que se coloca la cámara (efecto de montaje) no hay nada que seguir
    if (etapa.current === "montaje") return;
    const cam = estado.camera as PerspectiveCamera;
    const { width: W, height: H } = estado.size;
    const ahora = performance.now();

    // Primeros fotogramas: cuando la escena ya se ve, empieza la llegada
    if (etapa.current === "espera") {
      if (++fotogramas.current < 3) invalidate();
      else {
        etapa.current = "marcha";
        p.onLista();
        if (control.bloqueado && !p.saliendo) llegar();
        else avisarAsentado();
      }
    }

    // Desplazamiento del centro óptico (animado con el panel)
    const ad = animDesp.current;
    if (ad) {
      const k = Math.min(1, (ahora - ad.t0) / DURACION_PANEL);
      const e = easeCubicInOut(k);
      desp.current = { x: ad.desde.x + (ad.hasta.x - ad.desde.x) * e, y: ad.desde.y + (ad.hasta.y - ad.desde.y) * e };
      if (k >= 1) animDesp.current = null;
      else invalidate();
    }
    const d = desp.current;
    const ap = aplicado.current;
    if (d.x !== ap.x || d.y !== ap.y || W !== ap.w || H !== ap.h) {
      desplazarVista(cam, W, H, d.x, d.y);
      Object.assign(ap, { x: d.x, y: d.y, w: W, h: H });
    }

    // Vuelo automático o gestos
    const v = vuelo.current;
    if (v) {
      const k = Math.min(1, (ahora - v.t0) / v.dur);
      const ks = suave(k);
      mezclar(v.desde, v.hasta, ks, encVuelo, v.tipo === "llegada" ? frenar(k, v.m ?? 0) : v.tipo === "salida" ? lanzar(k, v.m ?? 0) : ks);
      control.fijar(encVuelo);
      if (v.tipo === "llegada") {
        // Durante el fundido, la foto del globo se acerca a la par que el terreno
        if (v.fundido && ahora < v.fundido) p.foto.seguir(Math.log(ORBITA.r / encVuelo.r));
        if (k >= 0.72 && llegando) setLlegando(false);
        if (k >= ASENTADO) avisarAsentado();
      }
      if (k >= 1) {
        vuelo.current = null;
        if (v.tipo === "llegada") control.configurar({ bloqueado: false });
        if (v.tipo === "salida") p.onSalida(((v.m ?? 0) * Math.log(v.hasta.r / v.desde.r) * 1000) / v.dur);
      } else invalidate();
    } else {
      if (control.actualizar(delta)) invalidate();
      if (etapa.current === "marcha" && !p.saliendo) {
        if (llegando) setLlegando(false);
        avisarAsentado();
      }
    }

    // Planos de corte según la altura sobre el suelo: caben desde un poste a 20 m hasta el horizonte
    const sobre = Math.max(1, cam.position.y - suelo.altura(cam.position.x, cam.position.z));
    const plano = Math.min(4000, Math.max(1.5, sobre * 0.1));
    if (Math.abs(plano / cerca.current - 1) > 0.08) {
      cerca.current = plano;
      planosDeCorte(cam, plano, FONDO);
    }

    // Detalle de las etiquetas según lo lejos que se mira
    const nivel = nivelEtiquetas(control.enc.r, detalleRef.current);
    if (nivel !== detalleRef.current) {
      detalleRef.current = nivel;
      setDetalle(nivel);
    }

    // Avisos hacia fuera (solo lo que cambia, en un único aviso)
    const e = ultimoEmit.current;
    const cambios: Partial<EstadoVivo> = {};
    const proyectar = (x: number, y: number, z: number): PuntoPx | null => {
      tmp.set(x, y, z).project(cam);
      if (tmp.z > 1 || tmp.z < -1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) return null;
      return { x: ((tmp.x + 1) / 2) * W, y: ((1 - tmp.y) / 2) * H };
    };
    const ps = selMundo ? proyectar(selMundo.x, selMundo.y, selMundo.z) : null;
    if (!ps ? !Number.isNaN(e.ax) : Math.abs(ps.x - e.ax) > 0.5 || Math.abs(ps.y - e.ay) > 0.5 || Number.isNaN(e.ax)) {
      e.ax = ps ? ps.x : NaN;
      e.ay = ps ? ps.y : NaN;
      cambios.ancla = ps;
    }
    const ph = proyectar(habMundo.x, habMundo.y, habMundo.z);
    if (!ph ? !Number.isNaN(e.hx) : Math.abs(ph.x - e.hx) > 2 || Math.abs(ph.y - e.hy) > 2 || Number.isNaN(e.hx)) {
      e.hx = ph ? ph.x : NaN;
      e.hy = ph ? ph.y : NaN;
      cambios.habPx = ph;
    }
    // ¿Se ha movido la cámara (o cambiado el lienzo) desde el último fotograma?
    const vp = (vistaPrev.current ??= { m: new Matrix4(), p: new Matrix4(), w: 0, h: 0 });
    const camCambio = !vp.m.equals(cam.matrixWorld) || !vp.p.equals(cam.projectionMatrix) || vp.w !== W || vp.h !== H;
    if (camCambio) {
      vp.m.copy(cam.matrixWorld);
      vp.p.copy(cam.projectionMatrix);
      vp.w = W;
      vp.h = H;
      despejar();
    }
    if (camCambio || rutaEmitida.current !== rutaMundo) {
      rutaEmitida.current = rutaMundo;
      const rutaPx: PuntoPx[] = [];
      if (rutaMundo)
        for (let i = 0; i < rutaMundo.length; i += 3) {
          const q = proyectar(rutaMundo[i], rutaMundo[i + 1], rutaMundo[i + 2]);
          if (q) rutaPx.push(q);
        }
      if (rutaPx.length || vivo.get().rutaPx.length) cambios.rutaPx = rutaPx;
    }
    const az = (control.enc.theta * 180) / Math.PI;
    if (Number.isNaN(e.az) || Math.abs(az - e.az) > 0.3) {
      e.az = az;
      cambios.azimut = az;
    }
    const esc = (2 * control.enc.r * Math.tan((camera.fov * Math.PI) / 360)) / H;
    if (Number.isNaN(e.esc) || Math.abs(esc / e.esc - 1) > 0.01) {
      e.esc = esc;
      cambios.mPorPx = esc;
    }
    for (const _ in cambios) {
      vivo.set(cambios);
      break;
    }
    // Prioridad −1: la cámara se coloca antes de que las etiquetas (<Html>) y el cielo calculen su
    // posición en este mismo fotograma; si no, irían un fotograma por detrás del terreno
  }, -1);

  // ---- Interacción con el terreno ----
  const { onElegirCelda } = p;
  const celdaDe = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const { este, norte } = deEscena(e.point.x, e.point.z);
    return proyectadasACelda(este, norte);
  };
  const onPuntero = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const anterior = vivo.get().hover;
      if (e.pointerType !== "mouse" || e.buttons) {
        if (anterior) vivo.set({ hover: null });
        return;
      }
      const c = celdaDe(e);
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;
      if (!c) {
        if (anterior) vivo.set({ hover: null });
      } else if (!anterior || anterior.x !== x || anterior.y !== y) vivo.set({ hover: { celda: c, x, y } });
    },
    [vivo],
  );
  const onFuera = useCallback(() => {
    if (vivo.get().hover) vivo.set({ hover: null });
  }, [vivo]);
  const onToque = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 6) return; // era un arrastre
      e.stopPropagation();
      onElegirCelda(celdaDe(e));
    },
    [onElegirCelda],
  );

  const textosContornos = useMemo(() => ({ 0.5: pctEntero(50), 0.9: pctEntero(90) }), [pctEntero]);
  const sombra = p.movil ? 2048 : 4096;
  const etiquetas = !llegando && !p.saliendo;

  return (
    <>
      <Cielo />
      <hemisphereLight args={[CENIT, "#5b4334", 1.05]} />
      <directionalLight
        position={SOL.clone().multiplyScalar(30000).toArray()}
        intensity={2.75}
        color="#fff3e6"
        castShadow
        shadow-mapSize={[sombra, sombra]}
        shadow-camera-left={-6500}
        shadow-camera-right={6500}
        shadow-camera-top={6500}
        shadow-camera-bottom={-6500}
        shadow-camera-near={1000}
        shadow-camera-far={70000}
        shadow-bias={-0.0003}
        shadow-normalBias={12}
      />

      <group>
        <Terreno
          relieve={relieve}
          zRef={zRef}
          paso={p.movil ? 2 : 1}
          mallaRef={malla}
          texturas={texturas}
          prob={lienzos.tProb}
          onPuntero={onPuntero}
          onFuera={onFuera}
          onToque={onToque}
        />
        <Lineas3D
          contornos={p.contornos}
          alturas={alturas}
          zRef={zRef}
          rotulos={etiquetas && detalle === 2}
          soloBorde={detalle === 0}
          textos={textosContornos}
        />
        {!p.eligiendo && <Ruta3D ruta={p.celdaSel ? p.ruta : null} alturas={alturas} zRef={zRef} />}
        {selMundo && !p.eligiendo && <Reticula3D x={selMundo.x} y={selMundo.y} z={selMundo.z} />}
        <Sitios3D
          alturas={alturas}
          zRef={zRef}
          probDe={p.probDe}
          probCelda={p.probCelda}
          seleccionado={p.destinoSel}
          onElegir={p.onElegirDestino}
          propios={p.propios}
          propioSel={p.propioSel}
          onElegirPropio={p.onElegirPropio}
          puntoNuevo={p.puntoNuevo}
          compacto={p.compacto || detalle === 1}
          visibles={etiquetas && detalle > 0}
        />
        {/* De lejos, un único rótulo: dónde está la zona de estudio */}
        <Html position={[0, alturaCentro + 200, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
          <div
            className="flex flex-col items-center whitespace-nowrap text-[13.5px] font-medium text-white [text-shadow:0_0_3px_rgba(6,10,23,1),0_0_8px_rgba(6,10,23,0.95)]"
            style={{ opacity: etiquetas && detalle === 0 ? 1 : 0, transition: "opacity 400ms ease-out" }}
          >
            {t.zonaEstudio}
            <span className="mt-1 block h-2 w-2 rounded-full border-2 border-[#060a17] bg-white" />
          </div>
        </Html>
      </group>
    </>
  );
}

export default memo(EscenaTerreno);
