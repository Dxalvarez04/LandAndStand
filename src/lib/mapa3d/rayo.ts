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
