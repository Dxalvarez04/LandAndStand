"use client";

import { useEffect, useState } from "react";
import { cargarDem, existeImagen } from "@/lib/mapa/cargarDatos";

export interface DatosMapa {
  dem: Float32Array | null;
  /** null mientras se comprueba */
  hayImagen: boolean | null;
}

/** Carga una vez los datos estáticos del mapa (DEM e imagen HiRISE). */
export function useDatosMapa(): DatosMapa {
  const [datos, setDatos] = useState<DatosMapa>({ dem: null, hayImagen: null });
  useEffect(() => {
    let vivo = true;
    Promise.all([cargarDem(), existeImagen()]).then(([dem, hayImagen]) => {
      if (vivo) setDatos({ dem, hayImagen });
    });
    return () => {
      vivo = false;
    };
  }, []);
  return datos;
}
