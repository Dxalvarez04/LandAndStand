import { describe, expect, it } from "vitest";
import { N } from "@/lib/constants";
import { calcularContornos } from "./contornos";

function malla(f: (fila: number, col: number) => number) {
  const p = new Float32Array(N * N);
  for (let fila = 0; fila < N; fila++) for (let c = 0; c < N; c++) p[fila * N + c] = f(fila, c);
  return p;
}

const ys = (d: string) => [...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => Number(m[2]));
const xs = (d: string) => [...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => Number(m[1]));

describe("contornos", () => {
  it("una mancha en las filas del SUR da contornos en la parte de ABAJO del mapa", () => {
    const prob = malla((fila, c) => (fila < 10 && c > 50 && c < 60 ? 1 : 0));
    const [c50] = calcularContornos(prob);
    const y = ys(c50.d);
    expect(Math.min(...y)).toBeGreaterThan(N - 12);
  });

  it("el contorno pasa por los centros de celda (convenio i + 0,5)", () => {
    // Celdas 40..49 a 1 y el resto a 0 → el 50 % cruza a medio camino entre la celda 49 y la 50,
    // es decir, en x = 50 (y entre 39 y 40 → x = 40).
    const prob = malla((fila, c) => (c >= 40 && c <= 49 && fila >= 40 && fila <= 49 ? 1 : 0));
    const [c50] = calcularContornos(prob);
    const x = xs(c50.d);
    expect(Math.min(...x)).toBeCloseTo(40);
    expect(Math.max(...x)).toBeCloseTo(50);
  });

  it("los anillos del 90 % quedan dentro de los del 50 %", () => {
    const prob = malla((fila, c) => Math.max(0, 1 - Math.hypot(fila - 55, c - 55) / 30));
    const [c50, c90] = calcularContornos(prob);
    expect(c50.umbral).toBe(0.5);
    expect(c90.umbral).toBe(0.9);
    const r = (d: string) => Math.max(...xs(d)) - Math.min(...xs(d));
    expect(r(c90.d)).toBeLessThan(r(c50.d));
    expect(c50.etiqueta).not.toBeNull();
  });

  it("una mancha que toca el borde no dibuja líneas sobre el marco visible", () => {
    const prob = malla((fila) => (fila > 80 ? 1 : 0)); // toca el borde norte
    const [c50] = calcularContornos(prob);
    // Los tramos del borde se cierran fuera de la ventana (y < 0)
    expect(Math.min(...ys(c50.d))).toBeLessThan(0);
  });
});
