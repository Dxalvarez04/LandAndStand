/**
 * Terreno de contexto alrededor de la zona de estudio (public/data/contexto_color.jpg).
 * Solo visual: el modelo calcula únicamente dentro de los 110 × 110. Márgenes en celdas de 32 m;
 * deben coincidir con CTX en scripts/preparar_datos.py (1 km al oeste, donde acaba el mosaico, y 3 km
 * al norte, este y sur).
 */
import { CELDA_M } from "@/lib/constants";

export const RUTA_CONTEXTO = "/data/contexto_color.jpg";
export const RUTA_RELIEVE = "/data/relieve.png";

export const MARGEN_CTX = {
  oeste: 1000 / CELDA_M,
  este: 3000 / CELDA_M,
  sur: 3000 / CELDA_M,
  norte: 3000 / CELDA_M,
};

/** Pendiente a partir de la cual un tramo de ruta cuenta como empinado (%). */
export const PENDIENTE_FUERTE = 15;
