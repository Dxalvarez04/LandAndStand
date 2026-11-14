"use client";

/**
 * Fondo: imagen HiRISE (norte arriba). El relieve de 8 m va ENCIMA de la probabilidad (CapaRelieve).
 * Sin imagen: relieve en tono marciano o, si tampoco hay DEM, un degradado con cuadrícula de 1 km.
 */
import { memo, useEffect, useRef } from "react";
import { N } from "@/lib/constants";
import { RUTA_IMAGEN } from "@/lib/mapa/cargarDatos";
import { sombreado } from "@/lib/mapa/sombreado";

interface Props {
  dem: Float32Array | null;
  hayImagen: boolean | null;
}

function Relieve({ dem, className }: { dem: Float32Array; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(N, N);
    img.data.set(sombreado(dem));
    ctx.putImageData(img, 0, 0);
  }, [dem]);
  return <canvas ref={ref} width={N} height={N} aria-hidden className={`absolute inset-0 h-full w-full ${className}`} />;
}

/** Cuadrícula de 1 km (31,25 celdas) para orientarse cuando no hay imagen. */
function Cuadricula() {
  const paso = 1000 / 32;
  const lineas = [1, 2, 3].map((i) => i * paso);
  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="absolute inset-0 h-full w-full" aria-hidden>
      {lineas.map((v) => (
        <g key={v} stroke="rgba(160,190,255,0.09)" strokeWidth={0.15}>
          <line x1={v} y1={0} x2={v} y2={N} />
          <line x1={0} y1={v} x2={N} y2={v} />
        </g>
      ))}
    </svg>
  );
}

function CapaFondo({ dem, hayImagen }: Props) {
  return (
    <div className="absolute inset-0 bg-[#0b1226]">
      {hayImagen ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen científica a tamaño fijo, sin optimizar */}
          <img src={RUTA_IMAGEN} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover [filter:saturate(0.7)_brightness(0.82)]" />
        </>
      ) : dem ? (
        <Relieve dem={dem} className="opacity-45 mix-blend-screen" />
      ) : (
        <Cuadricula />
      )}
      {/* Tiñe el fondo de azul noche para que destaquen la probabilidad y las etiquetas */}
      <div className="absolute inset-0 bg-[#060a17]/25" />
    </div>
  );
}

export default memo(CapaFondo);
