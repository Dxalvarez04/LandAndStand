"use client";

interface Props {
  progreso: number;
  visible: boolean;
}

/**
 * PERSONA 3 · Estado del cálculo (sorteos de Monte Carlo en los Web Workers).
 * Línea fina pegada al borde superior del panel, solo mientras se calcula. No ocupa sitio: nada se
 * desplaza al arrastrar un deslizador. Sin pulsos ni degradados.
 */
export default function BarraProgreso({ progreso, visible }: Props) {
  const porcentaje = Math.round(progreso * 100);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]">
      <span role="status" aria-live="polite" className="sr-only">
        {visible ? "Calculando el escenario" : ""}
      </span>
      <div
        aria-hidden
        className={`h-full bg-[#eaf0ff] transition-[width,opacity] duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ width: `${visible ? Math.max(2, porcentaje) : 100}%` }}
      />
    </div>
  );
}
