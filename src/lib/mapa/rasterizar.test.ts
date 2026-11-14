import { describe, expect, it } from "vitest";
import { N } from "@/lib/constants";
import { ESCALA, rasterizar } from "./rasterizar";

const W = N * ESCALA;

describe("rasterizar", () => {
  it("por debajo del 2 % todo es transparente", () => {
    const out = new Uint8ClampedArray(W * W * 4);
    rasterizar(new Float32Array(N * N).fill(0.019), out);
    for (let k = 3; k < out.length; k += 4) expect(out[k]).toBe(0);
  });

  it("un valor uniforme da una imagen uniforme y opaca", () => {
    const out = new Uint8ClampedArray(W * W * 4);
    rasterizar(new Float32Array(N * N).fill(0.7), out);
    const primero = Array.from(out.slice(0, 4));
    expect(primero[3]).toBe(255);
    for (let k = 0; k < out.length; k += 4 * 997) expect(Array.from(out.slice(k, k + 4))).toEqual(primero);
  });

  it("la fila 0 (sur) se pinta abajo", () => {
    const prob = new Float32Array(N * N);
    for (let c = 0; c < N; c++) prob[c] = 1; // solo la fila 0
    const out = new Uint8ClampedArray(W * W * 4);
    rasterizar(prob, out);
    const alfa = (py: number) => out[(py * W + W / 2) * 4 + 3];
    expect(alfa(W - 1)).toBeGreaterThan(0);
    expect(alfa(0)).toBe(0);
  });
});
