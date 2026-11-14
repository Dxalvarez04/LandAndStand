/**
 * Suavizado de Chaikin para dibujar caminos de la malla (8 direcciones) sin zigzag de 45°.
 * Mantiene los extremos; solo redondea esquinas (desvío máximo ≈ ¼ del tramo).
 */
export interface P2 {
  x: number;
  y: number;
}

export function suavizar<T extends P2>(puntos: T[], pasadas = 2): P2[] {
  let ps: P2[] = puntos;
  for (let n = 0; n < pasadas && ps.length > 2; n++) {
    const sig: P2[] = [ps[0]];
    for (let i = 0; i + 1 < ps.length; i++) {
      const a = ps[i];
      const b = ps[i + 1];
      sig.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      sig.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    sig.push(ps[ps.length - 1]);
    ps = sig;
  }
  return ps;
}
