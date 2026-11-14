"use client";

/**
 * Piezas comunes del panel con el estilo del mapa («Apolo», ver docs/estilo_mapa.md):
 * secciones separadas por una línea fina (sin tarjetas apiladas), títulos en frase normal,
 * cifras en IBM Plex Mono y deslizadores con marcas, de 44 px de alto para el dedo.
 */
import type { ReactNode } from "react";
import { CIFRA } from "@/components/mapa/fuente";

export { CIFRA };

export const TEXTO = {
  principal: "text-[#eaf0ff]",
  secundario: "text-[#b9c6e6]",
  terciario: "text-[#8d9cc2]",
};

export const BORDE = "border-[#a0beff]/[0.14]";
export const AMBAR = "#ffcf70";

/** Número con coma decimal, como en el mapa. */
export const num = (v: number, decimales = 1) => v.toFixed(decimales).replace(".", ",");

export function Seccion({
  titulo,
  valor,
  ayuda,
  children,
  id,
}: {
  titulo: string;
  valor?: ReactNode;
  ayuda?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className={`border-b ${BORDE} px-4 py-3.5`}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[14px] font-medium text-[#eaf0ff]">
          {titulo}
        </h2>
        {valor}
      </header>
      {ayuda && <p className={`mt-0.5 text-[12px] leading-snug ${TEXTO.terciario}`}>{ayuda}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

const ANCHO_PULGAR = 12; // px

/**
 * Deslizador con pista fina, tramo recorrido en claro, marcas y etiquetas alineadas con el centro
 * real del pulgar (que viaja de ANCHO/2 a 100 % − ANCHO/2).
 */
export function Deslizador({
  min,
  max,
  valor,
  onCambio,
  marcas,
  etiqueta,
  textoValor,
}: {
  min: number;
  max: number;
  valor: number;
  onCambio: (v: number) => void;
  marcas: { v: number; texto: string }[];
  etiqueta: string;
  textoValor: string;
}) {
  const pos = (v: number) => `calc(${ANCHO_PULGAR / 2}px + ${(v - min) / (max - min)} * (100% - ${ANCHO_PULGAR}px))`;
  return (
    <div>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#a0beff]/[0.16]" />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#eaf0ff]" style={{ width: pos(valor) }} />
        {marcas.map((m) => (
          <span
            key={m.v}
            aria-hidden
            className={`absolute top-1/2 h-[9px] w-px -translate-x-1/2 -translate-y-1/2 ${m.v <= valor ? "bg-[#eaf0ff]" : "bg-[#a0beff]/40"}`}
            style={{ left: pos(m.v) }}
          />
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={valor}
          onChange={(e) => onCambio(Number(e.target.value))}
          aria-label={etiqueta}
          aria-valuetext={textoValor}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-[2px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#060a17] [&::-moz-range-thumb]:bg-[#eaf0ff] [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[2px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#060a17] [&::-webkit-slider-thumb]:bg-[#eaf0ff] [&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(255,143,216,0.55)] [&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_3px_rgba(255,143,216,0.55)]"
        />
      </div>
      <div className="relative -mt-1.5 h-4" aria-hidden>
        {marcas.map((m, i) => (
          <span
            key={m.v}
            className={`${CIFRA} absolute top-0 whitespace-nowrap text-[11px] ${m.v === valor ? "text-[#eaf0ff]" : TEXTO.terciario} ${
              i === 0 ? "" : i === marcas.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: i === 0 ? 0 : i === marcas.length - 1 ? "100%" : pos(m.v) }}
          >
            {m.texto}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Marcas de destino iguales a las del mapa: círculo (Curiosity) o rombo (añadido); ámbar si ≥ 50 %. */
export function MarcaDestino({ alcance, propio }: { alcance: boolean; propio?: boolean }) {
  const relleno = alcance ? AMBAR : "#eaf0ff";
  return (
    <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden className="shrink-0">
      {propio ? (
        <rect x="-3.6" y="-3.6" width="7.2" height="7.2" transform="rotate(45)" fill={relleno} stroke="#060a17" strokeWidth="1.3" />
      ) : (
        <circle r="4.2" fill={relleno} stroke="#060a17" strokeWidth="1.3" />
      )}
    </svg>
  );
}

export function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden
      className={`shrink-0 text-[#8d9cc2] transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
    >
      <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
