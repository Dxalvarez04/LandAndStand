"use client";

/**
 * Anima la malla de probabilidad entre el resultado anterior y el nuevo, para que al mover
 * el sol la zona alcanzable «crezca» en vez de saltar. Si llega otro resultado a mitad
 * de la animación, parte del fotograma que se está viendo. Respeta prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import { easeCubicInOut } from "d3-ease";

export const DURACION_MS = 550;

function prefiereSinMovimiento() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useTransicion(destino: Float32Array | null) {
  const [fotograma, setFotograma] = useState<Float32Array | null>(null);
  const [animando, setAnimando] = useState(false);
  const actual = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!destino) return;
    const desde = actual.current ?? new Float32Array(destino.length); // la primera vez crece desde 0
    const pintar = (f: Float32Array) => {
      actual.current = f;
      setFotograma(f);
    };

    if (prefiereSinMovimiento() || desde.length !== destino.length) {
      pintar(destino);
      setAnimando(false);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const origen = desde.slice();
    setAnimando(true);
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / DURACION_MS);
      if (t >= 1) {
        pintar(destino);
        setAnimando(false);
        return;
      }
      const e = easeCubicInOut(t);
      const f = new Float32Array(destino.length);
      for (let i = 0; i < f.length; i++) f[i] = origen[i] + (destino[i] - origen[i]) * e;
      pintar(f);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino]);

  return { fotograma, animando };
}
