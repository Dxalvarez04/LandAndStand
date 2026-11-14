/**
 * Contornos del 50 % y del 90 % con marching squares (d3-contour) sobre los centros de celda.
 *
 * d3-contour coloca el valor de índice i en la coordenada i + 0,5, que es justo el centro
 * de celda en coordenadas de mundo. Le pasamos la malla ya invertida (norte arriba), así
 * que sus coordenadas son directamente de mundo.
 *
 * La malla se rellena por fuera con RELLENO celdas que repiten el borde: las líneas que tocan
 * el borde de la ventana se cierran fuera de la vista y no se dibuja un trazo a lo largo del marco.
 */
import { contours } from "d3-contour";
import { N } from "@/lib/constants";
import type { Punto } from "./geo";

export const UMBRALES = [0.5, 0.9] as const;
const RELLENO = 2;

export interface Contorno {
  umbral: number;
  /** Atributo `d` de SVG en coordenadas de mundo */
  d: string;
  /** Dónde poner la etiqueta («90 %»), en coordenadas de mundo; null si no hay línea visible */
  etiqueta: Punto | null;
  /** Radio aproximado del anillo de la etiqueta, en celdas (para no rotular anillos diminutos) */
  radio: number;
}

const M = N + 2 * RELLENO;
const generador = contours().size([M, M]).thresholds(UMBRALES as unknown as number[]);
const valores = new Float64Array(M * M);

/** prob: malla del contrato (fila 0 = sur). */
export function calcularContornos(prob: Float32Array): Contorno[] {
  for (let y = 0; y < M; y++) {
    const filaPantalla = Math.max(0, Math.min(N - 1, y - RELLENO));
    const fila = N - 1 - filaPantalla;
    for (let x = 0; x < M; x++) {
      const col = Math.max(0, Math.min(N - 1, x - RELLENO));
      valores[y * M + x] = prob[fila * N + col];
    }
  }

  return generador(valores as unknown as number[]).map((mp) => {
    let d = "";
    let etiqueta: Punto | null = null;
    let mejorArea = 0;
    let radio = 0;
    for (const poligono of mp.coordinates) {
      for (const anillo of poligono) {
        d += "M" + anillo.map(([x, y]) => `${(x - RELLENO).toFixed(2)},${(y - RELLENO).toFixed(2)}`).join("L") + "Z";
      }
      // La etiqueta va en el anillo exterior más grande, en su punto visible más al noreste
      // (arriba del hábitat ya está su propia etiqueta).
      const exterior = poligono[0];
      const area = Math.abs(areaAnillo(exterior));
      if (area > mejorArea) {
        const p = puntoEtiqueta(exterior);
        if (p) {
          mejorArea = area;
          etiqueta = p;
          radio = Math.sqrt(area / Math.PI);
        }
      }
    }
    return { umbral: mp.value, d, etiqueta, radio };
  });
}

function areaAnillo(a: number[][]): number {
  let s = 0;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] + a[i][0]) * (a[j][1] - a[i][1]);
  return s / 2;
}

/** Punto más al noreste del anillo que quede bien dentro de la ventana (para que la etiqueta se vea). */
function puntoEtiqueta(anillo: number[][]): Punto | null {
  const margen = 4;
  let mejor: Punto | null = null;
  for (const [xr, yr] of anillo) {
    const x = xr - RELLENO;
    const y = yr - RELLENO;
    if (x < margen || x > N - margen || y < margen || y > N - margen) continue;
    if (!mejor || x - y > mejor.x - mejor.y) mejor = { x, y };
  }
  return mejor;
}
