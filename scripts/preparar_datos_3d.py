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
  entorno_alturas.bin + .json  Entorno de la zona (todo el mosaico MSL, 33 × 57 km) a 64 m, mismo formato que el
                               terreno local. Donde el mosaico no tiene datos y en sus bordes se funde con el
                               DEM HRSC-MOLA de la región, para que empalme con ella sin escalón.
  entorno_color.jpg (+ _m)     Imagen del entorno a 16 m/px (32 m/px la versión móvil «_m»): ortofoto MSL (gris)
                               coloreada con la paleta del mosaico HiRISE en color, y el propio mosaico en color
                               donde lo hay. En los bordes se funde con la imagen de la región.
  gale_color.jpg (+ _4k)       Región de Gale (4° × 4°) a 2048 y 4096 px: mosaico CTX de 6 m (Robbins et al.)
                               coloreado con la misma paleta. Sustituye al MDIM 2.1 de esa región (232 m/px).
  gale_color.json              Tinte que iguala esa imagen al color del globo (MDIM) cuando se pinta sobre él.
  zona_color.jpg               Zona de estudio a 1,33 m/px (2640 px), del mosaico HiRISE en color: el doble de
                               detalle que public/data/aoi_color.jpg, para acercarse en el 3D de escritorio.

El paso «entorno» también rehace public/data/contexto_color.jpg (5 m/px) coloreando las franjas que el
mosaico HiRISE trae en gris (sin tira en color), con la misma paleta.

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
ORTO_MSL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif"
COLOR_MSL = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/"
    "MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif"
)
# Mosaico CTX de 6 m del cuadrángulo MC-23 (Aeolis), meridiano central 180°
CTX = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/Mars_MRO_CTX_Equi_Mosaics_Robbins/"
    "6mpp/MC23_6mpp_clon180.vrt"
)

R_MARTE = 3_396_190.0
GALE = (135.8, -7.0, 139.8, -3.0)  # lon_min, lat_min, lon_max, lat_max

# Zona de estudio y caja de contexto (deben coincidir con src/lib/constants.ts y src/lib/mapa/contexto.ts)
X0, Y0, LADO = 8_141_000.0, -282_000.0, 3520.0
CTX = {"oeste": 1000.0, "este": 3000.0, "sur": 3000.0, "norte": 3000.0}
CAJA = (X0 - CTX["oeste"], Y0 - CTX["sur"], X0 + LADO + CTX["este"], Y0 + LADO + CTX["norte"])

