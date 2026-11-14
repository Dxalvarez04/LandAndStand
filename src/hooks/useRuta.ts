"use client";

/**
 * Ruta ilustrativa hasta la celda fijada. La pide al worker (`pedirRuta`); si el modelo
 * todavía no la calcula (devuelve null o no hay worker), usa la ruta aproximada.
 */
import { useEffect, useState } from "react";
import type { Resultado, Ruta } from "@/lib/contract";
import { CELDA_HABITAT, type Celda, indice } from "@/lib/mapa/geo";
import { rutaFalsa } from "@/lib/mapa/rutaFalsa";

export interface EstadoRuta {
  ruta: Ruta | null;
  /** true si es la ruta aproximada (no la del modelo) */
  aproximada: boolean;
  cargando: boolean;
}

interface Respuesta {
  celda: Celda;
  resultado: Resultado | null;
  ruta: Ruta | null;
  aproximada: boolean;
}

export function useRuta(
  celda: Celda | null,
  resultado: Resultado | null,
  pedirRuta?: (celda: number) => Promise<Ruta | null>,
): EstadoRuta {
  const [resp, setResp] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (!celda) return;
    let vigente = true;
    (pedirRuta ? pedirRuta(indice(celda)) : Promise.resolve(null)).then((real) => {
      if (!vigente) return;
      // Ruta vacía = el modelo dice que no hay camino; null = el modelo no calcula rutas
      const sinCamino = real !== null && real.ida.length === 0;
      const ruta = sinCamino ? null : (real ?? rutaFalsa(CELDA_HABITAT, celda, resultado?.prob ?? null));
      setResp({ celda, resultado, ruta, aproximada: !real && ruta !== null });
    });
    return () => {
      vigente = false;
    };
  }, [celda, resultado, pedirRuta]);

  // La respuesta solo vale si corresponde a la celda y al resultado actuales.
  const vale = celda !== null && resp !== null && resp.celda === celda && resp.resultado === resultado;
  if (!celda) return { ruta: null, aproximada: false, cargando: false };
  return vale
    ? { ruta: resp.ruta, aproximada: resp.aproximada, cargando: false }
    : { ruta: null, aproximada: false, cargando: true };
}
