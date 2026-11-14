"""Genera los datos del mapa 3D desde fuentes oficiales del USGS (ver docs/es/fuentes.md).

Salida en public/data/3d/:

  marte_4k.jpg, marte_8k.jpg   Globo: mosaico en color Viking MDIM 2.1 (USGS), equirectangular,
                               lon −180..180, lat 90..−90. Pedido al servidor WMS del USGS en
                               trozos de 4096 px (su máximo) y cosido.
  marte_normal_2k.jpg          Relieve del globo: mapa de normales del DEM MOLA 463 m (MGS),
                               leído reducido a 2048 × 1024, relieve exagerado ×6.
  gale_color.jpg               Región de Gale (lon 135,8..139,8 E; lat −7..−3): MDIM 2.1 color.
  gale_alturas.bin + .json     DEM HRSC-MOLA blend 200 m (USGS) de la misma región, 512 × 512 int16 LE,
                               fila 0 = norte. (Se lee fila a fila: ~4 min.)
  terreno_alturas.bin + .json  Terreno local (caja de contexto del mapa) a 16 m, uint16 LE en decímetros
                               sobre `zmin`, fila 0 = norte. Del DEM MSL Gale 1 m v3 (USGS).
  terreno_normal.jpg           Normales del DETALLE fino del terreno local a 8 m (lo que la malla de 16 m no
                               recoge), espacio tangente: R = este, G = norte.

Las descargas intermedias se guardan en scripts/.cache/ (no se suben al repositorio).

Uso:  python3 scripts/preparar_datos_3d.py          (rasterio, numpy, Pillow y curl)
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "data" / "3d"
CACHE = Path(__file__).resolve().parent / ".cache"

WMS = (
    "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&service=WMS"
    "&version=1.1.1&request=GetMap&styles=&srs=EPSG:4326&format=image/png&layers=MDIM21_color"
)
MOLA = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
HRSC_MOLA = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/"
    "Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"
)
DEM_MSL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"

R_MARTE = 3_396_190.0
GALE = (135.8, -7.0, 139.8, -3.0)  # lon_min, lat_min, lon_max, lat_max

# Zona de estudio y caja de contexto (deben coincidir con src/lib/constants.ts y src/lib/mapa/contexto.ts)
X0, Y0, LADO = 8_141_000.0, -282_000.0, 3520.0
CTX = {"oeste": 1000.0, "este": 3000.0, "sur": 3000.0, "norte": 3000.0}
CAJA = (X0 - CTX["oeste"], Y0 - CTX["sur"], X0 + LADO + CTX["este"], Y0 + LADO + CTX["norte"])

ENV = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "GDAL_HTTP_MERGE_CONSECUTIVE_RANGES": "YES"}


def curl(url: str, destino: Path) -> Path:
    if not destino.exists():
        subprocess.run(["curl", "-sfL", "-m", "600", url, "-o", str(destino)], check=True)
    return destino


def leer(url: str, caja, forma, remuestreo=Resampling.average, bandas=1):
    with rasterio.Env(**ENV):
        with rasterio.open("/vsicurl/" + url) as src:
            v = from_bounds(*caja, transform=src.transform)
            return src.read(bandas, window=v, out_shape=forma, resampling=remuestreo)


def normales(z: np.ndarray, m_este, m_norte, exageracion=1.0) -> np.ndarray:
    """z con fila 0 = norte. m_este puede ser un vector por fila (globo). Devuelve RGB uint8."""
    dz_dfila, dz_dcol = np.gradient(z.astype(np.float64) * exageracion)
    dz_de = dz_dcol / (m_este if np.ndim(m_este) == 0 else np.asarray(m_este)[:, None])
    dz_dn = -dz_dfila / m_norte  # las filas crecen hacia el sur
    n = np.stack([-dz_de, -dz_dn, np.ones_like(dz_de)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return np.clip((n * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)


def suavizar(z: np.ndarray, radio: int, pasadas: int = 3) -> np.ndarray:
    """Desenfoque de caja separable (aprox. gaussiano con 3 pasadas), bordes replicados."""
    out = z.astype(np.float64)
    k = 2 * radio + 1
    for _ in range(pasadas):
        for eje in (0, 1):
            p = np.pad(out, [(radio, radio) if e == eje else (0, 0) for e in (0, 1)], mode="edge")
            c = np.cumsum(p, axis=eje)
            c = np.insert(c, 0, 0, axis=eje)
            out = (np.take(c, range(k, c.shape[eje]), axis=eje) - np.take(c, range(0, c.shape[eje] - k), axis=eje)) / k
    return out


def json_a(ruta: Path, datos: dict):
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n")


def globo():
    trozos = {"nw": ("-180,0,0,90", 0, 0), "ne": ("0,0,180,90", 4096, 0),
              "sw": ("-180,-90,0,0", 0, 2048), "se": ("0,-90,180,0", 4096, 2048)}
    lienzo = Image.new("RGB", (8192, 4096))
    for n, (bbox, x, y) in trozos.items():
        f = curl(f"{WMS}&bbox={bbox}&width=4096&height=2048", CACHE / f"mdim_{n}.png")
        lienzo.paste(Image.open(f).convert("RGB"), (x, y))
    lienzo.save(SALIDA / "marte_8k.jpg", quality=82, optimize=True, progressive=True)
    lienzo.resize((4096, 2048), Image.LANCZOS).save(SALIDA / "marte_4k.jpg", quality=84, optimize=True, progressive=True)

    cache = CACHE / "mola_2k.npy"
    if not cache.exists():
        with rasterio.Env(**ENV):
            with rasterio.open("/vsicurl/" + MOLA) as src:
                np.save(cache, src.read(1, out_shape=(1024, 2048), resampling=Resampling.nearest))
    z = np.load(cache).astype(np.float64)
    lat = np.radians(90 - (np.arange(1024) + 0.5) * 180 / 1024)
    paso = 2 * np.pi * R_MARTE / 2048
    rgb = normales(z, np.maximum(np.cos(lat), 0.05) * paso, paso, exageracion=6)
    Image.fromarray(rgb).save(SALIDA / "marte_normal_2k.jpg", quality=92)


def gale():
    lon0, lat0, lon1, lat1 = GALE
    curl(f"{WMS}&bbox={lon0},{lat0},{lon1},{lat1}&width=2048&height=2048", CACHE / "gale_color.png")
    Image.open(CACHE / "gale_color.png").convert("RGB").save(SALIDA / "gale_color.jpg", quality=86, optimize=True)
    cache = CACHE / "gale_dem.npy"
    if not cache.exists():
        np.save(cache, leer(HRSC_MOLA, GALE, (512, 512), Resampling.nearest))
    z = np.load(cache).astype("<i2")
    (SALIDA / "gale_alturas.bin").write_bytes(z.tobytes())
    json_a(SALIDA / "gale_alturas.json", {
        "ancho": 512, "alto": 512, "tipo": "int16 LE, metros, fila 0 = norte",
        "lon": [lon0, lon1], "lat": [lat0, lat1], "min": int(z.min()), "max": int(z.max()),
        "fuente": "USGS, Mars HRSC MOLA Blended DEM Global 200 m v2",
    })


def terreno():
    ancho_m, alto_m = CAJA[2] - CAJA[0], CAJA[3] - CAJA[1]
    a16 = (round(alto_m / 16), round(ancho_m / 16))
    z = leer(DEM_MSL, CAJA, a16).astype(np.float64)
    zmin = float(np.floor(z.min()))
    dm = np.round((z - zmin) * 10).astype("<u2")
    (SALIDA / "terreno_alturas.bin").write_bytes(dm.tobytes())
    json_a(SALIDA / "terreno_alturas.json", {
        "ancho": a16[1], "alto": a16[0], "m_px": 16, "tipo": "uint16 LE, decímetros sobre zmin, fila 0 = norte",
        "caja_m": list(CAJA), "zmin": zmin, "zmax": float(z.max()),
        "fuente": "USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016)",
    })
    z8 = leer(DEM_MSL, CAJA, (round(alto_m / 8), round(ancho_m / 8))).astype(np.float64)
    # Solo el detalle fino (lo que la malla de 16 m no recoge): z8 menos su versión suavizada
    detalle = z8 - suavizar(z8, radio=1)
    Image.fromarray(normales(detalle, 8.0, 8.0, exageracion=1.5)).save(SALIDA / "terreno_normal.jpg", quality=90)
    print(f"terreno: {a16[1]}×{a16[0]} a 16 m, {zmin:.0f} a {z.max():.0f} m")


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    pasos = {"globo": globo, "gale": gale, "terreno": terreno}
    elegidos = sys.argv[1:] or list(pasos)
    for p in elegidos:
        pasos[p]()
        print(f"✓ {p}")
    for f in sorted(SALIDA.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
