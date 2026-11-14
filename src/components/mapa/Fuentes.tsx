"use client";

/**
 * Fuentes oficiales del mapa, a pantalla completa. Se abre desde «Fuentes» (abajo a la derecha).
 * Créditos obligatorios (especificación §12), ficha de cada producto con enlace a su página oficial,
 * datos de la zona de estudio y las imágenes de Curiosity con su PIA.
 */
import { FUENTES, ZONA } from "@/lib/data/fuentes";
import { FOTOS } from "@/lib/data/fotos";
import { DESTINOS } from "@/lib/data/targets";
import { CIFRA } from "./fuente";
import { enIdioma, useIdioma } from "@/lib/i18n";

const ENLACE =
  "underline decoration-[#a0beff]/40 underline-offset-2 outline-none hover:decoration-white focus-visible:ring-1 focus-visible:ring-white/70";

export default function Fuentes({ onCerrar }: { onCerrar: () => void }) {
  const { t, idioma } = useIdioma();
  const zona = enIdioma(ZONA, idioma);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.fuentesTitulo}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCerrar();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-[#03050c] text-[#eaf0ff] outline-none"
      style={{ fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif" }}
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-[#a0beff]/15 py-2 pl-4 pr-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-medium">{t.fuentesTitulo}</h2>
          <p className="truncate text-[12px] text-[#8d9cc2]">{t.fuentesAyuda}</p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          autoFocus
          className="h-11 rounded-[3px] border border-[#a0beff]/20 px-4 text-[14px] outline-none hover:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-white/70"
        >
          {t.volverMapa}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid max-w-[1100px] gap-x-8 gap-y-6 p-4 lg:grid-cols-2 lg:p-6">
          {/* Datos */}
          <section aria-label={t.datos} className="flex flex-col">
            {FUENTES.map((original) => enIdioma(original, idioma)).map((f) => (
              <article key={f.id} className="border-b border-[#a0beff]/15 py-3 first:pt-0">
                <p className="text-[12.5px] text-[#8d9cc2]">{f.uso}</p>
                <h3 className="mt-0.5 text-[15px] font-medium leading-snug">{f.producto}</h3>
                <p className="mt-0.5 text-[12.5px] text-[#b9c6e6]">{f.autoria}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#b9c6e6]">{f.detalle}</p>
                <p className="mt-2 text-[13px]">
                  <span className="text-[#8d9cc2]">{t.credito}: </span>
                  {f.credito}
                </p>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-block text-[13px] ${ENLACE}`}>
                  {f.sitio} ↗
                </a>
              </article>
            ))}
          </section>

          <div className="flex flex-col gap-6">
            {/* Zona de estudio */}
            <section aria-label={t.zonaEstudio}>
              <h3 className="text-[15px] font-medium">{t.zonaEstudio}</h3>
              <dl className="mt-2 text-[13px]">
                {[
                  [t.lugar, zona.lugar, false],
                  [t.tamano, zona.tamano, true],
                  [t.proyeccion, zona.proyeccion, false],
                  [t.limites, zona.limites, true],
                ].map(([k, v, cifra]) => (
                  <div key={k as string} className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-[#a0beff]/10 py-1.5">
                    <dt className="text-[#8d9cc2]">{k}</dt>
                    <dd className={cifra ? `${CIFRA} text-[12.5px]` : ""}>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Imágenes de Curiosity */}
            <section aria-label={t.vioCuriosity}>
              <h3 className="text-[15px] font-medium">{t.vioCuriosity}</h3>
              <p className="mt-0.5 text-[12.5px] text-[#b9c6e6]">{t.fotosNota}</p>
              <table className="mt-2 w-full text-left text-[13px]">
                <thead className="text-[12px] text-[#8d9cc2]">
                  <tr className="border-b border-[#a0beff]/15">
                    <th className="py-1.5 pr-2 font-normal">{t.referencia}</th>
                    <th className="py-1.5 pr-2 font-normal">{t.colImagen}</th>
                    <th className="py-1.5 pr-2 font-normal">{t.colCamaraSol}</th>
                    <th className="py-1.5 font-normal">{t.credito}</th>
                  </tr>
                </thead>
                <tbody>
                  {DESTINOS.map((d) => {
                    const f = FOTOS[d.id];
                    return (
                      <tr key={d.id} className="border-b border-[#a0beff]/10 align-baseline">
                        <td className="py-1.5 pr-2">
                          <span className={`${CIFRA} text-[12px] text-[#8d9cc2]`}>{d.id}</span> {d.nombre}
                        </td>
                        <td className="py-1.5 pr-2">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className={`${CIFRA} text-[12.5px] ${ENLACE}`}>
                            {f.pia}
                          </a>
                        </td>
                        <td className={`${CIFRA} py-1.5 pr-2 text-[12.5px]`}>
                          {f.camara} · {f.sol}
                        </td>
                        <td className="py-1.5 text-[12.5px] text-[#b9c6e6]">{f.credito}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