ENV = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "GDAL_HTTP_MERGE_CONSECUTIVE_RANGES": "YES"}
# Para leer reducidos los mosaicos enteros hacen falta sus pirámides externas (.ovr) y los .vrt
ENV_OVR = {"GDAL_HTTP_MERGE_CONSECUTIVE_RANGES": "YES", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.ovr,.vrt"}

# Entorno: la parte del mosaico MSL que se muestra alrededor de la zona, alineada a 64 m
ENT = (8_128_000.0, -302_208.0, 8_160_960.0, -244_800.0)
ENT_M, ENT_PX = 64.0, 16.0
# Caja del mosaico HiRISE en color, ampliada a múltiplos de 16 m
COLOR_CAJA = (8_140_000.0, -289_008.0, 8_149_008.0, -270_000.0)


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


def leer_ovr(url: str, caja, forma, cache: str, bandas=1, relleno=0):
    """Lee una ventana reducida usando las pirámides del mosaico; lo de fuera queda en `relleno`."""
    f = CACHE / cache
    if not f.exists():
        with rasterio.Env(**ENV_OVR):
            with rasterio.open("/vsicurl/" + url) as src:
                v = from_bounds(*caja, transform=src.transform)
                np.save(f, src.read(bandas, window=v, out_shape=forma, resampling=Resampling.average,
                                    boundless=True, fill_value=relleno))
    return np.load(f)


def bilineal(img: np.ndarray, fx: np.ndarray, fy: np.ndarray) -> np.ndarray:
    """Muestra `img` (alto × ancho [× c]) en coordenadas de píxel (centros en enteros); borde replicado."""
    alto, ancho = img.shape[:2]
    fx = np.clip(fx, 0, ancho - 1)
    fy = np.clip(fy, 0, alto - 1)
    x0 = np.floor(fx).astype(np.intp)
    y0 = np.floor(fy).astype(np.intp)
    x1 = np.minimum(x0 + 1, ancho - 1)
    y1 = np.minimum(y0 + 1, alto - 1)
    tx = (fx - x0).astype(np.float32)
    ty = (fy - y0).astype(np.float32)
    if img.ndim == 3:
        tx, ty = tx[..., None], ty[..., None]
    arriba = img[y0, x0] * (1 - tx) + img[y0, x1] * tx
    abajo = img[y1, x0] * (1 - tx) + img[y1, x1] * tx
    return arriba * (1 - ty) + abajo * ty


def en_region(este: np.ndarray, norte: np.ndarray, lado: int):
    """Proyectadas (m) → coordenadas de píxel en una imagen cuadrada de la región de Gale."""
    lon0, lat0, lon1, lat1 = GALE
    lon = np.degrees(este / R_MARTE)
    lat = np.degrees(norte / R_MARTE)
    return (lon - lon0) / (lon1 - lon0) * lado - 0.5, (lat1 - lat) / (lat1 - lat0) * lado - 0.5


def rampa(x: np.ndarray, a: float, b: float) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def paleta(gris: np.ndarray, color: np.ndarray) -> np.ndarray:
    """Tabla gris (0–255) → RGB medio de los píxeles en color del mosaico HiRISE con ese gris.

    El mosaico en color lleva la luminancia de la ortofoto, así que la relación es limpia: lo oscuro
    (arena basáltica) sale gris azulado y lo claro (polvo) anaranjado, como en la imagen real.
    """
    croma = color.max(-1).astype(np.int16) - color.min(-1)
    vale = (croma > 14) & (gris > 0)
    tabla = np.zeros((256, 3))
    cuenta = np.bincount(gris[vale], minlength=256).astype(np.float64)
    for c in range(3):
        tabla[:, c] = np.bincount(gris[vale], weights=color[..., c][vale].astype(np.float64), minlength=256)
    con = cuenta > 200
    niveles = np.arange(256)
    for c in range(3):
        medio = tabla[con, c] / cuenta[con]
        # Sin datos en los extremos: se prolonga con la pendiente gris → color de los extremos conocidos
        tabla[:, c] = np.interp(niveles, niveles[con], medio)
        k = np.ones(9) / 9
        tabla[:, c] = np.convolve(np.pad(tabla[:, c], 4, mode="edge"), k, mode="valid")
    lo, hi = niveles[con][0], niveles[con][-1]
    tabla[:lo] = tabla[lo] * (niveles[:lo, None] / max(lo, 1))
    tabla[hi + 1:] = tabla[hi] + (255 - tabla[hi]) * ((niveles[hi + 1:, None] - hi) / max(255 - hi, 1))
    return np.clip(tabla, 0, 255)


def colorear(gris: np.ndarray, tabla: np.ndarray) -> np.ndarray:
    """Aplica la tabla a un gris en coma flotante (interpolando entre niveles)."""
    g = np.clip(gris, 0, 255)
    g0 = np.floor(g).astype(np.intp)
    g1 = np.minimum(g0 + 1, 255)
    t = (g - g0)[..., None]
    return tabla[g0] * (1 - t) + tabla[g1] * t


def con_color(color: np.ndarray, tabla: np.ndarray, radio: int) -> np.ndarray:
    """Imagen HiRISE (alto × ancho × 3) con sus franjas grises coloreadas con la tabla, fundidas."""
    croma = color.max(-1).astype(np.int16) - color.min(-1)
    gris = color.astype(np.float32).mean(-1)
    # Peso del color real: 0 en las franjas grises (aunque sean finas) y en su borde, 1 en el resto.
    # Un píxel suelto sin croma (sombra, brillo) dentro de una tira en color se queda como está.
    real = suavizar((croma > 14).astype(np.float64), radio, pasadas=2)
    w = rampa(real, 0.62, 0.97)[..., None]
    return color * w + colorear(gris, tabla) * (1 - w)


def entorno():
    ancho, alto = round((ENT[2] - ENT[0]) / ENT_M), round((ENT[3] - ENT[1]) / ENT_M)
    k = round(ENT_M / ENT_PX)
    dem = leer_ovr(DEM_MSL, ENT, (alto, ancho), "ent_dem64.npy", relleno=-32767).astype(np.float64)
    orto = leer_ovr(ORTO_MSL, ENT, (alto * k, ancho * k), "ent_orto16.npy")
    cw, ch = round((COLOR_CAJA[2] - COLOR_CAJA[0]) / ENT_PX), round((COLOR_CAJA[3] - COLOR_CAJA[1]) / ENT_PX)
    color = np.moveaxis(leer_ovr(COLOR_MSL, COLOR_CAJA, (3, ch, cw), "ent_color16b.npy", bandas=[1, 2, 3]), 0, -1)
    lon0, lat0, lon1, lat1 = GALE
    rad = np.pi / 180
    ctx_caja = (R_MARTE * (lon0 - 180) * rad, R_MARTE * lat0 * rad, R_MARTE * (lon1 - 180) * rad, R_MARTE * lat1 * rad)
    ctx = leer_ovr(CTX, ctx_caja, (4096, 4096), "ctx_gale_4k.npy", relleno=-32768).astype(np.float64)
    hrsc = np.load(CACHE / "gale_dem.npy").astype(np.float32)  # lo deja el paso «gale»

    # ---- Paleta: gris de la ortofoto → color del mosaico HiRISE ----
    cx, cy = round((COLOR_CAJA[0] - ENT[0]) / ENT_PX), round((ENT[3] - COLOR_CAJA[3]) / ENT_PX)
    gris_color = orto[cy:cy + ch, cx:cx + cw]
    tabla = paleta(gris_color, color)

    # ---- Región: CTX llevado a la escala de grises de la ortofoto y coloreado ----
    filas, cols = np.mgrid[0:alto, 0:ancho]
    este = ENT[0] + (cols + 0.5) * ENT_M
    norte = ENT[3] - (filas + 0.5) * ENT_M
    rx, ry = en_region(este, norte, 4096)
    ctx_ok = ctx > -32000
    ctx_ent = bilineal(ctx, rx, ry)
    orto64 = orto.reshape(alto, k, ancho, k).mean((1, 3))
    vale = (orto64 > 4) & (bilineal(ctx_ok.astype(np.float64), rx, ry) > 0.99)
    # Ajuste por cuantiles (igualar histogramas en el solape): aguanta sombras y brillos distintos
    q = np.linspace(0.01, 0.99, 99)
    de, a = np.quantile(ctx_ent[vale], q), np.quantile(orto64[vale], q)
    ctx_gris = np.interp(ctx, de, a, left=None, right=None)
    # Fuera del intervalo ajustado se sigue con la pendiente de los extremos
    # y más suave: fuera del entorno hay laderas en sombra más oscuras que sus dunas, que si no
    # saldrían en negro
    p0, p1 = (a[4] - a[0]) / (de[4] - de[0]), (a[-1] - a[-5]) / (de[-1] - de[-5])
    ctx_gris = np.where(ctx < de[0], a[0] + (ctx - de[0]) * p0 * 0.3, ctx_gris)
    ctx_gris = np.where(ctx > de[-1], a[-1] + (ctx - de[-1]) * p1 * 0.5, ctx_gris)
    # Las sombras se levantan un poco (curva suave por debajo del gris 60)
    ctx_gris = np.where(ctx_gris < 60, 60 - (60 - ctx_gris) * 0.72, ctx_gris)
    ctx_gris = np.where(ctx_ok, ctx_gris, np.median(a))
    region = colorear(ctx_gris, tabla)
    region8 = np.clip(region + 0.5, 0, 255).astype(np.uint8)
    img = Image.fromarray(region8)
    img.save(SALIDA / "gale_color_4k.jpg", quality=86, optimize=True, progressive=True)
    img.resize((2048, 2048), Image.LANCZOS).save(SALIDA / "gale_color.jpg", quality=86, optimize=True, progressive=True)
    # Tinte para pintarla sobre el globo: iguala su color medio al del MDIM en el borde de la región
    mdim = np.asarray(Image.open(CACHE / "gale_color.png").convert("RGB").resize((256, 256), Image.BOX), dtype=np.float64)
    peq = np.asarray(img.resize((256, 256), Image.BOX), dtype=np.float64)
    borde = np.ones((256, 256), bool)
    borde[40:-40, 40:-40] = False
    lineal = lambda v: (v / 255) ** 2.2  # noqa: E731
    tinte = [float(lineal(mdim[borde][:, c]).mean() / lineal(peq[borde][:, c]).mean()) for c in range(3)]
    json_a(SALIDA / "gale_color.json", {
        "tinte_globo": [round(t, 4) for t in tinte],
        "nota": "Factor RGB (lineal) que iguala gale_color al color medio del MDIM 2.1 en el borde de la región",
        "fuente": "Mosaico CTX 6 m MC-23 (Robbins et al., USGS), coloreado con la paleta del mosaico HiRISE de Gale",
    })

    # ---- Imagen del entorno (16 m/px) ----
    H, W = orto.shape
    ent = colorear(orto.astype(np.float32), tabla).astype(np.float32)
    real = con_color(color.astype(np.float32), tabla, radio=2).astype(np.float32)
    # Recuadro del mosaico en color, con el borde fundido (90 px ≈ 1,4 km)
    yy, xx = np.mgrid[0:ch, 0:cw]
    d = np.minimum(np.minimum(xx, cw - 1 - xx), np.minimum(yy, ch - 1 - yy))
    w = (rampa(d.astype(np.float32), 0, 90) * (color.sum(-1) > 0))[..., None]
    ent[cy:cy + ch, cx:cx + cw] = real * w + ent[cy:cy + ch, cx:cx + cw] * (1 - w)
    # Hacia el borde del entorno (3 km) y donde la ortofoto no tiene datos: la imagen de la región
    f16, c16 = np.mgrid[0:H, 0:W].astype(np.float32)
    px, py = en_region(ENT[0] + (c16 + 0.5) * ENT_PX, ENT[3] - (f16 + 0.5) * ENT_PX, 4096)
    lejos = bilineal(region.astype(np.float32), px, py)
    d = np.minimum(np.minimum(c16, W - 1 - c16), np.minimum(f16, H - 1 - f16))
    w = rampa(d, 0, 3000 / ENT_PX) * rampa(suavizar((orto > 0).astype(np.float64), 8), 0.6, 0.98)
    ent = ent * w[..., None] + lejos * (1 - w[..., None])
    img = Image.fromarray(np.clip(ent + 0.5, 0, 255).astype(np.uint8))
    img.save(SALIDA / "entorno_color.jpg", quality=84, optimize=True, progressive=True)
    img.resize((W // 2, H // 2), Image.LANCZOS).save(SALIDA / "entorno_color_m.jpg", quality=84, optimize=True, progressive=True)

    # ---- Alturas del entorno (64 m), fundidas con el DEM de la región ----
    hx, hy = en_region(este, norte, 512)
    lejos = bilineal(hrsc, hx, hy).astype(np.float64)
    ok = dem > -30000
    desfase = float(np.median((dem - lejos)[ok]))
    # Peso del DEM fino: 0 en el borde de sus datos (y de la caja), 1 a ~2,5 km hacia dentro
    relleno = np.pad(ok.astype(np.float64), 40, mode="constant")
    w = rampa(suavizar(relleno, 40)[40:-40, 40:-40], 0.5, 0.97) * ok
    z = np.where(ok, dem, lejos) * w + lejos * (1 - w)
    zmin = float(np.floor(z.min()))
    (SALIDA / "entorno_alturas.bin").write_bytes(np.round((z - zmin) * 10).astype("<u2").tobytes())
    json_a(SALIDA / "entorno_alturas.json", {
        "ancho": ancho, "alto": alto, "m_px": ENT_M, "tipo": "uint16 LE, decímetros sobre zmin, fila 0 = norte",
        "caja_m": list(ENT), "zmin": zmin, "zmax": float(z.max()),
        "fuente": "USGS Astrogeology, MSL Gale Merged DEM 1 m v3; bordes fundidos con el DEM HRSC-MOLA 200 m v2",
    })
    print(f"entorno: {ancho}×{alto} a {ENT_M:.0f} m, {zmin:.0f} a {z.max():.0f} m; "
          f"MSL − HRSC-MOLA (mediana) = {desfase:+.1f} m; tinte globo = {tinte}")

    # ---- Contexto de la zona (5 m/px): franjas grises del mosaico HiRISE, coloreadas ----
    ctx_m_px = 5.0
    forma = (3, round((CAJA[3] - CAJA[1]) / ctx_m_px), round((CAJA[2] - CAJA[0]) / ctx_m_px))
    cerca = np.moveaxis(leer_ovr(COLOR_MSL, CAJA, forma, "contexto_color5.npy", bandas=[1, 2, 3]), 0, -1)
    arreglado = con_color(cerca.astype(np.float32), tabla, radio=5)
    Image.fromarray(np.clip(arreglado + 0.5, 0, 255).astype(np.uint8)).save(
        RAIZ / "public" / "data" / "contexto_color.jpg", quality=85, optimize=True, progressive=True)

    # ---- Zona de estudio a 1,33 m/px (el doble que la del mapa 2D), para acercarse en escritorio ----
    zona = (X0, Y0, X0 + LADO, Y0 + LADO)
    fina = np.moveaxis(leer_ovr(COLOR_MSL, zona, (3, 2640, 2640), "zona_color2k.npy", bandas=[1, 2, 3]), 0, -1)
    Image.fromarray(np.clip(con_color(fina.astype(np.float32), tabla, radio=10) + 0.5, 0, 255).astype(np.uint8)).save(
        SALIDA / "zona_color.jpg", quality=86, optimize=True, progressive=True)


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    pasos = {"globo": globo, "gale": gale, "terreno": terreno, "entorno": entorno}
    elegidos = sys.argv[1:] or list(pasos)
    for p in elegidos:
        pasos[p]()
        print(f"✓ {p}")
    for f in sorted(SALIDA.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
