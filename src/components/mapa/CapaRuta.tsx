"use client";

/**
 * Ruta: ida continua y vuelta punteada, en rosa (no aparece en viridis).
 * El camino del modelo va de celda en celda en 8 direcciones; para que no se vea en zigzag de 45°
 * se dibuja suavizado (Chaikin, 2 pasadas). Pasa por las mismas celdas: solo redondea esquinas.
 */
import type { Ruta } from "@/lib/contract";
import { celdaAMundo, celdaDeIndice } from "@/lib/mapa/geo";
import { ESTILO } from "@/lib/mapa/estilo";
import { suavizar } from "@/lib/mapa/suavizar";

export const COLOR_RUTA = ESTILO.ruta;

function camino(indices: Int32Array): string {
  const puntos = Array.from(indices, (i) => celdaAMundo(celdaDeIndice(i)));
  return suavizar(puntos)
    .map((p, k) => `${k === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join("");
}

export default function CapaRuta({ ruta }: { ruta: Ruta | null }) {
  if (!ruta || ruta.ida.length === 0) return null;
  const ida = camino(ruta.ida);
  const vuelta = camino(ruta.vuelta);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={vuelta} stroke={ESTILO.halo} strokeWidth={5.5} vectorEffect="non-scaling-stroke" />
      <path d={vuelta} stroke={COLOR_RUTA} strokeWidth={2.4} strokeDasharray="1.5 6" vectorEffect="non-scaling-stroke" />
      <path d={ida} stroke={ESTILO.halo} strokeWidth={5.5} vectorEffect="non-scaling-stroke" />
      <path d={ida} stroke={COLOR_RUTA} strokeWidth={2.4} vectorEffect="non-scaling-stroke" />
    </g>
  );
}
