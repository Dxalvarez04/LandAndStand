/**
 * Todos los textos del mapa. Regla del equipo: NUNCA «seguro» ni «zona segura».
 * Se dice «alcanzable bajo los supuestos indicados».
 */
import { PROB_MIN_VISIBLE } from "@/lib/constants";

export type IdFranja = "muy" | "probable" | "poco" | "fuera";

export interface Franja {
  id: IdFranja;
  /** Límite inferior (incluido) */
  desde: number;
  nombre: string;
  /** Frase completa para el inspector */
  frase: string;
}

/** De mayor a menor. Los límites coinciden con los contornos (90 % y 50 %) y con el 2 % visible. */
export const FRANJAS: Franja[] = [
  { id: "muy", desde: 0.9, nombre: "Muy probable", frase: "Muy probable ir y volver" },
  { id: "probable", desde: 0.5, nombre: "Probable", frase: "Probable ir y volver" },
  { id: "poco", desde: PROB_MIN_VISIBLE, nombre: "Poco probable", frase: "Poco probable ir y volver" },
  { id: "fuera", desde: 0, nombre: "Fuera de alcance", frase: "Fuera de alcance" },
];

export function franjaDe(p: number): Franja {
  return FRANJAS.find((f) => p >= f.desde) ?? FRANJAS[FRANJAS.length - 1];
}

const fmtPct = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const fmtKm = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtGrado = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** 0.2899 → "29 %". Por debajo del 1 % se muestra "<1 %" para no decir "0 %". */
export function pct(p: number): string {
  if (p > 0 && p < 0.005) return "<1 %";
  return `${fmtPct.format(Math.round(p * 100))} %`;
}

export function distancia(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${fmtKm.format(m / 1000)} km`;
}

export function latLon(lat: number, lon: number): string {
  return `${fmtGrado.format(Math.abs(lat))}° ${lat < 0 ? "S" : "N"}, ${fmtGrado.format(Math.abs(lon))}° ${lon < 0 ? "O" : "E"}`;
}

export const TEXTOS = {
  pista: "Toca cualquier punto para saber si puedes ir y volver",
  calculando: "Calculando…",
  supuestos: "Bajo los supuestos indicados",
  distanciaDesdeHabitat: "desde el hábitat, en línea recta",
  rutaIda: "Ida",
  rutaVuelta: "Vuelta",
  rutaIlustrativa: "Ruta ilustrativa con los valores centrales",
  rutaAproximada: "Ruta aproximada (pendiente del modelo)",
  sinRuta: "No hay ruta de ida y vuelta",
  verTodo: "Zona de estudio",
  acercar: "Acercar",
  alejar: "Alejar",
  cerrar: "Cerrar",
  habitat: "Hábitat",
  fueraDeAlcanceLeyenda: "Sin color: fuera de alcance",
  sinImagen: "Falta la imagen HiRISE (public/data/aoi_color.jpg)",
  resumen: (sol: number, probables: number, total: number) =>
    `Mapa de alcance a pie, sol ${sol}: ${probables} de ${total} destinos con probabilidad de ir y volver del 50 % o más.`,
} as const;
