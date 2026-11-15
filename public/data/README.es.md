# Datos

Archivos que se sirven al navegador. Los usan el mapa y el cálculo (Web Worker).

| Archivo | Qué es | Cómo se obtiene | Estado |
|---|---|---|---|
| `dem_real.bin` | DEM 110 × 110 float32 LE, celdas de 32 m, **fila 0 = sur** (lo leen el cálculo y el relieve del mapa) | `python3 scripts/preparar_datos.py` (desde el DEM oficial del USGS) | ✓ |
| `dem_real.json` | Forma, orden, fuente y rango de alturas del DEM | Lo escribe el mismo script | ✓ |
| `aoi_color.jpg` | Fondo HiRISE en color, 1320 × 1320, **norte arriba** | `python3 scripts/preparar_datos.py` (desde el mosaico en color oficial del USGS) | ✓ |
| `contexto_color.jpg` | Terreno HiRISE alrededor de la zona (1 km al oeste, 3 km al norte, este y sur), 5 m/px. Solo visual: contexto del mapa 2D e imagen del terreno local en el 3D | `python3 scripts/preparar_datos.py`; el paso `entorno` de `preparar_datos_3d.py` lo rehace coloreando las franjas que el mosaico solo trae en gris | ✓ |
| `relieve.png` | Relieve sombreado de la zona a 8 m, gris 128 = llano (se dibuja encima de la probabilidad) | `python3 scripts/preparar_datos.py` | ✓ |
| `draws_seed11_300.json` | Sorteos de referencia del informe técnico, para su protocolo de validación | No se incluye. Si está, el cálculo lo usa; si no, genera 300 sorteos con semilla 11 | Opcional |
| `real_prob_con.bin` | Mapa de referencia del informe técnico (validación visual) | No se incluye. Se convierte con `python3 scripts/npy_a_bin.py results/real_prob_con.npy public/data/real_prob_con.bin` | Opcional |

**Validación del DEM** frente al informe técnico (sección 4):
- Desnivel del área: 547 m (el informe dice 546 m).
- Rock Hall: 1,22 km del hábitat y +156 m (el informe dice 1,2 km y +157 m).
- Edinburgh: 1,72 km y +210 m; Mary Anning: 1,79 km y +170 m (el informe dice 1,7–1,8 km y +170–210 m).

Con el `dem_real.npy` del informe técnico se puede usar en su lugar: `python3 scripts/npy_a_bin.py data/dem_real.npy public/data/dem_real.bin`.

## Mapa 3D (`3d/`)

Solo visuales: el cálculo no los usa. Los genera `python3 scripts/preparar_datos_3d.py [globo|gale|terreno|entorno]` (≈ 18 MB en total). El paso `entorno` necesita la caché que deja `gale`.

| Archivo | Qué es | Fuente |
|---|---|---|
| `3d/marte_4k.jpg`, `3d/marte_8k.jpg` | Globo en color, equirectangular (lon −180..180, norte arriba). El 8K solo se carga en escritorio | Viking MDIM 2.1 en color (WMS del USGS, en 4 teselas de 4096 px) |
| `3d/marte_normal_2k.jpg` | Mapa de normales del globo (relieve ×6) | MOLA 463 m |
| `3d/gale_color.jpg`, `3d/gale_color_4k.jpg` | Región de Gale (lon 135,8..139,8 E; lat −7..−3), a 2048 y 4096 px (el 4K solo se carga en escritorio), al bajar desde el globo y en el horizonte del 3D. Color aproximado, no medido | Mosaico controlado CTX de 6 m, MC-23 (Robbins et al., USGS), coloreado con la paleta del mosaico HiRISE en color. Lo escribe `entorno` (el paso `gale` deja uno provisional del Viking MDIM 2.1) |
| `3d/gale_color.json` | Tinte RGB lineal que iguala esa imagen al color del globo en el borde de la región; se usa al pintarla sobre el globo | Lo escribe `entorno` (comparando con el Viking MDIM 2.1) |
| `3d/gale_alturas.bin` + `.json` | Alturas de esa región, 512 × 512 int16 LE, fila 0 = norte. Al bajar desde el globo ×3; en el 3D a escala real | HRSC-MOLA Blended DEM 200 m v2 |
| `3d/terreno_alturas.bin` + `.json` | Alturas del terreno de contexto (la caja de `contexto_color.jpg`) a 16 m, 470 × 595 uint16 LE en decímetros sobre `zmin`, fila 0 = norte | MSL Gale DEM 1 m v3 |
| `3d/terreno_normal.jpg` | Detalle fino del relieve a 8 m (solo la parte de alta frecuencia, para no contar dos veces las pendientes) | MSL Gale DEM 1 m v3 |
| `3d/entorno_alturas.bin` + `.json` | Alturas del entorno (todo el mosaico MSL, 33 × 57 km) a 64 m, 515 × 897 uint16 LE en decímetros sobre `zmin`, fila 0 = norte. Donde el mosaico no tiene datos y junto a sus bordes se funde con el DEM de la región, para que empalmen sin escalón | MSL Gale DEM 1 m v3, con el HRSC-MOLA Blended DEM 200 m v2 en los bordes |
| `3d/entorno_color.jpg`, `3d/entorno_color_m.jpg` | Imagen del entorno a 16 m/px (2060 × 3588 px; `_m`, para móvil, a 32 m/px). Hacia su borde se funde con la imagen de la región. Color aproximado, no medido | MSL Gale Orthophoto Mosaic 25 cm v3 (en gris), coloreada con la paleta del mosaico HiRISE en color, y el propio mosaico en color donde lo hay |
| `3d/zona_color.jpg` | Zona de estudio a 1,33 m/px (2640 px), el doble de detalle que `aoi_color.jpg`, para acercarse en el 3D de escritorio (en móvil se usa `aoi_color.jpg`) | Mosaico HiRISE en color |

## Recorte manual con GDAL (equivalente al script)

Se puede recortar la ventana del **mosaico HiRISE en color** oficial (ver `docs/es/fuentes.md`) con GDAL. Es un COG, así que GDAL lee por HTTP solo la parte necesaria, sin descargar el archivo de 1 GB.
La ventana está en la misma proyección que el mosaico (equirectangular de Marte, meridiano central 0, R = 3 396 190 m; comprobado en la cabecera del archivo):

```bash
gdal_translate -projwin 8141000 -278480 8144520 -282000 -outsize 1320 1320 -r average \
  /vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif \
  aoi_color.tif
gdal_translate -of JPEG -co QUALITY=88 aoi_color.tif aoi_color.jpg
```

`-projwin` va en orden ulx uly lrx lry (arriba a la izquierda y abajo a la derecha), así que la imagen sale con el norte arriba.
Comprobación visual: los puntos T1–T6 del mapa deben caer sobre los sitios de muestreo de Curiosity.
