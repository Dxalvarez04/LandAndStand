"""Genera los datos del mapa y del cálculo desde las fuentes oficiales (ver docs/es/fuentes.md).

Lee por HTTP solo la ventana de estudio, sin descargar los mosaicos enteros:

  public/data/dem_real.bin   DEM 110 × 110 float32 little-endian, celdas de 32 m, FILA 0 = SUR.
                             Del MSL Gale Merged DEM 1 m v3 (USGS), usando su versión reducida
                             interna y promediando a 32 m, como en el informe técnico (sección 4).
  public/data/aoi_color.jpg  Fondo 1320 × 1320 px, NORTE ARRIBA, del mosaico HiRISE en color (USGS).
  public/data/contexto_color.jpg  Terreno alrededor de la zona de estudio (solo visual, sin cálculo):
                             1 km al oeste (ahí acaba el mosaico) y 3 km al norte, este y sur, a 5 m/px.
  public/data/relieve.png    Relieve sombreado neutro de la zona de estudio a 8 m (gris 128 = llano),
                             para dibujarlo encima de la probabilidad con fusión «soft-light».

Ventana (especificación §1): proyección equirectangular de Marte, meridiano central 0,
R = 3 396 190 m; x de 8141,0 a 8144,52 km, y de −282,0 a −278,48 km. Es la misma proyección
de los dos mosaicos (comprobado en sus cabeceras), así que no se reproyecta.

Uso:  python3 scripts/preparar_datos.py            (necesita rasterio y numpy)
"""

import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

DEM_URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
COLOR_URL = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/"
    "MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif"
)

X0, Y0 = 8_141_000.0, -282_000.0  # esquina suroeste (m)
N, CELDA = 110, 32.0
LADO = N * CELDA  # 3520 m
IMG = 1320  # px del fondo: 12 px por celda
# Caja de contexto (m): debe coincidir con src/lib/mapa/contexto.ts
CTX = {"oeste": 1000.0, "este": 3000.0, "sur": 3000.0, "norte": 3000.0}
CTX_M_PX = 5.0
RELIEVE = 440  # px del relieve: 8 m por píxel

SALIDA = Path(__file__).resolve().parent.parent / "public" / "data"


def leer(url: str, bandas, forma, remuestreo, caja=(X0, Y0, X0 + LADO, Y0 + LADO)):
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open("/vsicurl/" + url) as src:
            ventana = from_bounds(*caja, transform=src.transform)
            datos = src.read(bandas, window=ventana, out_shape=forma, resampling=remuestreo, masked=True)
            return datos, src.nodata


def relieve_neutro(z: np.ndarray, m_px: float, exageracion: float = 1.5) -> np.ndarray:
    """Sombreado con luz del noroeste a 45°, centrado en 128 (llano) para fusión soft-light."""
    gy, gx = np.gradient(z * exageracion, m_px)  # gy: hacia el sur (filas crecen hacia abajo)
    nx, ny, nz = -gx, gy, np.ones_like(z)  # normal (este, norte, arriba)
    norma = np.sqrt(nx**2 + ny**2 + nz**2)
    az, alt = np.radians(315), np.radians(45)
    luz = (np.sin(az) * np.cos(alt), np.cos(az) * np.cos(alt), np.sin(alt))
    s = (nx * luz[0] + ny * luz[1] + nz * luz[2]) / norma
    return np.clip(128 + (s - np.sin(alt)) * 420, 0, 255).astype(np.uint8)


def escribir(ruta: Path, datos: np.ndarray, driver: str, **opciones):
    bandas = 1 if datos.ndim == 2 else datos.shape[0]
    alto, ancho = datos.shape[-2:]
    perfil = {"driver": driver, "width": ancho, "height": alto, "count": bandas, "dtype": "uint8", **opciones}
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(ruta, "w", **perfil) as dst:
            dst.write(datos if datos.ndim == 3 else datos[np.newaxis])


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)

    # ---- DEM: promedio a 32 m. GDAL usa la versión reducida interna (32×) del propio mosaico ----
    dem, _ = leer(DEM_URL, 1, (N, N), Resampling.average)
    if np.ma.count_masked(dem):
        print(f"ERROR: el DEM tiene {np.ma.count_masked(dem)} celdas sin dato en la ventana", file=sys.stderr)
        return 1
    dem = np.asarray(dem, dtype=np.float32)
    dem_sur = np.flipud(dem)  # la lectura sale con el norte arriba; el contrato pide fila 0 = sur
    (SALIDA / "dem_real.bin").write_bytes(dem_sur.astype("<f4").tobytes())
    (SALIDA / "dem_real.json").write_text(
        json.dumps(
            {
                "forma": [N, N],
                "tipo": "float32",
                "orden": "little-endian, fila 0 = sur, columna 0 = oeste",
                "celda_m": CELDA,
                "fuente": "USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016)",
                "min_m": round(float(dem.min()), 2),
                "max_m": round(float(dem.max()), 2),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )

    # ---- Fondo HiRISE en color, norte arriba ----
    color, _ = leer(COLOR_URL, [1, 2, 3], (3, IMG, IMG), Resampling.average)
    escribir(SALIDA / "aoi_color.jpg", np.asarray(color.filled(0), dtype=np.uint8), "JPEG", quality=88)

    # ---- Contexto alrededor (solo visual) ----
    caja = (X0 - CTX["oeste"], Y0 - CTX["sur"], X0 + LADO + CTX["este"], Y0 + LADO + CTX["norte"])
    forma = (3, round((caja[3] - caja[1]) / CTX_M_PX), round((caja[2] - caja[0]) / CTX_M_PX))
    ctx, _ = leer(COLOR_URL, [1, 2, 3], forma, Resampling.average, caja)
    escribir(SALIDA / "contexto_color.jpg", np.asarray(ctx.filled(0), dtype=np.uint8), "JPEG", quality=80)

    # ---- Relieve sombreado de la zona de estudio, a 8 m ----
    z8, _ = leer(DEM_URL, 1, (RELIEVE, RELIEVE), Resampling.average)
    escribir(SALIDA / "relieve.png", relieve_neutro(np.asarray(z8, dtype=np.float64), LADO / RELIEVE), "PNG")

    print(f"dem_real.bin: {N}×{N}, {dem.min():.1f} a {dem.max():.1f} m (desnivel {dem.max() - dem.min():.0f} m)")
    for nombre in ("aoi_color.jpg", "contexto_color.jpg", "relieve.png"):
        print(f"{nombre}: {(SALIDA / nombre).stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
