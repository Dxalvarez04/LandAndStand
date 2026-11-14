/**
 * Lo que se «pinta» sobre el terreno 3D dentro de la zona de estudio, en un lienzo cuadrado norte arriba:
 *   - probabilidad (viridis, transparente por debajo del 2 %): la misma imagen que el mapa 2D;
 *   - contornos del 50 % y 90 % con su rótulo, borde de la zona y regla en km.
 * El terreno los recibe como texturas (ver Terreno.tsx). Estilo: docs/es/estilo_mapa.md.
 */
import { CELDA_M, N } from "@/lib/constants";
import type { Contorno } from "@/lib/mapa/contornos";
import { ESTILO } from "@/lib/mapa/estilo";
import { ESCALA, rasterizar } from "@/lib/mapa/rasterizar";

export const LADO_PROB = N * ESCALA; // 440 px
export const LADO_SUPER = 2048;

export function pintarProbabilidad(ctx: CanvasRenderingContext2D, prob: Float32Array | null, imagen: ImageData) {
  if (!prob) {
    ctx.clearRect(0, 0, LADO_PROB, LADO_PROB);
    return;
  }
  rasterizar(prob, imagen.data);
  ctx.putImageData(imagen, 0, 0);
}

const COLOR: Record<number, string> = { 0.5: ESTILO.contorno50, 0.9: ESTILO.ambar };

/** `porcentaje` da el texto de los rótulos (50 → «50 %» en español, "50%" en inglés). */
export function pintarSuperposicion(ctx: CanvasRenderingContext2D, contornos: Contorno[], porcentaje: (n: number) => string) {
  const s = LADO_SUPER / N; // px por celda
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, LADO_SUPER, LADO_SUPER);

  // Contornos (coordenadas de «mundo»: celdas, y hacia abajo desde el norte)
  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const c of contornos) {
    const camino = new Path2D(c.d);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(4,8,20,0.55)";
    ctx.lineWidth = (c.umbral === 0.9 ? 10 : 8.5) / s;
    ctx.stroke(camino);
    ctx.strokeStyle = COLOR[c.umbral];
    ctx.lineWidth = (c.umbral === 0.9 ? 5 : 4) / s;
    ctx.setLineDash(c.umbral === 0.5 ? [16 / s, 12 / s] : []);
    ctx.stroke(camino);
  }
  ctx.restore();

  // Rótulos de los contornos
  ctx.font = "600 34px ui-sans-serif, system-ui, sans-serif";
  ctx.lineJoin = "round";
  for (const c of contornos) {
    if (!c.etiqueta || c.radio < 4) continue;
    const x = c.etiqueta.x * s + 10;
    const y = c.etiqueta.y * s - 10;
    const texto = porcentaje(Math.round(c.umbral * 100));
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(4,8,20,0.8)";
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = COLOR[c.umbral];
    ctx.fillText(texto, x, y);
  }

  // Borde y regla: no cambian, se dibujan una vez y aquí solo se copian (el texto es lo más lento)
  ctx.drawImage(capaFija(), 0, 0);
}

let fija: HTMLCanvasElement | null = null;

/** Borde de la zona de estudio y regla en km (encima de todo lo demás). */
function capaFija(): HTMLCanvasElement {
  if (fija) return fija;
  fija = document.createElement("canvas");
  fija.width = fija.height = LADO_SUPER;
  const ctx = fija.getContext("2d")!;
  // Borde de la zona de estudio
  ctx.strokeStyle = "rgba(234,240,255,0.75)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, LADO_SUPER - 4, LADO_SUPER - 4);

  // Regla: marcas cada 500 m hacia dentro en los bordes sur y oeste; cifras cada km
  const pxPorM = LADO_SUPER / (N * CELDA_M);
  ctx.strokeStyle = "rgba(234,240,255,0.85)";
  ctx.fillStyle = "rgba(234,240,255,0.95)";
  ctx.font = "500 30px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (let m = 500; m < N * CELDA_M; m += 500) {
    const p = m * pxPorM;
    const largo = m % 1000 === 0 ? 34 : 18;
    ctx.lineWidth = m % 1000 === 0 ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(p, LADO_SUPER);
    ctx.lineTo(p, LADO_SUPER - largo);
    ctx.moveTo(0, LADO_SUPER - p);
    ctx.lineTo(largo, LADO_SUPER - p);
    ctx.stroke();
    if (m % 1000 === 0) {
      const km = `${m / 1000} km`;
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(4,8,20,0.8)";
      ctx.strokeText(km, p + 8, LADO_SUPER - 14);
      ctx.fillText(km, p + 8, LADO_SUPER - 14);
      ctx.strokeText(km, 14, LADO_SUPER - p - 10);
      ctx.fillText(km, 14, LADO_SUPER - p - 10);
      ctx.strokeStyle = "rgba(234,240,255,0.85)";
    }
  }
  return fija;
}
