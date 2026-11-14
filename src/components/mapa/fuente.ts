/**
 * Tipografías del mapa (ver docs/es/estilo_mapa.md):
 *  - Jost (versión libre de Futura) para nombres y textos.
 *  - IBM Plex Mono para cifras: porcentajes, distancias, coordenadas, escala.
 */
import { IBM_Plex_Mono, Jost } from "next/font/google";

export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Clase para cifras técnicas */
export const CIFRA = "[font-family:var(--font-plex-mono),ui-monospace,monospace] tabular-nums";
