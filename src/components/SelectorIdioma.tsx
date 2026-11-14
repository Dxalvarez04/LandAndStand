"use client";

/**
 * ES | EN: idioma de la interfaz. Va con los controles del mapa (arriba a la derecha) y se recuerda
 * en este navegador. Mismo estilo que el selector «3D | Cenital».
 */
import { IDIOMAS, ponerIdioma, useIdioma } from "@/lib/i18n";

const NOMBRE = { es: "Español", en: "English" } as const;

export default function SelectorIdioma({ className = "" }: { className?: string }) {
  const { idioma, t } = useIdioma();
  return (
    <div role="radiogroup" aria-label={t.idioma} className={`flex overflow-hidden rounded-md bg-[#060a17]/90 ${className}`}>
      {IDIOMAS.map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          lang={i}
          aria-checked={idioma === i}
          aria-label={NOMBRE[i]}
          title={NOMBRE[i]}
          onClick={() => ponerIdioma(i)}
          className={`h-9 px-3 text-[12.5px] font-medium uppercase tracking-wide outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60 ${
            idioma === i ? "bg-[#eaf0ff] text-[#060a17]" : "text-[#eaf0ff] hover:bg-white/[0.06]"
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
