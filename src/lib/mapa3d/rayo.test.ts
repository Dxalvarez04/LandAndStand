import { describe, expect, it } from "vitest";
import { X0, Y0 } from "@/lib/constants";
import { alturaEn, type Alturas } from "./alturas";
import { aEscena, deEscena } from "./coordenadas";
import { cortarRelieve } from "./rayo";

/** Rejilla de 200 × 200 px de 16 m alrededor de la zona de estudio, con la altura que se pida. */
function rejilla(altura: (este: number, norte: number) => number): Alturas {
  const ancho = 200;
  const mPx = 16;
  const caja: Alturas["caja"] = [X0 - 600, Y0 - 600, X0 - 600 + ancho * mPx, Y0 - 600 + ancho * mPx];
  const datos = new Float32Array(ancho * ancho);
  for (let f = 0; f < ancho; f++)
    for (let c = 0; c < ancho; c++) datos[f * ancho + c] = altura(caja[0] + (c + 0.5) * mPx, caja[3] - (f + 0.5) * mPx);
  let zmin = Infinity;
  let zmax = -Infinity;
  for (const v of datos) {
    zmin = Math.min(zmin, v);
    zmax = Math.max(zmax, v);
  }
  return { ancho, alto: ancho, mPx, caja, zmin, zmax, datos };
}

const norm = (x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l };
};

describe("corte de un rayo con el relieve", () => {
  it("en un llano, un rayo vertical corta a la altura del suelo", () => {
    const a = rejilla(() => -4000);
    const zRef = -4100; // el suelo queda en y = 100
    const p = aEscena(X0 + 1000, Y0 + 1000);
    const t = cortarRelieve(a, zRef, { x: p.x, y: 900, z: p.z }, { x: 0, y: -1, z: 0 });
    expect(t).toBeCloseTo(800, 3);
  });

  it("en una ladera, el punto de corte está sobre el suelo (rayo oblicuo)", () => {
    const a = rejilla((este) => -4000 + (este - X0) * 0.3);
    const o = { ...aEscena(X0 + 300, Y0 + 200), y: 1500 };
    const o3 = { x: o.x, y: o.y, z: o.z };
    const d = norm(0.6, -0.5, -0.4);
    const t = cortarRelieve(a, -4000, o3, d)!;
    expect(t).not.toBeNull();
    const px = o3.x + d.x * t;
    const py = o3.y + d.y * t;
    const pz = o3.z + d.z * t;
    const { este, norte } = deEscena(px, pz);
    expect(py).toBeCloseTo(alturaEn(a, este, norte) + 4000, 1);
  });

  it("no corta si el rayo pasa por encima o mira hacia arriba", () => {
    const a = rejilla(() => -4000);
    const p = aEscena(X0 + 1000, Y0 + 1000);
    expect(cortarRelieve(a, -4000, { x: p.x, y: 50, z: p.z }, norm(1, 0.2, 0))).toBeNull();
    expect(cortarRelieve(a, -4000, { x: p.x, y: 50, z: p.z }, { x: 0, y: 1, z: 0 })).toBeNull();
  });

  it("respeta el alcance máximo", () => {
    const a = rejilla(() => -4000);
    const p = aEscena(X0 + 1000, Y0 + 1000);
    expect(cortarRelieve(a, -4000, { x: p.x, y: 500, z: p.z }, { x: 0, y: -1, z: 0 }, 0, 400)).toBeNull();
  });

  it("desde bajo el suelo solo cuenta la siguiente entrada desde arriba", () => {
    // Una cresta de 300 m en este = X0 + 1500
    const a = rejilla((este) => -4000 + Math.max(0, 300 - Math.abs(este - (X0 + 1500))));
    const o = aEscena(X0 + 200, Y0 + 1000);
    // Empieza 20 m bajo el llano y sube un poco: sale al aire y choca con la cresta
    const d = norm(1, 0.05, 0);
    const t = cortarRelieve(a, -4000, { x: o.x, y: -20, z: o.z }, d)!;
    expect(t).not.toBeNull();
    const x = o.x + d.x * t;
    expect(deEscena(x, o.z).este).toBeGreaterThan(X0 + 1200);
    expect(deEscena(x, o.z).este).toBeLessThan(X0 + 1500);
  });
});
