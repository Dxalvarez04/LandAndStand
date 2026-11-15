import { describe, expect, it } from "vitest";
import { frenar, lanzar, pendiente, PENDIENTE_MAX, puente, TRANSITO } from "./transito";

const derivada = (f: (k: number) => number, k: number, h = 1e-5) => (f(k + h) - f(k - h)) / (2 * h);

describe("frenar y lanzar", () => {
  it("van de 0 a 1 con la pendiente pedida en el extremo que toca y nula en el otro", () => {
    for (const m of [0, 0.6, 1.3, PENDIENTE_MAX]) {
      expect(frenar(0, m)).toBeCloseTo(0, 9);
      expect(frenar(1, m)).toBeCloseTo(1, 9);
      expect(derivada((k) => frenar(k, m), 1e-5)).toBeCloseTo(m, 3);
      expect(derivada((k) => frenar(k, m), 1 - 1e-5)).toBeCloseTo(0, 3);
      expect(lanzar(0, m)).toBeCloseTo(0, 9);
      expect(lanzar(1, m)).toBeCloseTo(1, 9);
      expect(derivada((k) => lanzar(k, m), 1e-5)).toBeCloseTo(0, 3);
      expect(derivada((k) => lanzar(k, m), 1 - 1e-5)).toBeCloseTo(m, 3);
    }
  });

  it("no retroceden ni se pasan con la pendiente máxima", () => {
    for (const m of [0, 1, PENDIENTE_MAX]) {
      let antes = 0;
      for (let i = 1; i <= 200; i++) {
        const v = frenar(i / 200, m);
        expect(v).toBeGreaterThanOrEqual(antes);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
        antes = v;
      }
    }
  });

  it("la pendiente da el ritmo pedido y se acota", () => {
    // 2,6 s para recorrer 2,6 unidades a 1,3 por segundo: pendiente 1,3
    expect(pendiente(1.3, 2600, 2.6)).toBeCloseTo(1.3, 9);
    expect(pendiente(5, 3000, 1)).toBe(PENDIENTE_MAX);
    expect(pendiente(1.3, 2000, 0)).toBe(0);
    expect(pendiente(0, 2000, 3)).toBe(0);
  });
});

describe("puente", () => {
  it("empieza al ritmo pedido, es continuo y no pasa del tope", () => {
    const r = TRANSITO.ritmo;
    expect(puente(0, r)).toEqual({ z: 0, v: r });
    expect(puente(0.1, r).z).toBeCloseTo(r * 0.1, 9);
    let antes = puente(0, r);
    for (let i = 1; i <= 400; i++) {
      const a = puente(i * 0.01, r);
      expect(a.z).toBeGreaterThan(antes.z);
      expect(a.z - antes.z).toBeLessThanOrEqual(r * 0.01 + 1e-9);
      expect(a.v).toBeLessThanOrEqual(antes.v + 1e-12);
      expect(a.z).toBeLessThan(TRANSITO.tope);
      antes = a;
    }
    // El ritmo es la derivada del zoom, también después del tramo sostenido
    expect(derivada((t) => puente(t, r).z, 0.8)).toBeCloseTo(puente(0.8, r).v, 4);
  });

  it("sin ritmo no se mueve", () => {
    expect(puente(1, 0)).toEqual({ z: 0, v: 0 });
  });
});
