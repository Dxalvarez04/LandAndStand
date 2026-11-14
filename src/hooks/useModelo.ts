"use client";

/**
 * Lanza el cálculo cada vez que cambia `estado`, repartido entre varios Web Workers: cada uno suma
 * su tramo de los sorteos del Monte Carlo y aquí se juntan los conteos (el resultado es idéntico al
 * de un solo worker). Un estado nuevo deja obsoleto el cálculo en curso: los workers lo abandonan
 * y solo responden por el último, así que arrastrar un deslizador no acumula cálculos en cola.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Estado, MensajeDelWorker, Resultado, Ruta } from "@/lib/contract";
import { N } from "@/lib/constants";
import { combinar, tramo } from "@/lib/model/montecarlo";

/** Workers en paralelo: deja hilos libres para la página y el mapa 3D. */
function tamanoPool() {
  const nucleos = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2;
  return Math.max(1, Math.min(6, nucleos - 2));
}

interface Trabajo {
  id: number;
  conteo: Int32Array;
  total: number;
  /** Partes que aún no han enviado su conteo */
  pendientes: number;
  /** Sorteos hechos por cada parte */
  hechos: number[];
  elevacion?: Float32Array;
}

export function useModelo(estado: Estado) {
  const poolRef = useRef<Worker[]>([]);
  const trabajoRef = useRef<Trabajo | null>(null);
  const ultimoId = useRef(0);
  const rutaId = useRef(0);
  const rutasPendientes = useRef(new Map<number, (r: Ruta | null) => void>());
  const lanzarRef = useRef<((e: Estado) => void) | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pendientes = rutasPendientes.current;
    const partes = tamanoPool();
    const pool: Worker[] = [];
    let progresoMostrado = 0;

    const fallo = (mensaje: string) => {
      trabajoRef.current = null;
      setError(mensaje);
      setCalculando(false);
    };

    for (let parte = 0; parte < partes; parte++) {
      const w = new Worker(new URL("../workers/modelo.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (ev: MessageEvent<MensajeDelWorker>) => {
        const m = ev.data;
        if (m.tipo === "ruta") {
          pendientes.get(m.id)?.(m.ruta);
          pendientes.delete(m.id);
          return;
        }
        const t = trabajoRef.current;
        if (!t || m.id !== t.id || m.id !== ultimoId.current) return; // respuesta de un estado ya obsoleto
        if (m.tipo === "error") return fallo(m.mensaje);
        if (m.tipo === "avance") t.hechos[parte] = m.hechos;
        else if (m.tipo === "conteo") {
          for (let c = 0; c < t.conteo.length; c++) t.conteo[c] += m.conteo[c];
          const [desde, hasta] = tramo(m.total, parte, partes);
          t.hechos[parte] = hasta - desde;
          t.total = m.total;
          if (m.elevacion) t.elevacion = m.elevacion;
          if (--t.pendientes === 0) {
            trabajoRef.current = null;
            setResultado({ ...combinar(t.conteo, t.total), elevacion: t.elevacion });
            setCalculando(false);
            return;
          }
        } else return;
        // Progreso: sin re-renderizar la página por cada aviso de cada worker
        const fraccion = t.hechos.reduce((a, b) => a + b, 0) / m.total;
        if (fraccion - progresoMostrado >= 0.04 || fraccion < progresoMostrado) {
          progresoMostrado = fraccion;
          setProgreso(fraccion);
        }
      };
      w.onerror = (e) => {
        e.preventDefault();
        console.error("[modelo] worker:", e.message);
        fallo("No se pudo calcular el escenario. Recarga la página.");
      };
      pool.push(w);
    }
    poolRef.current = pool;

    // Nuevo cálculo: avisa a todos los workers (cada uno abandona el que tenga en curso)
    const lanzar = (e: Estado) => {
      const id = ++ultimoId.current;
      trabajoRef.current = { id, conteo: new Int32Array(N * N), total: 0, pendientes: partes, hechos: new Array(partes).fill(0) };
      progresoMostrado = 0;
      pool.forEach((w, parte) => w.postMessage({ tipo: "contar", id, estado: e, parte, partes }));
    };
    lanzarRef.current = lanzar;

    return () => {
      lanzarRef.current = null;
      poolRef.current = [];
      trabajoRef.current = null;
      pool.forEach((w) => w.terminate());
      pendientes.forEach((resolver) => resolver(null));
      pendientes.clear();
    };
  }, []);

  // Solo se recalcula si el estado cambia de verdad (no por un objeto nuevo con los mismos valores)
  const clave = JSON.stringify(estado);
  const [claveCalculada, setClaveCalculada] = useState<string | null>(null);
  if (clave !== claveCalculada) {
    setClaveCalculada(clave);
    setCalculando(true);
    setProgreso(0);
    setError(null);
  }
  useEffect(() => {
    lanzarRef.current?.(JSON.parse(clave) as Estado);
  }, [clave]);

  /** Ruta ilustrativa de ida y vuelta hasta `celda` (índice fila·110+columna) con el estado actual. */
  const pedirRuta = useCallback(
    (celda: number): Promise<Ruta | null> => {
      const w = poolRef.current[0];
      if (!w) return Promise.resolve(null);
      const id = ++rutaId.current;
      return new Promise((resolver) => {
        rutasPendientes.current.set(id, resolver);
        w.postMessage({ tipo: "ruta", id, estado: JSON.parse(clave) as Estado, celda });
      });
    },
    [clave],
  );

  return { resultado, progreso, calculando, error, pedirRuta };
}
