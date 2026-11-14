"use client";

/** PERSONA 3 · Barra de progreso mientras calcula. */
export default function BarraProgreso({ progreso, visible }: { progreso: number; visible: boolean }) {
  return (
    <div className={`h-1 w-full overflow-hidden rounded bg-stone-800 transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-amber-500 transition-[width]" style={{ width: `${progreso * 100}%` }} />
    </div>
  );
}
