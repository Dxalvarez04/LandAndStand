/**
 * Malla del terreno 3D a partir de las alturas (fila 0 = norte):
 *   - un vértice por píxel (o cada `paso` píxeles), en coordenadas de escena (ver coordenadas.ts);
 *   - uv: u = este, v = norte, de 0 a 1 en la caja de contexto;
 *   - faldón horizontal alrededor (vértices propios): prolonga el borde hacia fuera, a su misma
 *     altura, hasta perderse en la bruma. Así el terreno no parece una losa flotando.
 * Todas las caras miran hacia arriba (+y).
 */
import type { Alturas } from "./alturas";
import { aEscena } from "./coordenadas";

export interface Malla {
  posiciones: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** Número de vértices de la superficie (sin faldón) */
  nSuperficie: number;
}

export function construirMalla(a: Alturas, zRef: number, paso = 1, alcanceFaldon = 40_000): Malla {
  const W = Math.floor((a.ancho - 1) / paso) + 1;
  const H = Math.floor((a.alto - 1) / paso) + 1;
  const [x0, y0, x1, y1] = a.caja;
  const anchoM = x1 - x0;
  const altoM = y1 - y0;

  // Contorno en orden: norte (→ este), este (→ sur), sur (→ oeste), oeste (→ norte)
  const borde: [number, number][] = [];
  for (let i = 0; i < W; i++) borde.push([i, 0]);
  for (let j = 1; j < H; j++) borde.push([W - 1, j]);
  for (let i = W - 2; i >= 0; i--) borde.push([i, H - 1]);
  for (let j = H - 2; j >= 1; j--) borde.push([0, j]);
  const nB = borde.length;

  const nSuperficie = W * H;
  const nV = nSuperficie + 2 * nB;
  const posiciones = new Float32Array(nV * 3);
  const uvs = new Float32Array(nV * 2);

  const vertice = (k: number, i: number, j: number, yFijo?: number) => {
    const px = Math.min(a.ancho - 1, i * paso);
    const py = Math.min(a.alto - 1, j * paso);
    const este = x0 + (px + 0.5) * a.mPx;
    const norte = y1 - (py + 0.5) * a.mPx;
    const { x, z } = aEscena(este, norte);
    posiciones[k * 3] = x;
    posiciones[k * 3 + 1] = yFijo ?? a.datos[py * a.ancho + px] - zRef;
    posiciones[k * 3 + 2] = z;
    uvs[k * 2] = (este - x0) / anchoM;
    uvs[k * 2 + 1] = (norte - y0) / altoM;
  };

  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) vertice(j * W + i, i, j);

  borde.forEach(([i, j], b) => {
    vertice(nSuperficie + b, i, j); // borde (copia: normales propias)
    // Hacia fuera (en las esquinas, en diagonal), misma altura y misma uv que el borde
    const dx = i === 0 ? -1 : i === W - 1 ? 1 : 0;
    const dz = j === 0 ? -1 : j === H - 1 ? 1 : 0; // z = sur
    const l = Math.hypot(dx, dz) || 1;
    const k = nSuperficie + nB + b;
    vertice(k, i, j);
    posiciones[k * 3] += (dx / l) * alcanceFaldon;
    posiciones[k * 3 + 2] += (dz / l) * alcanceFaldon;
  });

  const nTri = (W - 1) * (H - 1) * 2 + nB * 2;
  const indices = new Uint32Array(nTri * 3);
  let t = 0;
  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const p = j * W + i;
      const q = p + 1;
      const r = p + W;
      const s = r + 1;
      indices.set([p, r, q, q, r, s], t);
      t += 6;
    }
  }
  for (let b = 0; b < nB; b++) {
    const A = nSuperficie + b;
    const B = nSuperficie + ((b + 1) % nB);
    const C = nSuperficie + nB + ((b + 1) % nB);
    const D = nSuperficie + nB + b;
    indices.set([A, B, C, A, C, D], t);
    t += 6;
  }
  return { posiciones, uvs, indices, nSuperficie };
}
