"use client";

/**
 * PERSONA 2 · Mapa.
 * Mínimo funcional: capa de probabilidad en viridis (transparente < 2 %) + hábitat y destinos.
 * TODO: fondo HiRISE (/data/aoi_color.jpg), contornos 50/90 % (d3-contour),
 *       ruta ilustrativa en el inspector, animación al cambiar de sol.
 *
 * ⚠️ El DEM y `prob` tienen el SUR en la fila 0; la pantalla tiene el norte arriba.
 *    Fila de pantalla y = N − 1 − fila.
 */
import { useEffect, useRef } from "react";
import { interpolateViridis } from "d3-scale-chromatic";
import type { IdDestino, Resultado } from "@/lib/contract";
import { N, PROB_MIN_VISIBLE } from "@/lib/constants";
import { DESTINOS, HABITAT, kmACelda } from "@/lib/data/targets";

interface Props {
  resultado: Resultado | null;
  onCeldaClick?: (fila: number, columna: number) => void;
}

const pct = (p: number) => `${Math.round(p * 100)} %`;

export default function Mapa({ resultado, onCeldaClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(N, N);
    if (resultado) {
      for (let fila = 0; fila < N; fila++) {
        const y = N - 1 - fila; // invertir: fila 0 (sur) abajo
        for (let col = 0; col < N; col++) {
          const p = resultado.prob[fila * N + col];
          const k = (y * N + col) * 4;
          if (p < PROB_MIN_VISIBLE) continue; // alfa 0
          const rgb = interpolateViridis(p).match(/\d+/g)!.map(Number);
          img.data[k] = rgb[0];
          img.data[k + 1] = rgb[1];
          img.data[k + 2] = rgb[2];
          img.data[k + 3] = 190;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [resultado]);

  const pDe = (id: IdDestino) => resultado?.destinos.find((d) => d.id === id)?.p;

  const marcador = (northKm: number, eastKm: number) => {
    const { fila, columna } = kmACelda(northKm, eastKm);
    return { left: `${((columna + 0.5) / N) * 100}%`, top: `${((N - 1 - fila + 0.5) / N) * 100}%` };
  };

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-800">
      {/* TODO: <img src="/data/aoi_color.jpg"> de fondo, norte arriba */}
      <canvas
        ref={canvasRef}
        width={N}
        height={N}
        className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const columna = Math.floor(((e.clientX - r.left) / r.width) * N);
          const y = Math.floor(((e.clientY - r.top) / r.height) * N);
          onCeldaClick?.(N - 1 - y, columna);
        }}
      />
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white px-1.5 text-xs font-bold text-black"
        style={marcador(HABITAT.northKm, HABITAT.eastKm)}
      >
        H
      </span>
      {DESTINOS.map((t) => {
        const p = pDe(t.id);
        return (
          <span
            key={t.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 text-xs text-white"
            style={marcador(t.northKm, t.eastKm)}
          >
            {t.id}
            {p !== undefined && ` · ${pct(p)}`}
          </span>
        );
      })}
    </div>
  );
}
