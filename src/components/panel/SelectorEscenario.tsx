"use client";

import type { FWalk } from "@/lib/contract";
import { useIdioma } from "@/lib/i18n";
import { CIFRA, Deslizador, Seccion } from "./comun";

interface Props {
  fwalk: FWalk;
  onFwalk: (f: FWalk) => void;
}

const OPCIONES_INTENSIDAD: { valor: FWalk; porcentaje: number }[] = [
  { valor: 0.3, porcentaje: 30 },
  { valor: 0.35, porcentaje: 35 },
  { valor: 0.4, porcentaje: 40 },
  { valor: 0.45, porcentaje: 45 },
  { valor: 0.5, porcentaje: 50 },
];

/**
 * PERSONA 3 · Intensidad de la marcha: fracción del VO₂ máximo que se usa al caminar,
 * en pasos de 5 % entre el 30 y el 50 %. Si llega "U" (rango por defecto), se muestra el 35 %.
 */
export default function SelectorEscenario({ fwalk, onFwalk }: Props) {
  const indiceActual = OPCIONES_INTENSIDAD.findIndex((o) => o.valor === fwalk);
  const indice = indiceActual >= 0 ? indiceActual : 1;
  const opcionActiva = OPCIONES_INTENSIDAD[indice];
  const { t, pctEntero } = useIdioma();
  const etiquetaActiva = pctEntero(opcionActiva.porcentaje);

  return (
    <Seccion
      id="titulo-intensidad"
      titulo={t.intensidadTitulo}
      ayuda={t.intensidadAyuda}
      valor={<span className={`${CIFRA} text-[15px] text-[#eaf0ff]`}>{etiquetaActiva}</span>}
    >
      <Deslizador
        min={0}
        max={OPCIONES_INTENSIDAD.length - 1}
        valor={indice}
        onCambio={(i) => onFwalk(OPCIONES_INTENSIDAD[i].valor)}
        marcas={OPCIONES_INTENSIDAD.map((o, i) => ({ v: i, texto: String(o.porcentaje) }))}
        etiqueta={t.intensidadTitulo}
        textoValor={etiquetaActiva}
      />
    </Seccion>
  );
}
