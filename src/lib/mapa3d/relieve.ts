/**
 * Relieve del mapa 3D en tres niveles encajados, cada uno con sus datos reales:
 *
 *   zona     terreno local (7,5 × 9,5 km) a 16 m      DEM MSL Gale 1 m (USGS)
 *   entorno  todo el mosaico MSL (33 × 57 km) a 64 m   el mismo DEM, reducido
 *   región   Gale entero (4° × 4°, 237 km) a 463 m     DEM HRSC-MOLA 200 m (USGS)
 *
 * Los tres son muestreos de UNA superficie continua (`alturaCompuesta`): dentro de cada nivel manda
 * su DEM y, en una franja junto a su borde, se funde con el nivel de fuera. Así las mallas empalman
 * sin escalones y no hace falta un plano liso donde «se acaba» el terreno.
 *
 * Cada malla es una rejilla con un hueco donde va el nivel más fino. Las líneas de la rejilla más
 * próximas al hueco se llevan a su borde, y cada borde lleva un faldón vertical que tapa las
 * rendijas de un píxel entre mallas de distinta resolución.
 */
import { R_MARTE } from "@/lib/constants";
import { alturaEn, type Alturas, type AlturasGale } from "./alturas";
import { aEscena } from "./coordenadas";

/** [oeste, sur, este, norte] en proyectadas (m) */
export type Caja = [number, number, number, number];

/** La región de Gale (rejilla en grados) como rejilla en proyectadas: la proyección es equirectangular. */
export function regionComoAlturas(g: AlturasGale): Alturas {
  const rad = Math.PI / 180;
  const caja: Caja = [R_MARTE * g.lon[0] * rad, R_MARTE * g.lat[0] * rad, R_MARTE * g.lon[1] * rad, R_MARTE * g.lat[1] * rad];
  const datos = new Float32Array(g.datos.length);
  for (let i = 0; i < datos.length; i++) datos[i] = g.datos[i];
  return { ancho: g.ancho, alto: g.alto, mPx: (caja[2] - caja[0]) / g.ancho, caja, zmin: g.min, zmax: g.max, datos };
}

export interface Relieve {
  zona: Alturas;
  entorno: Alturas | null;
  region: Alturas | null;
}

/** Franja (m) en la que cada nivel se funde con el de fuera, medida desde su borde hacia dentro */
const FRANJA = { zona: 260, entorno: 700 };

/** Caja de la malla de un nivel: sus vértices extremos están en los centros de los píxeles del borde. */
export function cajaMalla(a: Alturas): Caja {
  const m = a.mPx / 2;
  return [a.caja[0] + m, a.caja[1] + m, a.caja[2] - m, a.caja[3] - m];
}

const suave = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 0 en el borde de la malla del nivel (y fuera), 1 a `franja` metros hacia dentro. */
function peso(a: Alturas, este: number, norte: number, franja: number): number {
  const m = a.mPx / 2;
  const d = Math.min(este - a.caja[0] - m, a.caja[2] - m - este, norte - a.caja[1] - m, a.caja[3] - m - norte);
  return suave(d / franja);
}

/** Altura (m) del entorno y la región, sin la zona. */
function alturaDeFuera(r: Relieve, este: number, norte: number): number {
  const { entorno, region } = r;
  if (!entorno) return region ? alturaEn(region, este, norte) : alturaEn(r.zona, este, norte);
  if (!region) return alturaEn(entorno, este, norte);
  const w = peso(entorno, este, norte, FRANJA.entorno);
  if (w <= 0) return alturaEn(region, este, norte);
  const h = alturaEn(entorno, este, norte);
  return w >= 1 ? h : alturaEn(region, este, norte) * (1 - w) + h * w;
}

/**
 * Altura (m) de la superficie compuesta en un punto en proyectadas. Fuera de todos los niveles
 * devuelve la del borde del más amplio.
 */
export function alturaCompuesta(r: Relieve, este: number, norte: number): number {
  if (!r.entorno && !r.region) return alturaEn(r.zona, este, norte);
  const w = peso(r.zona, este, norte, FRANJA.zona);
  if (w <= 0) return alturaDeFuera(r, este, norte);
  const h = alturaEn(r.zona, este, norte);
  return w >= 1 ? h : alturaDeFuera(r, este, norte) * (1 - w) + h * w;
}

