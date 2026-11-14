import { describe, expect, it } from "vitest";
import { N } from "@/lib/constants";
import { DESTINOS, DESTINOS_MISION, HABITAT_CELDA, distanciaDesdeHabitatKm, kmACelda } from "./targets";

describe("destinos de la misión y puntos de referencia", () => {
  it("los destinos propuestos (M1–M6) tienen ids únicos y están dentro de la zona de estudio", () => {
    expect(DESTINOS_MISION.map((d) => d.id)).toEqual(["M1", "M2", "M3", "M4", "M5", "M6"]);
    for (const d of DESTINOS_MISION) {
      expect(d.propuesto).toBe(true);
      expect(d.fila).toBeGreaterThanOrEqual(0);
      expect(d.fila).toBeLessThan(N);
      expect(d.columna).toBeGreaterThanOrEqual(0);
      expect(d.columna).toBeLessThan(N);
      expect(d.tareas.length).toBeGreaterThan(0);
      expect(d.contexto).toBeTruthy();
    }
  });

  it("no coinciden con los puntos de referencia de Curiosity ni con el hábitat", () => {
    const referencias = DESTINOS.map((t) => kmACelda(t.northKm, t.eastKm));
    for (const d of DESTINOS_MISION) {
      expect(d.fila === HABITAT_CELDA.fila && d.columna === HABITAT_CELDA.columna).toBe(false);
      for (const r of referencias) {
        // al menos ~0,3 km de cualquier referencia
        expect(Math.hypot(d.fila - r.fila, d.columna - r.columna)).toBeGreaterThan(9);
      }
    }
  });

  it("cubren distancias cortas y largas desde el hábitat", () => {
    const km = DESTINOS_MISION.map((d) => distanciaDesdeHabitatKm(d.fila, d.columna));
    expect(Math.min(...km)).toBeLessThan(0.8);
    expect(Math.max(...km)).toBeGreaterThan(1.5);
  });
});
