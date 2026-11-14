"use client";

/**
 * Regla kilométrica en el borde del área de estudio (sigue al zoom): marcas cada 500 m y
 * rótulos cada kilómetro, medidos desde la esquina suroeste. Da escala y precisión a simple vista.
 */
import { CELDA_M, N } from "@/lib/constants";
import type { Punto } from "@/lib/mapa/geo";
import { CIFRA } from "./fuente";

const PASO_M = 500;

export default function Regla({
  aPantalla,
  ancho,
  alto,
  rotulos,
}: {
  aPantalla: (p: Punto) => Punto;
  ancho: number;
  alto: number;
  rotulos: boolean;
}) {
  const so = aPantalla({ x: 0, y: N }); // esquina suroeste en pantalla
  const ne = aPantalla({ x: N, y: 0 });
  const marcas: { m: number; x: number; y: number }[] = [];
  for (let m = 0; m <= N * CELDA_M; m += PASO_M) {
    const c = m / CELDA_M;
    const p = aPantalla({ x: c, y: N - c });
    marcas.push({ m, x: p.x, y: p.y });
  }
  const dentroX = (x: number) => x >= 0 && x <= ancho;
  const dentroY = (y: number) => y >= 0 && y <= alto;
  return (
    <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full overflow-visible" aria-hidden>
      {/* Marcas hacia dentro, sobre el borde inferior y el izquierdo del área */}
      <g stroke="rgba(234,240,255,0.55)" strokeWidth={1}>
        {marcas.map(({ m, x, y }) => {
          const largo = m % 1000 === 0 ? 7 : 4;
          return (
            <g key={m}>
              {dentroX(x) && <line x1={x} y1={so.y} x2={x} y2={so.y - largo} />}
              {dentroY(y) && <line x1={so.x} y1={y} x2={so.x + largo} y2={y} />}
            </g>
          );
        })}
      </g>
      {rotulos && (
        <g className={CIFRA} fontSize={10.5} fill="#b9c6e6" stroke="rgba(4,8,20,0.85)" strokeWidth={3} style={{ paintOrder: "stroke" }}>
          {marcas
            .filter(({ m }) => m % 1000 === 0)
            .map(({ m, x, y }) => (
              <g key={m}>
                {dentroX(x) && so.y + 14 < alto && (
                  <text x={x} y={so.y + 14} textAnchor="middle">
                    {m / 1000}
                  </text>
                )}
                {m > 0 && dentroY(y) && so.x - 8 > 0 && (
                  <text x={so.x - 8} y={y + 3.5} textAnchor="end">
                    {m / 1000}
                  </text>
                )}
              </g>
            ))}
          {ne.x + 4 < ancho && so.y + 14 < alto && (
            <text x={Math.min(ne.x, ancho) + 6} y={so.y + 14} textAnchor="start">
              km
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
