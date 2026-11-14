import { describe, expect, it } from "vitest";
import { FRANJAS, TEXTOS, franjaDe, pct } from "./textos";

describe("textos", () => {
  it("límites de las franjas", () => {
    expect(franjaDe(0.95).id).toBe("muy");
    expect(franjaDe(0.9).id).toBe("muy");
    expect(franjaDe(0.8999).id).toBe("probable");
    expect(franjaDe(0.5).id).toBe("probable");
    expect(franjaDe(0.49).id).toBe("poco");
    expect(franjaDe(0.02).id).toBe("poco");
    expect(franjaDe(0.019).id).toBe("fuera");
    expect(franjaDe(0).id).toBe("fuera");
  });

  it("porcentajes", () => {
    expect(pct(0.29).replace(/\s/g, " ")).toBe("29 %");
    expect(pct(0.001)).toBe("<1 %");
  });

  it("ningún texto dice «seguro» salvo para negarlo", () => {
    const todo = [
      ...FRANJAS.flatMap((f) => [f.nombre, f.frase]),
      ...Object.values(TEXTOS).map((v) => (typeof v === "function" ? v(1, 1, 6) : v)),
    ].join(" ");
    expect(todo.toLowerCase()).not.toMatch(/segur/);
  });
});