/** Resolución (m) del nivel que manda en un punto: paso razonable para avanzar un rayo por ahí. */
export function resolucionEn(r: Relieve, este: number, norte: number): number {
  const dentro = (a: Alturas) => este >= a.caja[0] && este <= a.caja[2] && norte >= a.caja[1] && norte <= a.caja[3];
  if (dentro(r.zona)) return r.zona.mPx;
  if (r.entorno && dentro(r.entorno)) return r.entorno.mPx;
  return r.region ? r.region.mPx : r.zona.mPx;
}

// ---------------------------------------------------------------------------------------------
// Mallas
// ---------------------------------------------------------------------------------------------

export interface Malla {
  posiciones: Float32Array;
  normales: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** Vértices de la superficie (los demás son de los faldones) */
  nSuperficie: number;
}

export interface OpcionesMalla {
  /** Extensión de la malla en proyectadas */
  caja: Caja;
  /** Separación deseada entre vértices (m); se ajusta para repartirlos por igual */
  paso: number;
  /** Altura (m) en proyectadas */
  altura: (este: number, norte: number) => number;
  /** Altura de referencia: se resta (el hábitat queda en y = 0) */
  zRef: number;
  /** Caja de la imagen: de ella salen las uv (u = este, v = norte, de 0 a 1) */
  cajaUv: Caja;
  /** Parte que ocupa el nivel más fino: no se dibuja */
  hueco?: Caja | null;
  /** Caída (m) del faldón vertical de los bordes */
  faldon?: number;
  /** Si es mayor que 0, el borde de fuera se prolonga en horizontal esta distancia (m) en vez de caer */
  alero?: number;
}

/** n + 1 líneas repartidas entre a y b, con las más próximas a los cortes llevadas a ellos. */
function lineas(a: number, b: number, paso: number, cortes: number[]): Float64Array {
  const n = Math.max(1, Math.round((b - a) / paso));
  const v = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) v[i] = a + ((b - a) * i) / n;
  for (const c of cortes) {
    if (c <= Math.min(a, b) || c >= Math.max(a, b)) continue;
    let mejor = 1;
    for (let i = 1; i < n; i++) if (Math.abs(v[i] - c) < Math.abs(v[mejor] - c)) mejor = i;
    v[mejor] = c;
  }
  return v;
}

/**
 * Malla de un nivel. Todas las caras de la superficie miran hacia arriba (+y); las normales salen de
 * las alturas vecinas de la rejilla (también dentro del hueco), así el sombreado no cambia en los
 * bordes y los faldones heredan la normal de su borde.
 */
