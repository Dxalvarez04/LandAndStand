"use client";

import { useIdioma } from "@/lib/i18n";
import { TEXTO } from "./comun";

/**
 * PERSONA 3 · Créditos oficiales de datos (sección 12 de la especificación), al pie del panel.
 * La lista completa, con fichas y enlaces, está en «Fuentes» (esquina inferior derecha del mapa).
 */
export default function Creditos() {
  const { t } = useIdioma();
  return (
    <footer className={`px-4 pb-3 pt-3 text-[11.5px] leading-relaxed ${TEXTO.terciario}`}>
      <p>{t.creditos}</p>
      <p className="mt-1">NASA Space Apps Challenge 2026 · Madrid</p>
    </footer>
  );
}
