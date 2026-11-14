/**
 * Clave del mapa (abajo a la izquierda): qué significa el color (barra proporcional del 2 % al 100 %,
 * con las marcas del 50 % y el 90 % dibujadas como los contornos) y las dos marcas de sitio: destino
 * de la misión (punto; rombo si lo añadió la tripulación) y punto de referencia de Curiosity (anillo).
 */
import { colorViridis } from "@/lib/mapa/viridis";
import { PROB_MIN_VISIBLE } from "@/lib/constants";
import { COLOR_CONTORNO } from "./CapaContornos";
import { MarcaReferencia } from "./CapaSitios";
import { CIFRA } from "./fuente";
import { useIdioma } from "@/lib/i18n";

const pos = (p: number) => `${((p - PROB_MIN_VISIBLE) / (1 - PROB_MIN_VISIBLE)) * 100}%`;
const GRAD = `linear-gradient(90deg, ${[0.02, 0.25, 0.5, 0.75, 1].map((v) => colorViridis(v)).join(", ")})`;

export default function Clave() {
  const { t, pctEntero } = useIdioma();
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 w-[13.5rem] rounded-md bg-[#060a17]/90 px-3 pb-2 pt-2.5 max-sm:w-[11rem] [@media(max-height:500px)]:hidden">
      <p className="text-[12.5px] leading-tight text-[#b9c6e6]">{t.leyendaTitulo}</p>
      <div className="relative mt-2 h-1.5 rounded-sm" style={{ background: GRAD }}>
        {[0.5, 0.9].map((u) => (
          <span key={u} className="absolute -top-1 h-3.5 w-[2px] -translate-x-1/2" style={{ left: pos(u), background: COLOR_CONTORNO[u] }} />
        ))}
      </div>
      <div className={`${CIFRA} relative mt-1 h-4 whitespace-nowrap text-[11px] text-[#8d9cc2]`}>
        <span className="absolute left-0">{pctEntero(2)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(0.5) }}>{pctEntero(50)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(0.9) }}>{pctEntero(90)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 border-t border-[#a0beff]/[0.12] pt-1.5 text-[11.5px] leading-none text-[#b9c6e6]">
        <span className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden>
            <circle r="4.2" fill="#eaf0ff" stroke="#060a17" strokeWidth="1.4" />
          </svg>
          {t.leyendaDestino}
        </span>
        <span className="flex items-center gap-1.5">
          <MarcaReferencia tam={11} />
          {t.leyendaReferencia}
        </span>
      </div>
    </div>
  );
}