export function construirMalla(o: OpcionesMalla): Malla {
  const [x0, y0, x1, y1] = o.caja;
  const hueco = o.hueco ?? null;
  const xs = lineas(x0, x1, o.paso, hueco ? [hueco[0], hueco[2]] : []);
  // De norte a sur: la fila 0 es el norte, como en los datos
  const ns = lineas(y1, y0, -o.paso, hueco ? [hueco[1], hueco[3]] : []);
  const W = xs.length;
  const H = ns.length;
  const nSuperficie = W * H;

  // Celdas del hueco: [i0, i1) × [j0, j1)
  let i0 = 0, i1 = 0, j0 = 0, j1 = 0; // prettier-ignore
  if (hueco) {
    i0 = xs.indexOf(hueco[0]);
    i1 = xs.indexOf(hueco[2]);
    j0 = ns.indexOf(hueco[3]);
    j1 = ns.indexOf(hueco[1]);
    if (i0 < 0 || i1 <= i0 || j0 < 0 || j1 <= j0) throw new Error("relieve: el hueco no cabe en la malla");
  }
  const enHueco = (i: number, j: number) => hueco !== null && i >= i0 && i < i1 && j >= j0 && j < j1;

  // Contornos (en el sentido que deja el faldón mirando hacia fuera de la superficie)
  const fuera: number[] = [];
  for (let i = 0; i < W; i++) fuera.push(i);
  for (let j = 1; j < H; j++) fuera.push(j * W + W - 1);
  for (let i = W - 2; i >= 0; i--) fuera.push((H - 1) * W + i);
  for (let j = H - 2; j >= 1; j--) fuera.push(j * W);
  const dentro: number[] = [];
  if (hueco) {
    for (let j = j0; j <= j1; j++) dentro.push(j * W + i0);
    for (let i = i0 + 1; i <= i1; i++) dentro.push(j1 * W + i);
    for (let j = j1 - 1; j >= j0; j--) dentro.push(j * W + i1);
    for (let i = i1 - 1; i > i0; i--) dentro.push(j0 * W + i);
  }

  const faldon = o.faldon ?? 0;
  const alero = o.alero ?? 0;
  const conFuera = faldon > 0 || alero > 0;
  const nFaldon = (conFuera ? fuera.length : 0) + (faldon > 0 ? dentro.length : 0);
  const nV = nSuperficie + nFaldon;
  const posiciones = new Float32Array(nV * 3);
  const normales = new Float32Array(nV * 3);
  const uvs = new Float32Array(nV * 2);
  const anchoUv = o.cajaUv[2] - o.cajaUv[0];
  const altoUv = o.cajaUv[3] - o.cajaUv[1];

  // Superficie
  const h = new Float32Array(nSuperficie);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const y = o.altura(xs[i], ns[j]) - o.zRef;
      h[k] = y;
      const { x, z } = aEscena(xs[i], ns[j]);
      posiciones[k * 3] = x;
      posiciones[k * 3 + 1] = y;
      posiciones[k * 3 + 2] = z;
      uvs[k * 2] = (xs[i] - o.cajaUv[0]) / anchoUv;
      uvs[k * 2 + 1] = (ns[j] - o.cajaUv[1]) / altoUv;
    }
  }
  // Normales por diferencias centrales (en los bordes, hacia un lado). Escena: x = este, z = sur.
  for (let j = 0; j < H; j++) {
    const ja = Math.max(0, j - 1);
    const jb = Math.min(H - 1, j + 1);
    for (let i = 0; i < W; i++) {
      const ia = Math.max(0, i - 1);
      const ib = Math.min(W - 1, i + 1);
      const k = j * W + i;
      const dEste = (h[j * W + ib] - h[j * W + ia]) / (xs[ib] - xs[ia]);
      const dNorte = (h[ja * W + i] - h[jb * W + i]) / (ns[ja] - ns[jb]);
      const l = Math.hypot(dEste, 1, dNorte);
      normales[k * 3] = -dEste / l;
      normales[k * 3 + 1] = 1 / l;
      normales[k * 3 + 2] = dNorte / l;
    }
  }

  let nCeldas = (W - 1) * (H - 1);
  if (hueco) nCeldas -= (i1 - i0) * (j1 - j0);
  const indices = new Uint32Array((nCeldas * 2 + nFaldon * 2) * 3);
  let t = 0;
  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      if (enHueco(i, j)) continue;
      const p = j * W + i;
      const r = p + W;
      indices[t++] = p;
      indices[t++] = r;
      indices[t++] = p + 1;
      indices[t++] = p + 1;
      indices[t++] = r;
      indices[t++] = r + 1;
    }
  }

  // Faldones: cada vértice del contorno tiene su copia desplazada (hacia abajo o hacia fuera)
  let base = nSuperficie;
  const coser = (contorno: number[], haciaFuera: number) => {
    const n = contorno.length;
    for (let b = 0; b < n; b++) {
      const k = contorno[b];
      const c = base + b;
      posiciones[c * 3] = posiciones[k * 3];
      posiciones[c * 3 + 1] = posiciones[k * 3 + 1];
      posiciones[c * 3 + 2] = posiciones[k * 3 + 2];
      if (haciaFuera > 0) {
        const i = k % W;
        const j = (k - i) / W;
        const dx = i === 0 ? -1 : i === W - 1 ? 1 : 0;
        const dz = j === 0 ? -1 : j === H - 1 ? 1 : 0; // z = sur
        const l = Math.hypot(dx, dz) || 1;
        posiciones[c * 3] += (dx / l) * haciaFuera;
        posiciones[c * 3 + 2] += (dz / l) * haciaFuera;
        normales[c * 3 + 1] = 1;
      } else {
        posiciones[c * 3 + 1] -= faldon;
        normales[c * 3] = normales[k * 3];
        normales[c * 3 + 1] = normales[k * 3 + 1];
        normales[c * 3 + 2] = normales[k * 3 + 2];
      }
      uvs[c * 2] = uvs[k * 2];
      uvs[c * 2 + 1] = uvs[k * 2 + 1];
      const k2 = contorno[(b + 1) % n];
      const c2 = base + ((b + 1) % n);
      indices[t++] = k;
      indices[t++] = k2;
      indices[t++] = c2;
      indices[t++] = k;
      indices[t++] = c2;
      indices[t++] = c;
    }
    base += n;
  };
  if (conFuera) coser(fuera, alero);
  if (faldon > 0 && dentro.length) coser(dentro, 0);

  return { posiciones, normales, uvs, indices, nSuperficie };
}
