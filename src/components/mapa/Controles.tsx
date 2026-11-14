"use client";

/** Zoom (arriba a la derecha). «Zona de estudio» vuelve al encuadre inicial cuando se ha movido. Botones de 44 px. */
import { useIdioma } from "@/lib/i18n";
import SelectorIdioma from "@/components/SelectorIdioma";

interface Props {
  onAcercar: () => void;
  onAlejar: () => void;
  onVerTodo: () => void;
  /** La vista no es la inicial (zoom o desplazamiento) */
  movido: boolean;
  puedeAcercar: boolean;
  puedeAlejar: boolean;
}

const boton =
  "flex h-11 w-11 items-center justify-center text-[#eaf0ff] transition-colors hover:bg-white/[0.06] active:bg-white/10 disabled:text-[#8d9cc2]/40 disabled:hover:bg-transparent outline-none focus-visible:bg-white/10";

export default function Controles({ onAcercar, onAlejar, onVerTodo, movido, puedeAcercar, puedeAlejar }: Props) {
  const { t: TEXTOS } = useIdioma();
  return (
    <div
      data-no-zoom
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 [@media(max-height:500px)]:hidden"
    >
      <div className="flex flex-col divide-y divide-[#a0beff]/[0.12] overflow-hidden rounded-md bg-[#060a17]/90">
        <button type="button" className={boton} onClick={onAcercar} aria-label={TEXTOS.acercar} title={TEXTOS.acercar} disabled={!puedeAcercar}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M7 1.5v11M1.5 7h11" />
          </svg>
        </button>
        <button type="button" className={boton} onClick={onAlejar} aria-label={TEXTOS.alejar} title={TEXTOS.alejar} disabled={!puedeAlejar}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M1.5 7h11" />
          </svg>
        </button>
      </div>
      {movido && (
        <button
          type="button"
          onClick={onVerTodo}
          className="h-9 rounded-md bg-[#060a17]/90 px-3 text-[13px] text-[#eaf0ff] hover:bg-[#0b1226] outline-none focus-visible:ring-1 focus-visible:ring-white/60"
        >
          {TEXTOS.zonaEstudio}
        </button>
      )}
      <SelectorIdioma />
    </div>
  );
}
