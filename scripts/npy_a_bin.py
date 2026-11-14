#!/usr/bin/env python3
"""Convierte un .npy (por ejemplo, dem_real.npy) en un .bin float32 little-endian para el navegador.

Uso:
    python3 scripts/npy_a_bin.py data/dem_real.npy public/data/dem_real.bin

Escribe además <salida>.json con la forma, para comprobarlo. NO cambia el orden de las filas:
el DEM sigue con la fila 0 = SUR, que es lo que espera el mapa (src/lib/mapa/geo.ts lo invierte al pintar).
Para un array de más dimensiones (p. ej. real_prob_con.npy con varios soles) se guarda tal cual, en orden C.
"""
import json
import sys
from pathlib import Path

import numpy as np


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
    a = np.load(origen)
    if not np.all(np.isfinite(a)):
        sys.exit(f"{origen} tiene valores no finitos")
    a = np.ascontiguousarray(a, dtype="<f4")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(a.tobytes(order="C"))
    destino.with_suffix(destino.suffix + ".json").write_text(
        json.dumps({"forma": list(a.shape), "tipo": "float32-le", "origen": origen.name}, ensure_ascii=False)
    )
    print(f"{origen} {a.shape} → {destino} ({destino.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
