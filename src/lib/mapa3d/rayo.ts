/**
 * Corte de un rayo con el relieve, directamente sobre la rejilla de alturas (sin recorrer los
 * ~560 000 triángulos de la malla). Lo usan el puntero (qué celda hay bajo el ratón o el dedo) y
 * la cámara (no atravesar el terreno). Coordenadas de escena: ver coordenadas.ts.
 *
 * Avanza a pasos de medio píxel del DEM en horizontal y afina el corte por bisección. Como la cara
 * visible de la malla, solo cuenta la ENTRADA desde arriba: un rayo que empieza bajo el suelo no
 * choca hasta que sale y vuelve a entrar.
 */
import { alturaEn, type Alturas } from "./alturas";
import { XC, YC } from "./coordenadas";

interface V3 {
  x: number;
  y: number;
  z: number;
}

const MAX_PASOS = 6000;
const BISECCIONES = 16;

/** Distancia t a lo largo de `dir` (normalizada) hasta el primer corte con el relieve, o null. */
export function cortarRelieve(a: Alturas, zRef: number, origen: V3, dir: V3, tMin = 0, tMax = Infinity): number | null {
  const [cx0, cy0, cx1, cy1] = a.caja;
  const medio = a.mPx / 2; // los vértices están en los centros de píxel
  const ejes: [number, number, number, number][] = [
    [origen.x, dir.x, cx0 - XC + medio, cx1 - XC - medio],
    [origen.y, dir.y, a.zmin - zRef - 1, a.zmax - zRef + 1],
    [origen.z, dir.z, YC - cy1 + medio, YC - cy0 - medio],
  ];
  let t0 = tMin;
  let t1 = tMax;
  for (const [o, d, min, max] of ejes) {
    if (Math.abs(d) < 1e-12) {
      if (o < min || o > max) return null;
      continue;
    }
    let ta = (min - o) / d;
    let tb = (max - o) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  if (!Number.isFinite(t1)) return null;

  // Altura del rayo sobre el suelo en t (negativa = bajo el suelo)
  const sobreSuelo = (t: number) =>
    origen.y + dir.y * t - (alturaEn(a, origen.x + dir.x * t + XC, YC - (origen.z + dir.z * t)) - zRef);

  const horizontal = Math.hypot(dir.x, dir.z);
  let paso = horizontal > 1e-9 ? medio / horizontal : t1 - t0;
  if ((t1 - t0) / paso > MAX_PASOS) paso = (t1 - t0) / MAX_PASOS;
  if (!(paso > 0)) paso = Math.max(t1 - t0, 1e-6);

  let tAnt = t0;
  let encima = sobreSuelo(t0) >= 0;
  for (let i = 1; ; i++) {
    const t = Math.min(t0 + i * paso, t1);
    const f = sobreSuelo(t);
    if (encima && f < 0) {
      let a0 = tAnt;
      let a1 = t;
      for (let k = 0; k < BISECCIONES; k++) {
        const m = (a0 + a1) / 2;
        if (sobreSuelo(m) >= 0) a0 = m;
        else a1 = m;
      }
      return (a0 + a1) / 2;
    }
    if (f >= 0) encima = true;
    tAnt = t;
    if (t >= t1) return null;
  }
}

const MAX_PASOS_SUPERFICIE = 1500;

/**
 * Corte de un rayo con una superficie cualquiera y = altura(x, z), en coordenadas de escena. Para
 * anclar los gestos de la cámara al suelo también fuera de la zona (entorno y región), donde no hace
 * falta la exactitud de `cortarRelieve`: avanza más cuanto más alto va el rayo sobre el suelo y con
 * el paso que da `resolucion` en cada sitio. Solo cuenta la entrada desde arriba.
 */
export function cortarSuperficie(
  altura: (x: number, z: number) => number,
  resolucion: (x: number, z: number) => number,
  origen: V3,
  dir: V3,
  tMax: number,
  yMax: number,
): number | null {
  let t = 0;
  if (origen.y > yMax) {
    if (dir.y >= 0) return null;
    t = (yMax - origen.y) / dir.y;
    if (t >= tMax) return null;
  }
  const horizontal = Math.max(Math.hypot(dir.x, dir.z), 0.02);
  const sobre = (s: number) => origen.y + dir.y * s - altura(origen.x + dir.x * s, origen.z + dir.z * s);
  let tAnt = t;
  let f = sobre(t);
  let encima = f >= 0;
  for (let i = 0; i < MAX_PASOS_SUPERFICIE; i++) {
    if (dir.y > 0 && origen.y + dir.y * t > yMax) return null;
    const res = resolucion(origen.x + dir.x * t, origen.z + dir.z * t);
    const paso = Math.max((0.5 * res) / horizontal, encima ? 0.45 * f : 0);
    const s = Math.min(t + paso, tMax);
    const fs = sobre(s);
    if (encima && fs < 0) {
      let a0 = tAnt;
      let a1 = s;
      for (let k = 0; k < BISECCIONES; k++) {
        const m = (a0 + a1) / 2;
        if (sobre(m) >= 0) a0 = m;
        else a1 = m;
      }
      return (a0 + a1) / 2;
    }
    if (fs >= 0) encima = true;
    tAnt = s;
    t = s;
    f = fs;
    if (s >= tMax) return null;
  }
  return null;
}
