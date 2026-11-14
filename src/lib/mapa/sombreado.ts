/**
 * Relieve sombreado (hillshade) a partir del DEM, para que se lean crestas y pendientes
 * debajo de la probabilidad. Luz desde el noroeste (azimut 315°) a 45° de altura.
 * Devuelve RGBA de N × N, norte arriba (fila 0 de la imagen = norte).
 */
import { CELDA_M, N } from "@/lib/constants";

export function sombreado(dem: Float32Array, exageracion = 2): Uint8ClampedArray {
  const out = new Uint8ClampedArray(N * N * 4);
  const az = (315 * Math.PI) / 180;
  const alt = (45 * Math.PI) / 180;
  const L = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)]; // este, norte, arriba
  const z = (f: number, c: number) =>
    dem[Math.max(0, Math.min(N - 1, f)) * N + Math.max(0, Math.min(N - 1, c))] * exageracion;

  for (let fila = 0; fila < N; fila++) {
    for (let col = 0; col < N; col++) {
      const dzdx = (z(fila, col + 1) - z(fila, col - 1)) / (2 * CELDA_M); // hacia el este
      const dzdy = (z(fila + 1, col) - z(fila - 1, col)) / (2 * CELDA_M); // hacia el norte (fila + 1)
      const n = [-dzdx, -dzdy, 1];
      const len = Math.hypot(n[0], n[1], n[2]);
      const s = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len);
      const v = Math.round(s * 255);
      const k = ((N - 1 - fila) * N + col) * 4; // invertir: norte arriba
      out[k] = v;
      out[k + 1] = v;
      out[k + 2] = v;
      out[k + 3] = 255;
    }
  }
  return out;
}
