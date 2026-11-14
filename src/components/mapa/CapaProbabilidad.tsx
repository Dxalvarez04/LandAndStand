"use client";

/** Capa de probabilidad: viridis suave (bilineal a 4×), transparente por debajo del 2 %. */
import { memo, useEffect, useRef } from "react";
import { N } from "@/lib/constants";
import { ESCALA, rasterizar } from "@/lib/mapa/rasterizar";

const W = N * ESCALA;

function CapaProbabilidad({ prob }: { prob: Float32Array | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imagen = useRef<ImageData | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    if (!prob) {
      ctx.clearRect(0, 0, W, W);
      return;
    }
    imagen.current ??= ctx.createImageData(W, W);
    rasterizar(prob, imagen.current.data);
    ctx.putImageData(imagen.current, 0, 0);
  }, [prob]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={W}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-[0.6]"
    />
  );
}

export default memo(CapaProbabilidad);
