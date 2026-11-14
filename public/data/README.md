# Datos

Archivos que se sirven al navegador. Los usan el mapa y el cálculo (Web Worker).

| Archivo | Qué es | Cómo se obtiene | Estado |
|---|---|---|---|
| `dem_real.bin` | DEM 110 × 110 float32 LE, celdas de 32 m, **fila 0 = sur** (lo leen el cálculo y el relieve del mapa) | `python3 scripts/preparar_datos.py` (desde el DEM oficial del USGS) | ✓ |
| `dem_real.json` | Forma, orden, fuente y rango de alturas del DEM | Lo escribe el mismo script | ✓ |
| `aoi_color.jpg` | Fondo HiRISE en color, 1320 × 1320, **norte arriba** | `python3 scripts/preparar_datos.py` (desde el mosaico en color oficial del USGS) | ✓ |
| `contexto_color.jpg` | Terreno HiRISE alrededor de la zona (1 km al oeste, 3 km al norte, este y sur), 5 m/px. Solo visual | `python3 scripts/preparar_datos.py` | ✓ |
| `relieve.png` | Relieve sombreado de la zona a 8 m, gris 128 = llano (se dibuja encima de la probabilidad) | `python3 scripts/preparar_datos.py` | ✓ |
| `draws_seed11_300.json` | Sorteos para la validación del paso 2 | Copiar `results/draws_seed11_300.json` de Katrina. Si falta, el cálculo genera 300 sorteos con semilla 11 | Pendiente |
| `real_prob_con.bin` | Mapa de referencia (validación visual) | `python3 scripts/npy_a_bin.py results/real_prob_con.npy public/data/real_prob_con.bin` | Pendiente |

**Validación del DEM** frente al informe técnico (sección 4):
- Desnivel del área: 547 m (el informe dice 546 m).
- Rock Hall: 1,22 km del hábitat y +156 m (el informe dice 1,2 km y +157 m).
- Edinburgh: 1,72 km y +210 m; Mary Anning: 1,79 km y +170 m (el informe dice 1,7–1,8 km y +170–210 m).

Si Katrina pasa su `dem_real.npy`, se puede usar en su lugar: `python3 scripts/npy_a_bin.py data/dem_real.npy public/data/dem_real.bin`.

## Mapa 3D (`3d/`)

Solo visuales: el cálculo no los usa. Los genera `python3 scripts/preparar_datos_3d.py [globo|gale|terreno]` (≈ 10 MB en total).

| Archivo | Qué es | Fuente |
|---|---|---|
| `3d/marte_4k.jpg`, `3d/marte_8k.jpg` | Globo en color, equirectangular (lon −180..180, norte arriba). El 8K solo se carga en escritorio | Viking MDIM 2.1 en color (WMS del USGS, en 4 teselas de 4096 px) |
| `3d/marte_normal_2k.jpg` | Mapa de normales del globo (relieve ×6) | MOLA 463 m |
| `3d/gale_color.jpg` | Región de Gale (lon 135,8..139,8 E; lat −7..−3), 2048 px | Viking MDIM 2.1 en color |
| `3d/gale_alturas.bin` + `.json` | Alturas de esa región, 512 × 512 int16 LE, fila 0 = norte | HRSC-MOLA Blended DEM 200 m v2 |
| `3d/terreno_alturas.bin` + `.json` | Alturas del terreno de contexto (la caja de `contexto_color.jpg`) a 16 m, 470 × 595 uint16 LE en decímetros sobre `zmin`, fila 0 = norte | MSL Gale DEM 1 m v3 |
| `3d/terreno_normal.jpg` | Detalle fino del relieve a 8 m (solo la parte de alta frecuencia, para no contar dos veces las pendientes) | MSL Gale DEM 1 m v3 |

## Recorte manual con GDAL (equivalente al script)

Se puede recortar la ventana del **mosaico HiRISE en color** oficial (ver `docs/fuentes.md`) con GDAL. Es un COG, así que GDAL lee por HTTP solo la parte necesaria, sin descargar el archivo de 1 GB.
La ventana está en la misma proyección que el mosaico (equirectangular de Marte, meridiano central 0, R = 3 396 190 m; comprobado en la cabecera del archivo):

```bash
gdal_translate -projwin 8141000 -278480 8144520 -282000 -outsize 1320 1320 -r average \
  /vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif \
  aoi_color.tif
gdal_translate -of JPEG -co QUALITY=88 aoi_color.tif aoi_color.jpg
```

`-projwin` va en orden ulx uly lrx lry (arriba a la izquierda y abajo a la derecha), así que la imagen sale con el norte arriba.
Comprobación visual: los puntos T1–T6 del mapa deben caer sobre los sitios de muestreo de Curiosity.
