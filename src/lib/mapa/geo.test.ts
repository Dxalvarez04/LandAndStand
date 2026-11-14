import { describe, expect, it } from "vitest";
import { N } from "@/lib/constants";
import { CELDA_HABITAT, celdaAMundo, distanciaM, kmAMundo, mundoACelda } from "./geo";

describe("geo: inversión de filas", () => {
  it("la fila 0 (SUR) queda abajo en pantalla y la última fila (norte) arriba", () => {
    expect(celdaAMundo({ fila: 0, columna: 0 }).y).toBeCloseTo(N - 0.5);
    expect(celdaAMundo({ fila: N - 1, columna: 0 }).y).toBeCloseTo(0.5);
  });

  it("el hábitat es la celda (84, 42) y queda en el tercio norte", () => {
    expect(CELDA_HABITAT).toEqual({ fila: 84, columna: 42 });
    const p = celdaAMundo(CELDA_HABITAT);
    expect(p).toEqual({ x: 42.5, y: N - 84.5 });
    expect(p.y).toBeLessThan(N / 3);
  });

  it("celda → mundo → celda es la identidad en toda la malla", () => {
    for (let fila = 0; fila < N; fila += 7)
      for (let columna = 0; columna < N; columna += 5)
        expect(mundoACelda(celdaAMundo({ fila, columna }))).toEqual({ fila, columna });
  });

  it("fuera de la ventana no hay celda", () => {
    expect(mundoACelda({ x: -0.1, y: 5 })).toBeNull();
    expect(mundoACelda({ x: 5, y: N })).toBeNull();
  });

  it("km → mundo es coherente con km → celda (truncado)", () => {
    const p = kmAMundo(2.7, 1.36);
    expect(mundoACelda(p)).toEqual({ fila: 84, columna: 42 });
  });

  it("distancia entre centros de celda en metros", () => {
    expect(distanciaM({ fila: 0, columna: 0 }, { fila: 3, columna: 4 })).toBeCloseTo(160);
  });
});
