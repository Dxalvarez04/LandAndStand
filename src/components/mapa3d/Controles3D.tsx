"use client";

/**
 * Controles del mapa 3D (arriba a la derecha), mismo estilo que el 2D: bloques sólidos, 44 px.
 *   + / −              acercar y alejar
 *   3D | Cenital       vista oblicua o desde arriba con el norte arriba (como un plano)
 * El relieve se ve siempre a escala real.
 * «Volver al globo» va aparte, arriba a la izquierda. La tecla 0 vuelve a encuadrar la zona.
 * En pantallas estrechas (compacto) no hay + / − (se usa el pellizco).
 */
import { TEXTOS } from "@/lib/mapa/textos";
import type { Vista } from "./EscenaTerreno";

interface Props {
  onAcercar: () => void;
  onAlejar: () => void;
  vista: Vista;
  onVista: (v: Vista) => void;
  compacto?: boolean;
}

const boton =
  "flex h-11 w-11 items-center justify-center text-[#eaf0ff] transition-colors hover:bg-white/[0.06] active:bg-white/10 outline-none focus-visible:bg-white/10";
const bloque = "overflow-hidden rounded-md bg-[#060a17]/90";

function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { v: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`flex ${bloque}`}>
      {opciones.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={valor === o.v}
          onClick={() => onCambio(o.v)}
          className={`h-9 px-3 text-[13px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60 ${
            valor === o.v ? "bg-[#eaf0ff] text-[#060a17]" : "text-[#eaf0ff] hover:bg-white/[0.06]"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export default function Controles3D({ onAcercar, onAlejar, vista, onVista, compacto = false }: Props) {
  return (
    <div
      data-no-zoom
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-col items-end gap-2 [@media(max-height:500px)]:gap-1"
    >
      <div className={`flex flex-col divide-y divide-[#a0beff]/[0.12] ${bloque} ${compacto ? "hidden" : ""} [@media(max-height:500px)]:hidden`}>
        <button type="button" className={boton} onClick={onAcercar} aria-label={TEXTOS.acercar} title={TEXTOS.acercar}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M7 1.5v11M1.5 7h11" />
          </svg>
        </button>
        <button type="button" className={boton} onClick={onAlejar} aria-label={TEXTOS.alejar} title={TEXTOS.alejar}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M1.5 7h11" />
          </svg>
        </button>
      </div>
      <Segmentado
        etiqueta="Vista"
        valor={vista}
        onCambio={onVista}
        opciones={[
          { v: "3d", texto: "3D" },
          { v: "cenital", texto: "Cenital" },
        ]}
      />
    </div>
  );
}
