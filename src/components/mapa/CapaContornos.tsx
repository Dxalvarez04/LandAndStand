"use client";

/**
 * Contornos del 50 % (punteado claro) y del 90 % (ámbar). Ver docs/estilo_mapa.md.
 * Se dibujan dentro de un <g> con la transformación mundo → pantalla; el grosor no cambia con el zoom.
 */
import type { Contorno } from "@/lib/mapa/contornos";
import { ESTILO } from "@/lib/mapa/estilo";

export const COLOR_CONTORNO: Record<number, string> = { 0.5: ESTILO.contorno50, 0.9: ESTILO.ambar };
const GROSOR: Record<number, number> = { 0.5: 1.2, 0.9: 1.7 };
const PUNTEADO: Record<number, string | undefined> = { 0.5: "4 3", 0.9: undefined };

export default function CapaContornos({ contornos }: { contornos: Contorno[] }) {
  return (
    <g fill="none" strokeLinejoin="round">
      {contornos.map((c) => (
        <g key={c.umbral}>
          <path d={c.d} stroke={ESTILO.halo} strokeWidth={GROSOR[c.umbral] + 2.5} vectorEffect="non-scaling-stroke" />
          <path
            d={c.d}
            stroke={COLOR_CONTORNO[c.umbral]}
            strokeWidth={GROSOR[c.umbral]}
            strokeDasharray={PUNTEADO[c.umbral]}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </g>
  );
}

/** Etiquetas «50 %» y «90 %» sobre la línea, en coordenadas de pantalla (no escalan con el zoom). */
export function EtiquetasContornos({
  contornos,
  aPantalla,
  pxPorCelda,
  evitar,
}: {
  contornos: Contorno[];
  aPantalla: (p: { x: number; y: number }) => { x: number; y: number };
  /** Píxeles por celda con el zoom actual */
  pxPorCelda: number;
  /** Punto de pantalla que la etiqueta no debe tapar (la etiqueta del hábitat) */
  evitar: { x: number; y: number };
}) {
  return (
    <g fontSize={12} fontWeight={500} textAnchor="start" style={{ paintOrder: "stroke" }}>
      {contornos.map((c) => {
        if (!c.etiqueta || c.radio * pxPorCelda < 45) return null; // anillo diminuto: basta la leyenda
        const p = aPantalla(c.etiqueta);
        if (Math.hypot(p.x - evitar.x, p.y - evitar.y) < 70) return null;
        return (
          <text key={c.umbral} x={p.x + 6} y={p.y - 4} fill={COLOR_CONTORNO[c.umbral]} stroke="rgba(4,8,20,0.8)" strokeWidth={3}>
            {Math.round(c.umbral * 100)} %
          </text>
        );
      })}
    </g>
  );
}
