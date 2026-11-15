/**
 * La probabilidad que se «pinta» sobre el terreno 3D dentro de la zona de estudio, en un lienzo
 * cuadrado norte arriba (viridis, transparente por debajo del 2 %): la misma imagen que el mapa 2D.
 * El terreno la recibe como textura (ver Terreno.tsx). Los contornos, el borde y la regla son líneas
 * (Lineas3D.tsx). Estilo: docs/es/estilo_mapa.md.
 */
import { N } from "@/lib/constants";
import { ESCALA, rasterizar } from "@/lib/mapa/rasterizar";

export const LADO_PROB = N * ESCALA; // 440 px

export function pintarProbabilidad(ctx: CanvasRenderingContext2D, prob: Float32Array | null, imagen: ImageData) {
  if (!prob) {
    ctx.clearRect(0, 0, LADO_PROB, LADO_PROB);
    return;
  }
  rasterizar(prob, imagen.data);
  ctx.putImageData(imagen, 0, 0);
}
