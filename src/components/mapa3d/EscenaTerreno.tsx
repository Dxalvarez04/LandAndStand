"use client";

/**
 * Escena del terreno (zona de estudio y alrededores) en metros. Ver coordenadas.ts.
 *
 *   luz      sol del oestesuroeste a 32° (como en las imágenes HiRISE) con sombras + luz del cielo
 *   cielo    cúpula «butterscotch» y niebla del mismo color (bruma de polvo)
 *   terreno  DEM 16 m + HiRISE + probabilidad + contornos (Terreno.tsx)
 *   sitios   hábitat, T1–T6, destinos añadidos, ruta del modelo y retícula de la selección
 *   cámara   vista 3D (oblicua) o cenital (norte arriba, sin girar). Ver lib/mapa3d/camara.ts
 *
 * Rendimiento (el lienzo se dibuja SOLO cuando algo cambia: frameloop «demand» en MapaMarte3D):
 *   - cada animación propia (vuelos, desplazamiento por el panel) pide fotogramas mientras dura;
 *   - el mapa de sombras se dibuja una vez (luz y terreno fijos);
 *   - el puntero y la colisión de la cámara cortan rayos contra la rejilla de alturas, no la malla;
 *   - lo que cambia en cada fotograma (selección y hábitat en pantalla, ruta, rumbo, escala, celda
 *     bajo el ratón) va al almacén `vivo`, fuera del estado de React.
 *
 * El panel tapa parte del lienzo sin cambiar su tamaño (redimensionar un lienzo WebGL con
 * posprocesado en cada fotograma de la animación es caro): se desplaza el centro óptico de la cámara
 * para que la escena quede centrada en la parte visible (hueco).
 */
import { CameraControls, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Matrix4, Vector3, type FogExp2, type Mesh, type PerspectiveCamera } from "three";
import { easeCubicInOut } from "d3-ease";
import type { IdDestino, Ruta } from "@/lib/contract";
import { CELDA_HABITAT, celdaDeIndice, type Celda } from "@/lib/mapa/geo";
import type { Contorno } from "@/lib/mapa/contornos";
import { RUTA_CONTEXTO } from "@/lib/mapa/contexto";
import { alturaEn, type Alturas } from "@/lib/mapa3d/alturas";
import type { Almacen, EstadoVivo, PuntoPx } from "@/lib/mapa3d/almacen";
import { aEscena, celdaAProyectadas, deEscena, LADO_M, proyectadasACelda, XC, YC } from "@/lib/mapa3d/coordenadas";
import { LADO_PROB, LADO_SUPER, pintarProbabilidad, pintarSuperposicion } from "@/lib/mapa3d/superposicion";
import {
  ajustarCamara,
  desplazarVista,
  ponerAnisotropia,
  ponerSRGB,
  quitarDesplazamiento,
  refrescar,
  sombrasFijas,
} from "@/lib/mapa3d/imperativo";
import {
  caminoCorto,
  configurarControles,
  encuadreActual,
  girarConIzquierdo,
  LIMITES,
  limitarA,
  mezclar,
  ponerColision,
  posicionDe,
  suave,
  type Controles,
  type Encuadre,
} from "@/lib/mapa3d/camara";
import { DURACION_PANEL } from "@/lib/panel";
import { useIdioma } from "@/lib/i18n";
import Cielo, { direccionSol, HORIZONTE, CENIT } from "./Cielo";
import Terreno, { zRefDe } from "./Terreno";
import Sitios3D, { Reticula3D, type SitioPropio } from "./Sitios3D";
import Ruta3D from "./Ruta3D";

export type { PuntoPx };
export type Vista = "3d" | "cenital";
export type Orden =
  | { tipo: "acercar" | "alejar" | "reset"; n: number }
  /** Volar hasta una celda (un destino elegido en el panel) */
  | { tipo: "enfocar"; n: number; celda: Celda };

