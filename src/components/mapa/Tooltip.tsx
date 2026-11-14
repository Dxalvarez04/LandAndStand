"use client";

/** Al pasar el ratón: probabilidad de la celda en palabras y número. */
import { franjaDe, pct } from "@/lib/mapa/textos";

export default function Tooltip({ x, y, p, ancho }: { x: number; y: number; p: number; ancho: number }) {
  const f = franjaDe(p);
  const izquierda = x > ancho - 200; // dar la vuelta cerca del borde derecho
  return (
    <div
      className="pointer-events-none absolute z-20 whitespace-nowrap rounded bg-[#060a17]/95 px-2 py-1 text-[13px] text-[#eaf0ff]"
      style={{ left: x, top: y, transform: `translate(${izquierda ? "calc(-100% - 14px)" : "14px"}, 14px)` }}
    >
      {f.nombre}
      {f.id !== "fuera" && <span className="ml-1.5 font-light tabular-nums text-[#b9c6e6]">{pct(p)}</span>}
    </div>
  );
}
