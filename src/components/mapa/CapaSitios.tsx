"use client";

/**
 * Hábitat (triángulo), destinos de la misión (punto los propuestos, rombo los añadidos) y puntos de
 * referencia T1–T6 de Curiosity (anillo hueco, texto más apagado). Tamaño constante con el zoom.
 * Al llegar al 50 % un destino de la misión pasa a ámbar: es el único significado de ese color
 * (las referencias no lo usan: no son metas, solo orientan).
 */
import type { IdDestino } from "@/lib/contract";
import { DESTINOS, HABITAT, kmACelda, type DestinoMision } from "@/lib/data/targets";
import type { Celda } from "@/lib/mapa/geo";
import { celdaAMundo, CELDA_HABITAT, type Punto } from "@/lib/mapa/geo";
import { pct } from "@/lib/mapa/textos";
import { CIFRA } from "./fuente";

/** Hacia dónde va la etiqueta de cada sitio para que no se pisen (T3–T6 están juntos). */
const LADO: Record<string, "arriba" | "abajo" | "izq" | "der"> = {
  H: "arriba",
  T1: "abajo",
  T2: "izq",
  T3: "izq",
  T4: "der",
  T5: "abajo",
  T6: "der",
  M3: "izq", // junto a T3
};

const POS_ETIQUETA = {
  arriba: "bottom-full left-1/2 -translate-x-1/2 mb-0.5",
  abajo: "top-full left-1/2 -translate-x-1/2 -mt-2",
  izq: "right-full top-1/2 -translate-y-1/2 -mr-2",
  der: "left-full top-1/2 -translate-y-1/2 -ml-2",
};

/** Halo oscuro para leer el texto sobre viridis y sobre la imagen, sin caja. */
const SOMBRA = "[text-shadow:0_0_2px_rgba(6,10,23,1),0_0_4px_rgba(6,10,23,1),0_0_8px_rgba(6,10,23,0.8)]";

interface Props {
  aPantalla: (p: Punto) => Punto;
  probDe: (id: IdDestino) => number | undefined;
  seleccionado: IdDestino | null;
  compacto: boolean;
  /** Ancho de la ventana en píxeles, para que las etiquetas no se salgan por los bordes */
  tam: number;
  onElegir: (id: IdDestino) => void;
  /** Destinos de la misión (M1…, P1…) */
  mision?: DestinoMision[];
  probCelda?: (c: Celda) => number | undefined;
  misionSel?: string | null;
  onElegirMision?: (id: string) => void;
}

function ladoQueCabe(lado: keyof typeof POS_ETIQUETA, x: number, tam: number, ancho: number) {
  if (lado === "izq" && x - ancho < 4) return "arriba";
  if (lado === "der" && x + ancho > tam - 4) return "abajo";
  return lado;
}

export const celdaDestino = (id: IdDestino) => {
  const t = DESTINOS.find((d) => d.id === id)!;
  return kmACelda(t.northKm, t.eastKm);
};

