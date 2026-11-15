"use client";

import { useIdioma } from "@/lib/i18n";
import { MARGEN, TEXTO } from "./comun";

/**
 * PERSONA 3 · Créditos oficiales de datos (sección 12 de la especificación), al pie del panel y en
 * pequeño. La lista completa, con fichas y enlaces, está en «Fuentes» (esquina inferior derecha del mapa).
 */
export default function Creditos() {
  const { t } = useIdioma();
  return (
    <footer className={`${MARGEN} pb-2.5 pt-2.5 text-[11px] leading-[1.4] ${TEXTO.terciario}`}>
      {/* En ancho, todo seguido en dos líneas; en estrecho, el evento en su propia línea */}
      <p>
        {t.creditos}
        <span className="hidden @[400px]:inline"> · </span>
        <span className="block whitespace-nowrap @[400px]:inline">{t.evento}</span>
      </p>
    </footer>
  );
}
