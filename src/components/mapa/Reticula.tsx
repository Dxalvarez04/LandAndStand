"use client";

/** Selección: un anillo fijo con punto central. */
import { ESTILO } from "@/lib/mapa/estilo";

export default function Reticula({ x, y }: { x: number; y: number }) {
  return (
    <svg
      width={32}
      height={32}
      viewBox="-16 -16 32 32"
      className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      aria-hidden
    >
      <circle r={11} fill="none" stroke={ESTILO.halo} strokeWidth={4} />
      <circle r={11} fill="none" stroke={ESTILO.ruta} strokeWidth={2} />
      <circle r={2} fill={ESTILO.ruta} />
    </svg>
  );
}