interface Props {
  alturas: Alturas;
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
  /** La cámara ya se ha posado en la zona de estudio (después de la llegada) */
  onAsentado: () => void;
}

const SOL = direccionSol();
const DUR = { llegada: 1700, vista: 950, reset: 700, enfoque: 1100 };
/** Momento de la llegada (0–1) en que se considera posada la cámara: entra el panel */
const ASENTADO = 0.85;
/** Bruma: densidad a ras de suelo; desde arriba se atraviesa menos aire y se ve el terreno */
const NIEBLA = 0.00007;
/** Medio lado (m) de lo que se ve alrededor de un destino al enfocarlo */
const MEDIO_ENFOQUE = 650;

interface Vuelo {
  t0: number;
  dur: number;
  desde: Encuadre;
  hasta: Encuadre;
}

function EscenaTerreno(p: Props) {
  const { alturas, vivo } = p;
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controles = useRef<Controles>(null);
  const malla = useRef<Mesh>(null);
  const niebla = useRef<FogExp2>(null);
  // Durante la llegada no se ven las etiquetas: aparecen cuando la cámara se posa
  const [llegando, setLlegando] = useState(p.intro && !p.reducido);

  // Altura de referencia: el hábitat queda en y = 0
  const zRef = useMemo(() => zRefDe(alturas), [alturas]);

  // ---- Texturas ----
  const [contexto, detalle, normal] = useTexture([RUTA_CONTEXTO, "/data/aoi_color.jpg", "/data/3d/terreno_normal.jpg"]);
  const texturas = useMemo(() => {
    ponerAnisotropia(gl.capabilities.getMaxAnisotropy(), contexto, detalle, normal);
    ponerSRGB(contexto, detalle);
    return { contexto, detalle, normal };
  }, [contexto, detalle, normal, gl]);

  const lienzos = useMemo(() => {
    const prob = document.createElement("canvas");
    prob.width = prob.height = LADO_PROB;
    const sup = document.createElement("canvas");
    sup.width = sup.height = LADO_SUPER;
    const tProb = new CanvasTexture(prob);
    const tSup = new CanvasTexture(sup);
    ponerSRGB(tProb, tSup);
    ponerAnisotropia(gl.capabilities.getMaxAnisotropy(), tProb, tSup);
    const ctxProb = prob.getContext("2d")!;
    return { ctxProb, img: ctxProb.createImageData(LADO_PROB, LADO_PROB), ctxSup: sup.getContext("2d")!, tProb, tSup };
  }, [gl]);
  useEffect(() => () => {
    lienzos.tProb.dispose();
    lienzos.tSup.dispose();
  }, [lienzos]);

  useEffect(() => {
    pintarProbabilidad(lienzos.ctxProb, p.fotograma, lienzos.img);
    refrescar(lienzos.tProb);
    invalidate();
  }, [p.fotograma, lienzos, invalidate]);
  const { pctEntero } = useIdioma();
  useEffect(() => {
    pintarSuperposicion(lienzos.ctxSup, p.contornos, pctEntero);
    refrescar(lienzos.tSup);
    invalidate();
  }, [p.contornos, lienzos, invalidate, pctEntero]);

  // Lo demás que cambia la imagen sin pasar por la cámara: se pide un fotograma
  useEffect(() => {
    invalidate();
  }, [invalidate, p.ruta, p.celdaSel, p.destinoSel, p.propios, p.propioSel, p.puntoNuevo, p.eligiendo, p.compacto, llegando]);

  // ---- Sombras fijas ----
  useEffect(() => {
    sombrasFijas(gl, true);
    invalidate();
    return () => sombrasFijas(gl, false);
  }, [gl, invalidate]);

  // ---- Cámara ----
  useEffect(() => {
    ajustarCamara(camera, 3, 90_000);
    return () => quitarDesplazamiento(camera);
  }, [camera]);

  const alturaCentro = useMemo(() => alturaEn(alturas, XC, YC) - zRef, [alturas, zRef]);
  const [cajaX0, cajaY0, cajaX1, cajaY1] = alturas.caja;
  const limites = useMemo(() => {
    const a = aEscena(cajaX0, cajaY1);
    const b = aEscena(cajaX1, cajaY0);
    return { x0: a.x, z0: a.z, x1: b.x, z1: b.z };
  }, [cajaX0, cajaY0, cajaX1, cajaY1]);

  /**
   * Medidas de la parte visible (la que no tapa el panel). La tangente del medio campo vertical es la
   * del lienzo entero (el desplazamiento no cambia la escala): en la parte visible es proporcional.
   */
  const visible = () => {
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const H = Math.max(1, size.height);
    const w = Math.max(1, size.width - p.hueco.der);
    const h = Math.max(1, size.height - p.hueco.abajo);
    return { t, tv: (t * h) / H, aspecto: w / h };
  };

  /** Encuadre de cada vista: la zona de estudio entera, centrada en la parte visible. */
  const encuadreDe = (vista: Vista): Encuadre => {
    const objetivo = new Vector3(0, alturaCentro, 0);
    const { t, tv, aspecto } = visible();
    if (vista === "cenital") {
      const medio = (LADO_M / 2) * 1.1;
      return { theta: 0, phi: 0.002, r: Math.max(medio / tv, medio / (tv * aspecto)), objetivo };
    }
    // Desde el sursuroeste, mirando al nornoreste (como llega uno desde el globo). En vertical
    // (móvil) se mira más desde arriba y más cerca: la zona llena el ancho de la pantalla.
    if (aspecto < 1) return { theta: -0.32, phi: 0.78, r: Math.max(4200, 2350 / tv / aspecto), objetivo };
    return { theta: -0.32, phi: 0.98, r: Math.max(5200, (2900 / t) * 0.62), objetivo };
  };

  /** Encuadre cercano de una celda, sin cambiar el rumbo (en 3D) para no desorientar. */
  const encuadreCelda = (celda: Celda): Encuadre => {
    const { este, norte } = celdaAProyectadas(celda);
    const { x, z } = aEscena(este, norte);
    const objetivo = new Vector3(x, alturaEn(alturas, este, norte) - zRef, z);
    const { tv, aspecto } = visible();
    const r = Math.min(LIMITES.maxDistancia, MEDIO_ENFOQUE / (tv * Math.min(1, aspecto)));
    const c = controles.current;
    if (p.vista === "cenital" || !c) return { theta: 0, phi: 0.002, r, objetivo };
    return { theta: c.azimuthAngle, phi: Math.min(1.05, Math.max(0.55, c.polarAngle)), r, objetivo };
  };

  const vuelo = useRef<Vuelo | null>(null);
  const volar = (hasta: Encuadre, dur: number) => {
    const c = controles.current;
    if (!c) return;
    c.stop();
    if (p.reducido || dur <= 0) {
      const pos = posicionDe(hasta);
      void c.setLookAt(pos.x, pos.y, pos.z, hasta.objetivo.x, hasta.objetivo.y, hasta.objetivo.z, false);
      invalidate();
      return;
    }
    const desde = encuadreActual(c);
    vuelo.current = { t0: performance.now(), dur, desde, hasta: caminoCorto(desde, hasta) };
    invalidate();
  };

  // Gestos, límites y caja según la vista
  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    configurarControles(c, p.vista === "cenital");
    limitarA(c, limites.x0, limites.z0, limites.x1, limites.z1);
  }, [p.vista, limites]);

  // Con Mayús, Alt, Ctrl o ⌘ pulsada, el botón izquierdo gira (útil con trackpad)
  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const cenital = p.vista === "cenital";
    const tecla = (e: KeyboardEvent) => girarConIzquierdo(c, e.shiftKey || e.altKey || e.ctrlKey || e.metaKey, cenital);
    const soltar = () => girarConIzquierdo(c, false, cenital);
    window.addEventListener("keydown", tecla);
    window.addEventListener("keyup", tecla);
    window.addEventListener("blur", soltar);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("keyup", tecla);
      window.removeEventListener("blur", soltar);
      soltar();
    };
  }, [p.vista]);

  // La cámara no atraviesa el relieve
  useEffect(() => {
    const c = controles.current;
    if (!c || !malla.current) return;
    ponerColision(c, [malla.current]);
    return () => ponerColision(c, []);
  }, []);

  // Llegada: desde muy alto (viene del globo) hasta la vista 3D
  const asentado = useRef(false);
  const avisarAsentado = () => {
    if (asentado.current) return;
    asentado.current = true;
    p.onAsentado();
  };
  const primera = useRef(true);
  useEffect(() => {
    const c = controles.current;
    if (!c || !primera.current) return;
    primera.current = false;
    configurarControles(c, p.vista === "cenital");
    limitarA(c, limites.x0, limites.z0, limites.x1, limites.z1);
    const destino = encuadreDe(p.vista);
    if (p.intro && !p.reducido) {
      const alto: Encuadre = { theta: -0.1, phi: 0.62, r: 14_000, objetivo: destino.objetivo.clone() };
      c.maxDistance = alto.r;
      const pos = posicionDe(alto);
      void c.setLookAt(pos.x, pos.y, pos.z, alto.objetivo.x, alto.objetivo.y, alto.objetivo.z, false);
      volar(destino, DUR.llegada);
    } else {
      volar(destino, 0);
      avisarAsentado();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de vista: vuelo en arco hasta el encuadre de esa vista
  const ultimaVista = useRef(p.vista);
  useEffect(() => {
    if (ultimaVista.current === p.vista) return;
    ultimaVista.current = p.vista;
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
    volar(encuadreDe(p.vista), DUR.reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical]);

  // Órdenes: zoom con el muelle de los controles; «reset» (tecla 0) y «enfocar» con vuelo
  useEffect(() => {
    const c = controles.current;
    const o = p.orden;
    if (o.n === 0 || !c) return;
    if (o.tipo === "reset") return volar(encuadreDe(p.vista), DUR.reset);
    if (o.tipo === "enfocar") return volar(encuadreCelda(o.celda), DUR.enfoque);
    vuelo.current = null;
    const f = o.tipo === "acercar" ? 0.55 : 1 / 0.55;
    void c.dollyTo(Math.min(LIMITES.maxDistancia, Math.max(LIMITES.minDistancia, c.distance * f)), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.orden.n]);

  // Al soltar, el punto de giro se posa en el suelo (el arrastre lo mueve en horizontal): al girar o
  // acercarse junto a una ladera se gira alrededor del terreno, no de un punto enterrado o en el aire.
  // La cámara sube o baja con él (sigue a la misma distancia del suelo). La rueda no avisa al
  // soltar: se corrige al pararse la cámara, solo si se ha separado bastante.
  const tmpSoltar = useMemo(() => new Vector3(), []);
  const posarEnSuelo = useCallback(
    (umbral: number) => {
      const c = controles.current;
      if (!c || vuelo.current) return;
      c.getTarget(tmpSoltar, true);
      const { este, norte } = deEscena(tmpSoltar.x, tmpSoltar.z);
      const suelo = alturaEn(alturas, este, norte) - zRef;
      if (Math.abs(suelo - tmpSoltar.y) > umbral) void c.moveTo(tmpSoltar.x, suelo, tmpSoltar.z, true);
    },
    [alturas, zRef, tmpSoltar],
  );
  const alSoltar = useCallback(() => posarEnSuelo(2), [posarEnSuelo]);
  const alReposar = useCallback(() => posarEnSuelo(15), [posarEnSuelo]);
  const alEmpezar = useCallback(() => {
    vuelo.current = null;
  }, []);

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
  const objetivo = useMemo(() => new Vector3(), []);
  const posVuelo = useMemo(() => new Vector3(), []);
  const encVuelo = useMemo<Encuadre>(() => ({ theta: 0, phi: 0, r: 1, objetivo: new Vector3() }), []);
  const ultimoEmit = useRef({ ax: NaN, ay: NaN, hx: NaN, hy: NaN, az: NaN, esc: NaN });
  const vistaPrev = useRef<{ m: Matrix4; p: Matrix4; w: number; h: number } | null>(null);
  const rutaEmitida = useRef<Float32Array | null | undefined>(undefined);

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

  useFrame((estado) => {
    const c = controles.current;
    // Hasta que se prepara la llegada (efecto de montaje) no hay nada que seguir
    if (!c || primera.current) return;
    const cam = estado.camera as PerspectiveCamera;
    const { width: W, height: H } = estado.size;
    const ahora = performance.now();

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

    // Vuelo automático
    const v = vuelo.current;
    if (v) {
      const k = Math.min(1, (ahora - v.t0) / v.dur);
      mezclar(v.desde, v.hasta, suave(k), encVuelo);
      posicionDe(encVuelo, posVuelo);
      void c.setLookAt(posVuelo.x, posVuelo.y, posVuelo.z, encVuelo.objetivo.x, encVuelo.objetivo.y, encVuelo.objetivo.z, false);
      if (k >= 0.72 && llegando) setLlegando(false);
      if (k >= ASENTADO) avisarAsentado();
      if (k >= 1) {
        vuelo.current = null;
        c.maxDistance = LIMITES.maxDistancia;
      } else invalidate();
    } else {
      if (llegando) setLlegando(false);
      avisarAsentado();
    }
    if (niebla.current) niebla.current.density = NIEBLA * Math.min(1, Math.max(0.5, 1 - (cam.position.y - 5000) / 20000));

    // Avisos hacia fuera (solo lo que cambia, en un único aviso)
    c.getTarget(objetivo);
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
    const az = (c.azimuthAngle * 180) / Math.PI;
    if (Number.isNaN(e.az) || Math.abs(az - e.az) > 0.3) {
      e.az = az;
      cambios.azimut = az;
    }
    const esc = (2 * cam.position.distanceTo(objetivo) * Math.tan((camera.fov * Math.PI) / 360)) / H;
    if (Number.isNaN(e.esc) || Math.abs(esc / e.esc - 1) > 0.01) {
      e.esc = esc;
      cambios.mPorPx = esc;
    }
    for (const _ in cambios) {
      vivo.set(cambios);
      break;
    }
  });

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

  const sombra = p.movil ? 2048 : 4096;

  return (
    <>
      <color attach="background" args={[HORIZONTE]} />
      <fogExp2 ref={niebla} attach="fog" args={[HORIZONTE, NIEBLA]} />
      <Cielo sol={SOL} />
      <hemisphereLight args={[CENIT, "#4a3428", 0.95]} />
      <directionalLight
        position={SOL.clone().multiplyScalar(30000).toArray()}
        intensity={2.7}
        color="#fff3e6"
        castShadow
        shadow-mapSize={[sombra, sombra]}
        shadow-camera-left={-7500}
        shadow-camera-right={7500}
        shadow-camera-top={7500}
        shadow-camera-bottom={-7500}
        shadow-camera-near={1000}
        shadow-camera-far={70000}
        shadow-bias={-0.0003}
        shadow-normalBias={12}
      />

      <group>
        <Terreno
          alturas={alturas}
          zRef={zRef}
          paso={p.movil ? 2 : 1}
          mallaRef={malla}
          texturas={texturas}
          prob={lienzos.tProb}
          superposicion={lienzos.tSup}
          onPuntero={onPuntero}
          onFuera={onFuera}
          onToque={onToque}
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
          compacto={p.compacto}
          visibles={!llegando}
        />
      </group>

      <CameraControls ref={controles} makeDefault onControlStart={alEmpezar} onControlEnd={alSoltar} onRest={alReposar} />
    </>
  );
}

export default memo(EscenaTerreno);
