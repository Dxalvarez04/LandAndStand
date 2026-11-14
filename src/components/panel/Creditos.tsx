"use client";

/**
 * PERSONA 3 · Créditos oficiales de datos (sección 12 de la especificación).
 * Formato compacto para encajar perfectamente en la pantalla sin scroll.
 */
export default function Creditos() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-[10px] text-stone-500">
      <div className="flex items-center gap-3">
        <span><strong>Terreno:</strong> USGS Astrogeology DEM 1 m</span>
        <span>•</span>
        <span><strong>Imagen:</strong> HiRISE (NASA/JPL/Univ. Arizona)</span>
        <span>•</span>
        <span><strong>Telemetría:</strong> Curiosity MSL</span>
      </div>
      <span className="font-mono text-stone-600">NASA Space Apps Challenge 2026</span>
    </div>
  );
}
