"use client";

/**
 * Piezas comunes del panel con el estilo del mapa («Apolo», ver docs/es/estilo_mapa.md):
 * secciones separadas por una línea fina (sin tarjetas apiladas), títulos en frase normal,
 * cifras en IBM Plex Mono y controles de 44 px de alto para el dedo.
 *
 * El panel se lee de arriba abajo en tres bloques: qué es (Cabecera), la salida que se define
 * (tres preguntas: qué sol, quién sale, a qué ritmo) y lo que el modelo responde para los destinos.
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
/** Margen lateral del panel: 16 px, y 20 px cuando la columna es ancha (≥ 400 px) */
export const MARGEN = "px-4 @[400px]:px-5";
/** Lo mismo como margen exterior (para lo que va dentro de una fila a sangre) y en negativo (para salir a sangre) */
export const MARGEN_FUERA = "mx-4 @[400px]:mx-5";
export const A_SANGRE = "-mx-4 @[400px]:-mx-5";
/**
 * Alto de los controles: 44 px para el dedo; con ratón o trackpad (puntero fino) bastan 36 px y el
 * panel cabe entero en la columna de la nave sin barra de desplazamiento.
 */
export const ALTO_CONTROL = "h-11 [@media(pointer:fine)]:h-9";
/** Anillo de foco común (el rosa es el color de la selección) */
export const FOCO = "outline-none focus-visible:ring-2 focus-visible:ring-[#ff8fd8]/70";

/**
 * Lleva un elemento a la vista dentro del panel, moviendo solo el desplazamiento interior del panel
 * (scrollIntoView movería también la página cuando el panel está escondido fuera de la pantalla).
 */
export function mostrarEnPanel(el: HTMLElement | null) {
  const caja = el?.closest<HTMLElement>("[data-panel-scroll]");
  if (!el || !caja) return;
  const r = el.getBoundingClientRect();
  const c = caja.getBoundingClientRect();
  let dy = 0;
  if (r.top < c.top + 8) dy = r.top - c.top - 8;
  else if (r.bottom > c.bottom - 8) dy = Math.min(r.top - c.top - 8, r.bottom - c.bottom + 8);
  if (dy === 0) return;
  let suave = true;
  try {
    suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    /* sin matchMedia */
  }
  caja.scrollBy({ top: dy, behavior: suave ? "smooth" : "auto" });
}

/** Número con coma decimal (español). En la interfaz se usa `num` de useIdioma(), que sigue el idioma. */
export const num = (v: number, decimales = 1) => v.toFixed(decimales).replace(".", ",");

/**
 * Una pregunta de la salida (o el bloque de destinos): título, respuesta actual a la derecha, una
 * línea que explica qué cambia en el mapa y el control.
 */
