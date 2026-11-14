"use client";

import { useEffect, useRef, useState } from "react";
import type { Estado, MensajeDelWorker, Resultado } from "@/lib/contract";

/** Lanza el cálculo en el Web Worker cada vez que cambia `estado`. */
export function useModelo(estado: Estado) {
  const workerRef = useRef<Worker | null>(null);
  const ultimoId = useRef(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../workers/modelo.worker.ts", import.meta.url), {
      type: "module",
    });
    w.onmessage = (ev: MessageEvent<MensajeDelWorker>) => {
      const m = ev.data;
      if (m.id !== ultimoId.current) return; // respuesta de un estado ya obsoleto
      if (m.tipo === "progreso") setProgreso(m.fraccion);
      else if (m.tipo === "resultado") {
        setResultado(m.resultado);
        setCalculando(false);
      } else {
        setError(m.mensaje);
        setCalculando(false);
      }
    };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    const id = ++ultimoId.current;
    setCalculando(true);
    setProgreso(0);
    setError(null);
    w.postMessage({ tipo: "calcular", id, estado });
  }, [estado]);

  return { resultado, progreso, calculando, error };
}
