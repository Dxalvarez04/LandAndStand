/**
 * Alturas para el 3D (generadas por scripts/preparar_datos_3d.py):
 *  - terreno local: uint16 LE en decímetros sobre `zmin`, fila 0 = norte, caja en proyectadas.
 *  - región de Gale: int16 LE en metros, fila 0 = norte, caja en grados.
 */

export interface Alturas {
  ancho: number;
  alto: number;
  /** Metros por píxel */
  mPx: number;
  /** [oeste, sur, este, norte] en proyectadas (m) */
  caja: [number, number, number, number];
  zmin: number;
  zmax: number;
  /** Metros, fila 0 = norte */
  datos: Float32Array;
}

export interface AlturasGale {
  ancho: number;
  alto: number;
  lon: [number, number];
  lat: [number, number];
  min: number;
  max: number;
  datos: Int16Array;
  /**
   * Factor RGB (lineal) que iguala la imagen de la región (paleta HiRISE) al color del globo (MDIM
   * 2.1) cuando se pinta sobre él. Lo calcula scripts/preparar_datos_3d.py.
   */
  tinteGlobo: [number, number, number];
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

async function binario(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.arrayBuffer();
}

export async function cargarAlturas(base = "/data/3d/terreno_alturas"): Promise<Alturas> {
  const [meta, buf] = await Promise.all([
    json<{ ancho: number; alto: number; m_px: number; caja_m: number[]; zmin: number; zmax: number }>(`${base}.json`),
    binario(`${base}.bin`),
  ]);
  const crudo = new Uint16Array(buf);
  if (crudo.length !== meta.ancho * meta.alto) throw new Error("terreno_alturas: tamaño inesperado");
  const datos = new Float32Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) datos[i] = meta.zmin + crudo[i] / 10;
  return {
    ancho: meta.ancho,
    alto: meta.alto,
    mPx: meta.m_px,
    caja: meta.caja_m as Alturas["caja"],
    zmin: meta.zmin,
    zmax: meta.zmax,
    datos,
  };
}

let gale: Promise<AlturasGale> | null = null;

/** Región de Gale (la usan el globo y el terreno: se pide una sola vez). */
export function cargarAlturasGale(base = "/data/3d/gale_alturas"): Promise<AlturasGale> {
  gale ??= Promise.all([
    json<Omit<AlturasGale, "datos" | "tinteGlobo">>(`${base}.json`),
    binario(`${base}.bin`),
    json<{ tinte_globo: [number, number, number] }>("/data/3d/gale_color.json").catch(() => ({ tinte_globo: [1, 1, 1] as [number, number, number] })),
  ]).then(([meta, buf, color]) => ({ ...meta, datos: new Int16Array(buf), tinteGlobo: color.tinte_globo }));
  gale.catch(() => {
    gale = null;
  });
  return gale;
}

/** Entorno de la zona (todo el mosaico MSL) a 64 m. */
export const cargarEntorno = () => cargarAlturas("/data/3d/entorno_alturas");

/** Altura (m) en un punto en proyectadas, bilineal sobre centros de píxel; fuera de la caja, el borde. */
export function alturaEn(a: Alturas, este: number, norte: number): number {
  const fx = Math.min(a.ancho - 1, Math.max(0, (este - a.caja[0]) / a.mPx - 0.5));
  const fy = Math.min(a.alto - 1, Math.max(0, (a.caja[3] - norte) / a.mPx - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(a.ancho - 1, x0 + 1);
  const y1 = Math.min(a.alto - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const d = a.datos;
  const w = a.ancho;
  const arriba = d[y0 * w + x0] * (1 - tx) + d[y0 * w + x1] * tx;
  const abajo = d[y1 * w + x0] * (1 - tx) + d[y1 * w + x1] * tx;
  return arriba * (1 - ty) + abajo * ty;
}
