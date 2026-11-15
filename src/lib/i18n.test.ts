import { describe, expect, it } from "vitest";
import { enIdioma, IDIOMAS, traductor } from "./i18n";
import { DESTINOS, DESTINOS_MISION, HABITAT } from "./data/targets";
import { PERFILES_ASTRONAUTAS } from "./data/perfiles";
import { FOTOS } from "./data/fotos";
import { FUENTES, ZONA } from "./data/fuentes";

/** Todos los textos de un valor (cadenas, listas, objetos y funciones con argumentos de ejemplo). */
function textos(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (typeof v === "function") return textos((v as (...a: unknown[]) => unknown)(1, 2, "x", "y", "z", true));
  if (Array.isArray(v)) return v.flatMap(textos);
  if (v && typeof v === "object") return Object.values(v).flatMap(textos);
  return [];
}

describe("idioma de la interfaz", () => {
  it("las franjas tienen los mismos límites en los dos idiomas", () => {
    for (const i of IDIOMAS) {
      const { franjaDe } = traductor(i);
      expect(franjaDe(0.95).id).toBe("muy");
      expect(franjaDe(0.9).id).toBe("muy");
      expect(franjaDe(0.8999).id).toBe("probable");
      expect(franjaDe(0.5).id).toBe("probable");
      expect(franjaDe(0.49).id).toBe("poco");
      expect(franjaDe(0.02).id).toBe("poco");
      expect(franjaDe(0.019).id).toBe("fuera");
      expect(franjaDe(0).id).toBe("fuera");
    }
  });

  it("porcentajes, decimales y coordenadas siguen la convención de cada idioma", () => {
    const es = traductor("es");
    const en = traductor("en");
    expect(es.pct(0.29)).toBe("29 %");
    expect(en.pct(0.29)).toBe("29%");
    expect(es.pct(0.001)).toBe("<1 %");
    expect(en.pct(0.001)).toBe("<1%");
    expect(es.num(1.25, 2)).toBe("1,25");
    expect(en.num(1.25, 2)).toBe("1.25");
    expect(es.distancia(1530)).toBe("1,5 km");
    expect(en.distancia(1530)).toBe("1.5 km");
    expect(es.latLon(-4.7, -1)).toMatch(/S, .* O$/);
    expect(en.latLon(-4.7, -1)).toMatch(/S, .* W$/);
  });

  it("ningún texto dice «seguro» ni “safe”", () => {
    expect(textos(traductor("es").t).join(" ").toLowerCase()).not.toMatch(/segur/);
    expect(textos(traductor("en").t).join(" ").toLowerCase()).not.toMatch(/\bsafe/);
  });

  it("el panel nombra quién sale y el desnivel en los dos idiomas", () => {
    const es = traductor("es").t;
    const en = traductor("en").t;
    expect([1, 2, 3, 8].map(es.salen)).toEqual(["1 persona", "Pareja", "Grupo de 3", "Grupo de 8"]);
    expect([1, 2, 3, 8].map(en.salen)).toEqual(["1 person", "Pair", "Group of 3", "Group of 8"]);
    expect(es.desnivelTexto(120)).toBe("120 m más alto que el hábitat");
    expect(es.desnivelTexto(-10)).toBe("10 m más bajo que el hábitat");
    expect(en.desnivelTexto(-10)).toBe("10 m lower than the habitat");
    expect(en.desnivelTexto(0)).toBe("Level with the habitat");
  });

  it("los datos que se muestran tienen su versión en inglés", () => {
    const conEn = [HABITAT, ZONA, ...DESTINOS, ...DESTINOS_MISION, ...PERFILES_ASTRONAUTAS, ...Object.values(FOTOS), ...FUENTES];
    for (const d of conEn) expect(d.en, JSON.stringify(d).slice(0, 60)).toBeTruthy();
    // Los nombres propios de Curiosity no se traducen; los destinos propuestos, sí
    expect(enIdioma(DESTINOS[2], "en").nombre).toBe("Rock Hall");
    expect(enIdioma(DESTINOS_MISION[0], "en").nombre).toBe("Northern hills");
    expect(enIdioma(DESTINOS_MISION[0], "es").nombre).toBe("Cerros del norte");
    for (const d of DESTINOS_MISION) expect(enIdioma(d, "en").tareas.length).toBe(d.tareas.length);
    for (const t of DESTINOS) expect(enIdioma(t, "en").tareas.length).toBe(t.tareas.length);
  });
});
