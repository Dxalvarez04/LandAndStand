"use client";

/**
 * Controles del mapa 3D (arriba a la derecha), mismo estilo que el 2D: bloques sólidos, 44 px.
 *   + / −              acercar y alejar
 *   3D | Cenital       vista oblicua o desde arriba con el norte arriba (como un plano)
 *   ES | EN            idioma de la interfaz
 *   ?                  cómo moverse: los gestos del ratón (o de los dedos) y las teclas
 * El relieve se ve siempre a escala real.
 * «Volver al globo» va aparte, arriba a la izquierda. La tecla 0 vuelve a encuadrar la zona.
 * En pantallas estrechas (compacto) no hay + / − (se usa el pellizco).
 */
import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n";
import SelectorIdioma from "@/components/SelectorIdioma";
import { CIFRA } from "@/components/mapa/fuente";
import type { Vista } from "./EscenaTerreno";

interface Props {
  onAcercar: () => void;
  onAlejar: () => void;
  vista: Vista;
  onVista: (v: Vista) => void;
  compacto?: boolean;
  /** Pantalla táctil: la ayuda explica los gestos con los dedos */
  tactil?: boolean;
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

export default function Controles3D({ onAcercar, onAlejar, vista, onVista, compacto = false, tactil = false }: Props) {
  const { t } = useIdioma();
  const TEXTOS = t;
  const [ayuda, setAyuda] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  // La ayuda se cierra con Escape o al tocar fuera (por ejemplo, al empezar a mover el mapa)
  useEffect(() => {
    if (!ayuda) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAyuda(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAyuda(false);
    };
    window.addEventListener("pointerdown", fuera, true);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("pointerdown", fuera, true);
      window.removeEventListener("keydown", tecla);
    };
  }, [ayuda]);
  const gestos = tactil ? t.gestosTactil : t.gestosRaton;
  return (
    <div
      ref={raiz}
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
        etiqueta={t.vista}
        valor={vista}
        onCambio={onVista}
        opciones={[
          { v: "3d", texto: "3D" },
          { v: "cenital", texto: t.cenital },
        ]}
      />
      <SelectorIdioma />
      <div className="relative">
        <button
          type="button"
          onClick={() => setAyuda((a) => !a)}
          aria-expanded={ayuda}
          aria-controls="ayuda-gestos"
          aria-label={t.ayudaGestos}
          title={t.ayudaGestos}
          className={`flex h-9 w-9 items-center justify-center rounded-md text-[15px] font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60 ${
            ayuda ? "bg-[#eaf0ff] text-[#060a17]" : "bg-[#060a17]/90 text-[#eaf0ff] hover:bg-[#0b1226]"
          }`}
        >
          ?
        </button>
        {ayuda && (
          <div
            id="ayuda-gestos"
            role="region"
            aria-label={t.ayudaGestosTitulo}
            className="absolute right-0 top-full mt-2 w-[17.5rem] max-w-[calc(100vw-1.5rem)] rounded-md bg-[#060a17]/95 px-3.5 pb-3 pt-2.5 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-[#a0beff]/15"
          >
            <p className="text-[13px] font-medium text-[#eaf0ff]">{t.ayudaGestosTitulo}</p>
            <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
              {gestos.map(([gesto, efecto]) => (
                <div key={gesto} className="contents">
                  <dt className={`${gesto.length <= 2 ? CIFRA : ""} whitespace-nowrap text-[12.5px] text-[#eaf0ff]`}>
                    {gesto.length <= 2 ? <kbd className="rounded-[3px] border border-[#a0beff]/30 px-1.5 py-px text-[11.5px]">{gesto}</kbd> : gesto}
                  </dt>
                  <dd className="text-[12.5px] leading-snug text-[#b9c6e6]">{efecto}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
