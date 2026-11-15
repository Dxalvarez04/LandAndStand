"use client";

import type { FWalk } from "@/lib/contract";
import { useIdioma } from "@/lib/i18n";
import { CIFRA, Deslizador, Seccion, TEXTO } from "./comun";

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
 * PERSONA 3 · Tercera pregunta de la salida: a qué ritmo. Es la fracción de la capacidad aeróbica
 * del día (VO₂ máx) que se mantiene al andar, en pasos de 5 % entre el 30 y el 50 %. Si llega "U"
 * (rango por defecto), se muestra el 35 %. A más ritmo se camina más deprisa y se llega más lejos;
 * del 30 al 40 % es lo que se sostiene durante toda una salida y el 50 % es una prueba de estrés
 * (docs/es/informe_tecnico.md, «La intensidad de marcha como decisión»).
 */
export default function SelectorEscenario({ fwalk, onFwalk }: Props) {
  const indiceActual = OPCIONES_INTENSIDAD.findIndex((o) => o.valor === fwalk);
  const indice = indiceActual >= 0 ? indiceActual : 1;
  const opcionActiva = OPCIONES_INTENSIDAD[indice];
  const { t, pctEntero } = useIdioma();
  const etiquetaActiva = pctEntero(opcionActiva.porcentaje);
  const ultimo = OPCIONES_INTENSIDAD.length - 1;

  return (
    <Seccion
      id="titulo-intensidad"
      titulo={t.intensidadPregunta}
      ayuda={t.intensidadAyuda}
      valor={
        <span className={`min-w-0 text-right text-[12px] leading-tight ${TEXTO.terciario}`}>
          <span className={`${CIFRA} mr-1.5 text-[15px] text-[#eaf0ff]`}>{etiquetaActiva}</span>
          {t.intensidadUnidad}
        </span>
      }
    >
      <Deslizador
        min={0}
        max={ultimo}
        valor={indice}
        onCambio={(i) => onFwalk(OPCIONES_INTENSIDAD[i].valor)}
        marcas={OPCIONES_INTENSIDAD.map((o, i) => ({
          v: i,
          texto: String(o.porcentaje),
          nota: i === 0 ? t.ritmoSuave : i === ultimo ? t.ritmoExigente : undefined,
        }))}
        etiqueta={t.intensidadTitulo}
        textoValor={t.intensidadValor(etiquetaActiva)}
      />
    </Seccion>
  );
}
