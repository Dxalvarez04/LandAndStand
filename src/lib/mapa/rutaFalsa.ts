/**
 * Ruta INVENTADA para el inspector mientras la persona 1 no implemente `calcularRuta`.
 * Ida en línea recta y vuelta con una ligera curva, para que se distingan.
 * Solo devuelve ruta si la celda tiene alguna probabilidad de ida y vuelta.
 */
import type { Ruta } from "@/lib/contract";
import { PROB_MIN_VISIBLE } from "@/lib/constants";
import { acotar, type Celda, indice } from "./geo";

function linea(a: Celda, b: Celda): number[] {
  const out: number[] = [];
  let f = a.fila;
  let c = a.columna;
  const df = Math.abs(b.fila - f);
  const dc = Math.abs(b.columna - c);
  const sf = f < b.fila ? 1 : -1;
  const sc = c < b.columna ? 1 : -1;
  let err = dc - df;
  for (;;) {
    out.push(indice({ fila: f, columna: c }));
    if (f === b.fila && c === b.columna) break;
    const e2 = 2 * err;
    if (e2 > -df) {
      err -= df;
      c += sc;
    }
    if (e2 < dc) {
      err += dc;
      f += sf;
    }
  }
  return out;
}

export function rutaFalsa(habitat: Celda, destino: Celda, prob: Float32Array | null): Ruta | null {
  if (prob && prob[indice(destino)] < PROB_MIN_VISIBLE) return null;
  const ida = linea(habitat, destino);
  // Vuelta por un punto intermedio desplazado en perpendicular
  const df = destino.fila - habitat.fila;
  const dc = destino.columna - habitat.columna;
  const largo = Math.hypot(df, dc) || 1;
  const desvio = Math.min(4, largo / 6);
  const medio = acotar({
    fila: Math.round((habitat.fila + destino.fila) / 2 + (-dc / largo) * desvio),
    columna: Math.round((habitat.columna + destino.columna) / 2 + (df / largo) * desvio),
  });
  const vuelta = [...linea(destino, medio), ...linea(medio, habitat).slice(1)];
  return { ida: Int32Array.from(ida), vuelta: Int32Array.from(vuelta) };
}
