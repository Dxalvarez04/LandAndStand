/**
 * Space Mono, en la portada: los títulos (grandes, en negrita y en blanco) y los datos (coordenadas,
 * cifras del modelo). El texto corrido va en Jost, la letra de la herramienta (components/mapa/fuente.ts).
 *
 * Space Mono no trae flechas ni «≈» en su juego latino.
 */
import { Space_Mono } from "next/font/google";

export const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});
