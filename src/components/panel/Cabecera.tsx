"use client";

import { colorViridis } from "@/lib/mapa/viridis";
import { useIdioma } from "@/lib/i18n";
import { BORDE, MARGEN, TEXTO } from "./comun";

/** La misma escala de color que la clave del mapa, en pequeño: ata la frase al mapa. */
const ESCALA = `linear-gradient(90deg, ${[0.02, 0.25, 0.5, 0.75, 1].map((v) => colorViridis(v)).join(", ")})`;

/**
 * PERSONA 3 · Cabecera del panel: qué es y cómo se lee con el mapa. Lo que sigue (qué sol, quién
 * sale, a qué ritmo) define la salida; el mapa y la lista de destinos responden.
 */
export default function Cabecera() {
  const { t } = useIdioma();
  return (
    <header className={`border-b ${BORDE} ${MARGEN} pb-2.5 pt-3`}>
      <h1 className="flex items-center gap-2.5 text-[17px] font-medium leading-6 text-[#eaf0ff]">
        {t.panelTitulo}
        <span aria-hidden className="h-[5px] w-9 rounded-[1px]" style={{ background: ESCALA }} />
      </h1>
      <p className={`mt-0.5 text-[12.5px] leading-snug ${TEXTO.secundario}`}>{t.panelAyuda}</p>
    </header>
  );
}
