"use client";

import { TEXTO } from "./comun";

/**
 * PERSONA 3 · Créditos oficiales de datos (sección 12 de la especificación), al pie del panel.
 * La lista completa, con fichas y enlaces, está en «Fuentes» (esquina inferior derecha del mapa).
 */
export default function Creditos() {
  return (
    <footer className={`px-4 pb-3 pt-3 text-[11.5px] leading-relaxed ${TEXTO.terciario}`}>
      <p>
        Terreno: USGS Astrogeology, DEM 1 m · Imagen: HiRISE, NASA/JPL‑Caltech/Univ. of Arizona · Posiciones y fotos: Curiosity,
        NASA/JPL‑Caltech/MSSS
      </p>
      <p className="mt-1">NASA Space Apps Challenge 2026 · Madrid</p>
    </footer>
  );
}
