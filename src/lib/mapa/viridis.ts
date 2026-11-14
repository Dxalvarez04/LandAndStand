/**
 * Tabla de colores viridis precalculada (RGBA), con transparencia por debajo del 2 %
 * y una rampa de alfa corta por encima para que el borde no quede dentado.
 */
import { interpolateViridis } from "d3-scale-chromatic";
import { PROB_MIN_VISIBLE } from "@/lib/constants";

export const TAM_TABLA = 1024;
/** Ancho de la rampa de alfa por encima del umbral */
const RAMPA = 0.03;

function rgb(css: string): [number, number, number] {
  // interpolateViridis devuelve "#rrggbb"
  const h = css.startsWith("#") ? css.slice(1) : css;
  if (h.length === 6) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  const m = css.match(/\d+/g)!.map(Number);
  return [m[0], m[1], m[2]];
}

function construir(): Uint8ClampedArray {
  const t = new Uint8ClampedArray(TAM_TABLA * 4);
  for (let i = 0; i < TAM_TABLA; i++) {
    const p = i / (TAM_TABLA - 1);
    const [r, g, b] = rgb(interpolateViridis(p));
    const a = p < PROB_MIN_VISIBLE ? 0 : Math.min(1, (p - PROB_MIN_VISIBLE) / RAMPA + 0.35);
    t.set([r, g, b, Math.round(a * 255)], i * 4);
  }
  return t;
}

export const TABLA_VIRIDIS = construir();

/** Índice de la tabla para una probabilidad. */
export function indiceTabla(p: number): number {
  if (!(p > 0)) return 0;
  if (p >= 1) return TAM_TABLA - 1;
  return Math.floor(p * (TAM_TABLA - 1));
}

/** Color CSS (para la leyenda). */
export const colorViridis = (p: number) => interpolateViridis(p);
