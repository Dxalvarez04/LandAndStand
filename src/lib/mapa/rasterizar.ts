/**
 * Pasa la malla de probabilidad (110 × 110, fila 0 = sur) a una imagen suave de
 * (110·escala)² píxeles, norte arriba.
 *
 * Se interpola la PROBABILIDAD (bilineal sobre los centros de celda) y después se aplica
 * el color; así no aparecen halos de color entre celdas transparentes y opacas, y el
 * relleno coincide con los contornos de d3-contour (que también usan centros de celda).
 * Fuera de la malla se repite el valor del borde.
 */
import { N, PROB_MIN_VISIBLE } from "@/lib/constants";
import { TABLA_VIRIDIS, indiceTabla } from "./viridis";

export const ESCALA = 4;

interface Pesos {
  i0: Int32Array;
  i1: Int32Array;
  f: Float32Array;
}

const cachePesos = new Map<number, Pesos>();

/** Para cada píxel de salida, las dos muestras vecinas y el peso de la segunda. */
function pesos(escala: number): Pesos {
  const hit = cachePesos.get(escala);
  if (hit) return hit;
  const W = N * escala;
  const i0 = new Int32Array(W);
  const i1 = new Int32Array(W);
  const f = new Float32Array(W);
  for (let p = 0; p < W; p++) {
    const g = (p + 0.5) / escala - 0.5; // posición en unidades de centro de celda
    const a = Math.floor(g);
    i0[p] = Math.max(0, Math.min(N - 1, a));
    i1[p] = Math.max(0, Math.min(N - 1, a + 1));
    f[p] = g - a;
  }
  const r = { i0, i1, f };
  cachePesos.set(escala, r);
  return r;
}

/**
 * Escribe en `destino` (RGBA, ancho = alto = N·escala).
 * @param prob malla del contrato: índice = fila·N + columna, fila 0 = SUR
 */
export function rasterizar(prob: Float32Array, destino: Uint8ClampedArray, escala = ESCALA): void {
  const W = N * escala;
  const { i0, i1, f } = pesos(escala);
  const tabla = TABLA_VIRIDIS;

  for (let py = 0; py < W; py++) {
    // fila de pantalla (desde el norte) → fila del modelo (desde el sur)
    const filaA = N - 1 - i0[py];
    const filaB = N - 1 - i1[py];
    const fy = f[py];
    const baseA = filaA * N;
    const baseB = filaB * N;
    let k = py * W * 4;
    for (let px = 0; px < W; px++, k += 4) {
      const c0 = i0[px];
      const c1 = i1[px];
      const fx = f[px];
      const arriba = prob[baseA + c0] + (prob[baseA + c1] - prob[baseA + c0]) * fx;
      const abajo = prob[baseB + c0] + (prob[baseB + c1] - prob[baseB + c0]) * fx;
      const p = arriba + (abajo - arriba) * fy;
      if (p < PROB_MIN_VISIBLE) {
        destino[k + 3] = 0;
        continue;
      }
      const t = indiceTabla(p) * 4;
      destino[k] = tabla[t];
      destino[k + 1] = tabla[t + 1];
      destino[k + 2] = tabla[t + 2];
      destino[k + 3] = tabla[t + 3];
    }
  }
}
