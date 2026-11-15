/**
 * Rótulos del mapa 3D que no se pisan. Con la vista inclinada, los sitios lejanos se juntan en
 * pantalla y sus textos se montan unos sobre otros: se deja ver el de más prioridad y de los demás
 * queda solo la marca (que sigue pudiéndose tocar).
 *
 * Trabaja sobre el DOM de las etiquetas (<Html> de drei): cada texto lleva `data-rotulo` con su
 * prioridad. Se llama al parar la cámara y, mientras se mueve, unas pocas veces por segundo.
 */
const MARGEN = 2; // px

export function despejarRotulos(raiz: HTMLElement) {
  const items = Array.from(raiz.querySelectorAll<HTMLElement>("[data-rotulo]"), (el, i) => ({
    el,
    i,
    prioridad: Number(el.dataset.rotulo) || 0,
    r: el.getBoundingClientRect(),
  })).filter((x) => x.r.width > 0 && x.r.height > 0);
  items.sort((a, b) => b.prioridad - a.prioridad || a.i - b.i);
  const puestos: DOMRect[] = [];
  for (const { el, r } of items) {
    const choca = puestos.some(
      (q) => r.left - MARGEN < q.right && r.right + MARGEN > q.left && r.top - MARGEN < q.bottom && r.bottom + MARGEN > q.top,
    );
    if (!choca) puestos.push(r);
    const oculto = el.dataset.oculto === "1";
    if (choca === oculto) continue;
    el.dataset.oculto = choca ? "1" : "0";
    el.style.opacity = choca ? "0" : "";
    // El texto oculto no debe robar el toque al rótulo que sí se ve: el botón deja de recibirlos
    // (su marca, con pointer-events propios, sigue respondiendo)
    const boton = el.closest("button");
    if (boton) boton.style.pointerEvents = choca ? "none" : "";
  }
}

/** Llama a `f` como mucho cada `ms`, y una última vez después de la última petición. */
export function conPausa(f: () => void, ms: number) {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  const pedir = () => {
    if (temporizador !== null) return;
    temporizador = setTimeout(() => {
      temporizador = null;
      f();
    }, ms);
  };
  pedir.cancelar = () => {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
  };
  return pedir;
}