export default function CapaSitios({
  aPantalla,
  probDe,
  seleccionado,
  compacto,
  tam,
  onElegir,
  mision = [],
  probCelda,
  misionSel = null,
  onElegirMision,
}: Props) {
  const h = aPantalla(celdaAMundo(CELDA_HABITAT));
  return (
    <div className="pointer-events-none absolute inset-0 z-[6]">
      {/* Hábitat */}
      <div className="absolute" style={{ left: h.x, top: h.y }}>
        <div className="relative -translate-x-1/2 -translate-y-[60%]">
          <svg width={16} height={14} viewBox="0 0 16 14" aria-hidden>
            <path d="M8 1 L15 13 L1 13 Z" fill="#fff" stroke="#060a17" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
          <span className={`absolute whitespace-nowrap ${POS_ETIQUETA[LADO.H]} text-[13px] font-medium text-white ${SOMBRA}`}>
            {HABITAT.nombre}
          </span>
        </div>
      </div>

      {DESTINOS.map((t) => {
        const p = aPantalla(celdaAMundo(celdaDestino(t.id)));
        const prob = probDe(t.id);
        const activo = seleccionado === t.id;
        const anchoEtiqueta = (compacto ? 3 : t.nombre.length) * 7.5 + 44; // aproximado
        const lado = ladoQueCabe(LADO[t.id], p.x, tam, anchoEtiqueta);
        return (
          <div key={t.id} className="absolute" style={{ left: p.x, top: p.y }}>
            <button
              type="button"
              data-no-zoom
              onClick={(e) => {
                e.stopPropagation();
                onElegir(t.id);
              }}
              aria-label={`${t.nombre}: ${prob !== undefined ? pct(prob) : "sin datos"}`}
              aria-pressed={activo}
              className="pointer-events-auto relative flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-white/80"
            >
              <MarcaReferencia activo={activo} />
              <span className={`absolute ${POS_ETIQUETA[lado]} flex items-baseline gap-1.5 whitespace-nowrap text-[12.5px] leading-tight text-[#d9dfee] ${SOMBRA}`}>
                <span>{compacto ? t.id : t.nombre}</span>
                <span className={`${CIFRA} text-[11.5px] text-[#b9c6e6]`}>{prob !== undefined ? pct(prob) : "—"}</span>
              </span>
            </button>
          </div>
        );
      })}

      {/* Destinos de la misión */}
      {mision.map((d) => {
        const p = aPantalla(celdaAMundo({ fila: d.fila, columna: d.columna }));
        const prob = probCelda?.({ fila: d.fila, columna: d.columna });
        const alcance = prob !== undefined && prob >= 0.5;
        const activo = misionSel === d.id;
        const anchoEtiqueta = (compacto ? 3 : d.nombre.length + 4) * 7.5 + 44;
        const lado = ladoQueCabe(LADO[d.id] ?? "der", p.x, tam, anchoEtiqueta);
        return (
          <div key={d.id} className="absolute" style={{ left: p.x, top: p.y }}>
            <button
              type="button"
              data-no-zoom
              onClick={(e) => {
                e.stopPropagation();
                onElegirMision?.(d.id);
              }}
              aria-label={`${d.id} ${d.nombre}: ${prob !== undefined ? pct(prob) : "sin datos"}`}
              aria-pressed={activo}
              className="pointer-events-auto relative flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-white/80"
            >
              {d.propuesto ? (
                <span
                  className={`h-2.5 w-2.5 rounded-full border-2 border-[#060a17] transition-colors duration-500 ${alcance ? "bg-[#ffcf70]" : "bg-white"} ${activo ? "ring-2 ring-[#ff8fd8]" : ""}`}
                />
              ) : (
                <span
                  className={`h-2.5 w-2.5 rotate-45 border-2 border-[#060a17] transition-colors duration-500 ${alcance ? "bg-[#ffcf70]" : "bg-white"} ${activo ? "ring-2 ring-[#ff8fd8]" : ""}`}
                />
              )}
              <span className={`absolute ${POS_ETIQUETA[lado]} flex items-baseline gap-1.5 whitespace-nowrap text-[13px] leading-tight text-white ${SOMBRA}`}>
                <span className={`${CIFRA} text-[11.5px] text-[#b9c6e6]`}>{d.id}</span>
                {!compacto && <span>{d.nombre}</span>}
                <span className={`${CIFRA} text-[12px] transition-colors duration-500 ${alcance ? "text-[#ffcf70]" : "text-[#b9c6e6]"}`}>
                  {prob !== undefined ? pct(prob) : "—"}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Punto de referencia: anillo hueco con un punto (no es un destino de la misión). */
export function MarcaReferencia({ activo = false, tam = 12 }: { activo?: boolean; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="-6 -6 12 12" aria-hidden className="shrink-0 overflow-visible">
      {activo && <circle r="7" fill="none" stroke="#ff8fd8" strokeWidth="2" />}
      <circle r="4.2" fill="rgba(6,10,23,0.55)" stroke="#060a17" strokeWidth="3" />
      <circle r="4.2" fill="none" stroke="#eaf0ff" strokeWidth="1.4" />
      <circle r="1.3" fill="#eaf0ff" />
    </svg>
  );
}