export function Seccion({
  titulo,
  valor,
  ayuda,
  children,
  id,
  className = "",
}: {
  titulo: string;
  valor?: ReactNode;
  ayuda?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`border-b ${BORDE} ${MARGEN} pb-2.5 pt-2.5 ${className}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[15px] font-medium leading-6 text-[#eaf0ff]">
          {titulo}
        </h2>
        {valor}
      </header>
      {ayuda && <p className={`text-[12px] leading-snug ${TEXTO.terciario}`}>{ayuda}</p>}
      <div className="mt-1">{children}</div>
    </section>
  );
}

const ANCHO_PULGAR = 16; // px

const PULGAR =
  "[&::-webkit-slider-thumb]:h-[24px] [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#060a17] [&::-webkit-slider-thumb]:bg-[#eaf0ff] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(6,10,23,0.6)] [&::-webkit-slider-thumb]:transition-[background-color] hover:[&::-webkit-slider-thumb]:bg-white [&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(255,143,216,0.6)] " +
  "[&::-moz-range-thumb]:h-[24px] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#060a17] [&::-moz-range-thumb]:bg-[#eaf0ff] hover:[&::-moz-range-thumb]:bg-white [&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_3px_rgba(255,143,216,0.6)] " +
  "[&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent";

function BotonPaso({ signo, onClick, deshabilitado, etiqueta }: { signo: "-" | "+"; onClick: () => void; deshabilitado: boolean; etiqueta: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex ${ALTO_CONTROL} w-10 shrink-0 items-center justify-center rounded-[3px] border ${BORDE} text-[#eaf0ff] transition-colors hover:border-[#a0beff]/35 hover:bg-white/[0.05] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#a0beff]/[0.14] disabled:hover:bg-transparent ${FOCO}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <path d={signo === "+" ? "M6 1.5v9M1.5 6h9" : "M1.5 6h9"} />
      </svg>
    </button>
  );
}

/**
 * Deslizador con pista fina, tramo recorrido en claro, marcas y etiquetas alineadas con el centro
 * real del tirador (que viaja de ANCHO/2 a 100 % − ANCHO/2). Toda la franja de 44 px responde al
 * ratón y al dedo. Con `pasos`, lleva a los lados − y + para avanzar de uno en uno.
 */
export function Deslizador({
  min,
  max,
  valor,
  onCambio,
  marcas,
  etiqueta,
  textoValor,
  pasos,
}: {
  min: number;
  max: number;
  valor: number;
  onCambio: (v: number) => void;
  /** `nota` va en texto normal junto a la cifra de un extremo («suave», «exigente») */
  marcas: { v: number; texto: string; nota?: string }[];
  etiqueta: string;
  textoValor: string;
  /** Textos de los botones − y + (si se pasan, se muestran) */
  pasos?: { menos: string; mas: string };
}) {
  const pos = (v: number) => `calc(${ANCHO_PULGAR / 2}px + ${(v - min) / (max - min)} * (100% - ${ANCHO_PULGAR}px))`;
  return (
    <div className="flex items-start gap-2">
      {pasos && <BotonPaso signo="-" etiqueta={pasos.menos} deshabilitado={valor <= min} onClick={() => onCambio(Math.max(min, valor - 1))} />}
      <div className="min-w-0 flex-1">
        <div className={`relative ${ALTO_CONTROL}`}>
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#a0beff]/[0.18]" />
          <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#eaf0ff]" style={{ width: pos(valor) }} />
          {marcas.map((m) => (
            <span
              key={m.v}
              aria-hidden
              className={`absolute top-1/2 h-[9px] w-px -translate-x-1/2 -translate-y-1/2 ${m.v <= valor ? "bg-[#eaf0ff]" : "bg-[#a0beff]/45"}`}
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
            className={`absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent outline-none ${PULGAR}`}
          />
        </div>
        <div className="relative -mt-2 h-4 [@media(pointer:fine)]:-mt-1" aria-hidden>
          {marcas.map((m, i) => {
            const primera = i === 0;
            const ultima = i === marcas.length - 1;
            return (
              <span
                key={m.v}
                className={`absolute top-0 whitespace-nowrap text-[11px] ${m.v === valor ? "text-[#eaf0ff]" : TEXTO.terciario} ${
                  primera ? "" : ultima ? "-translate-x-full" : "-translate-x-1/2"
                }`}
                style={{ left: primera ? 0 : ultima ? "100%" : pos(m.v) }}
              >
                {ultima && m.nota && <span className="mr-1.5 text-[11.5px]">{m.nota}</span>}
                <span className={CIFRA}>{m.texto}</span>
                {!ultima && m.nota && <span className="ml-1.5 text-[11.5px]">{m.nota}</span>}
              </span>
            );
          })}
        </div>
      </div>
      {pasos && <BotonPaso signo="+" etiqueta={pasos.mas} deshabilitado={valor >= max} onClick={() => onCambio(Math.min(max, valor + 1))} />}
    </div>
  );
}

/**
 * Contenido que se despliega con una transición corta de altura (rejilla 0fr → 1fr). Plegado no
 * recibe el foco ni lo leen los lectores de pantalla. Con «reducir movimiento» no hay transición.
 */
export function Despliegue({ abierto, id, children, className = "" }: { abierto: boolean; id?: string; children: ReactNode; className?: string }) {
  return (
    <div
      id={id}
      inert={!abierto}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className={`min-h-0 overflow-hidden ${className}`}>{children}</div>
    </div>
  );
}

/** Marcas de destino iguales a las del mapa: círculo (propuesto) o rombo (añadido); ámbar si ≥ 50 %. */
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

export function Chevron({ abierto, className = "" }: { abierto: boolean; className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden
      className={`shrink-0 text-[#8d9cc2] transition-transform duration-200 motion-reduce:transition-none ${abierto ? "rotate-180" : ""} ${className}`}
    >
      <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Casilla cuadrada propia (como el resto de la interfaz). Solo el dibujo: el control es de quien la usa. */
export function Casilla({ marcada, tam = 16, className = "" }: { marcada: boolean; tam?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
        marcada ? "border-[#eaf0ff] bg-[#eaf0ff]" : "border-[#a0beff]/45"
      } ${className}`}
      style={{ width: tam, height: tam }}
    >
      {marcada && (
        <svg width={tam * 0.62} height={tam * 0.62} viewBox="0 0 10 10" aria-hidden>
          <path d="M1.8 5.2 4 7.3 8.2 2.7" fill="none" stroke="#060a17" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
