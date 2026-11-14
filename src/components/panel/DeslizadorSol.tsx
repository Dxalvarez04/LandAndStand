"use client";

/** PERSONA 3 · Deslizador de sol (1–30). */
export default function DeslizadorSol({ sol, onChange }: { sol: number; onChange: (s: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        Sol <strong>{sol}</strong>
      </span>
      <input type="range" min={1} max={30} value={sol} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
