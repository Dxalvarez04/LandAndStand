# Fuentes, librerías y herramientas

Lista única de todo lo que usa la herramienta. De aquí salen los créditos de la web y la diapositiva «Data» del pitch.

## Datos oficiales que usamos

Lista de fuentes oficiales que pasó Katrina el 14/11/2026, comprobada ese mismo día: todos los enlaces responden, y la proyección y extensión de los mosaicos se han leído de la cabecera de cada GeoTIFF.

| Dato | Enlace oficial | Tamaño | Uso en el proyecto |
|---|---|---|---|
| Modelo de elevaciones de Gale, 1 m (ficha) | [USGS · Mars MSL Gale Merged DEM 1m](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | — | Terreno del cálculo (persona 1 / Katrina): pendientes y desnivel, reducido a celdas de 32 m |
| Modelo de elevaciones, descarga directa | [MSL_Gale_DEM_Mosaic_1m_v3.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif) | 3,6 GB | Ídem. Float32, 1 m/px, 32 980 × 57 440 px |
| Mosaico ortofoto HiRISE 25 cm (ficha) | [USGS · Mars MSL Gale Merged Orthophoto Mosaic 25cm](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm) | — | Referencia. En su ficha está también el mosaico en color |
| Mosaico ortofoto, descarga directa | [MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif) | ≈ 50 GB en el servidor (la ficha dice 23 GB) | No se usa: es en escala de grises |
| **Mosaico HiRISE en color**, descarga directa | [MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif) | ≈ 1 GB | **Fondo del mapa** (`public/data/aoi_color.jpg`). RGB, 0,25 m/px, COG |
| **Posiciones de Curiosity** | [MSL_waypoints.json (MMGIS de la NASA)](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) | 665 KB | Situar los destinos T1–T6 |
| Foto de Ogunquit Beach (y el resto de PIA) | [PIA11241](https://photojournal.jpl.nasa.gov/catalog/PIA11241) | — | Vista previa y visor del mapa (tabla de abajo) |

**Mapa 3D (globo y descenso).** No forman parte de la lista de Katrina: solo dan la imagen del globo y del vuelo hasta Gale, y no entran en ningún cálculo. Fichas consultadas el 14/11/2026.

| Dato | Enlace oficial | Uso en el proyecto |
|---|---|---|
| Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 en color; NASA Ames, USGS 2009) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m) · leído del servicio WMS del USGS (`mars_simp_cyl.map`, capa `MDIM21_color`) | Color del globo (`3d/marte_4k.jpg`, `3d/marte_8k.jpg`) y de la región de Gale (`3d/gale_color.jpg`) |
| Mars MGS MOLA DEM 463m (Goddard Space Flight Center; Smith et al., 2001) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m) · [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif) | Sombreado del globo (`3d/marte_normal_2k.jpg`, relieve ×6) |
| Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (DLR, NASA, GSFC; USGS 2018; Fergason, Laura y Hare, 2017) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m) · [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif) | Relieve del cráter Gale y del monte Sharp en el descenso (`3d/gale_alturas.bin`, ×3) |
| MSL Gale Merged DEM 1 m v3 (el de arriba) | — | Relieve del terreno 3D alrededor de la zona, a 16 m (`3d/terreno_alturas.bin`) y detalle fino a 8 m (`3d/terreno_normal.jpg`) |

> El mensaje original seguía («Leer más»): si hay más filas, se añaden aquí.

**Detalles comprobados:**

- **Proyección común:** equirectangular de Marte, meridiano central 0°, esfera de radio 3 396 190 m. Es la misma en la ventana del proyecto (x de 8141,0 a 8144,52 km; y de −282,0 a −278,48 km), en el DEM, en el mosaico en color y en las posiciones de Curiosity (campos `easting` y `northing`). No hace falta reproyectar.
- **Mosaico en color:** abarca x de 8140 a 8149 km e y de −289 a −270 km, así que contiene la ventana. Según la ficha del USGS (julio de 2025), son tiras HiRISE en color georrectificadas y fusionadas con el ortomosaico HiRISE RED de la misión. Es un COG con niveles reducidos (2× a 64×), así que se puede recortar la ventana por HTTP sin descargar el archivo entero (receta en `public/data/README.md`).
- **DEM:** abarca x de 8128,0 a 8161,0 km e y de −302,2 a −244,8 km.
- **`MSL_waypoints.json`:** es un GeoJSON con 1389 paradas del rover. Cada una tiene `sol`, `site`, `drive`, `easting`, `northing`, `lat`, `lon`, `elev_geoid`, orientación (`roll`, `pitch`, `yaw`) y distancia recorrida. Va desde el sol 3 hasta el sol 5073.

### Alternativas (por si se quiere otra zona o más detalle)

| Dato | Enlace |
|---|---|
| Modelos de elevación HiRISE sueltos, 1 m | [uahirise.org/dtm](https://www.uahirise.org/dtm/) |
| Mosaico HRSC de Gale a 30 m (Persaud et al., 2021) | [doi:10.5281/zenodo.5808354](https://doi.org/10.5281/zenodo.5808354) |
| Índice de modelos de elevación de Marte (UCLA) | [GALE-Lab/Mars_DEMs](https://github.com/GALE-Lab/Mars_DEMs) |

### Créditos que hay que mostrar (especificación §12)

| Dato | Crédito |
|---|---|
| Terreno | USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016) |
| Imagen de fondo | HiRISE, NASA/JPL-Caltech/University of Arizona |
| Posiciones de los destinos | NASA/JPL-Caltech, archivo de posiciones de Curiosity |
| Fotos de los destinos | NASA/JPL-Caltech/MSSS, con su número PIA (PIA23042: NASA/JPL-Caltech) |
| Globo: color | NASA/JPL/USGS, Viking MDIM 2.1 en color |
| Globo: relieve | MOLA Science Team, NASA/GSFC · USGS Astrogeology |
| Relieve de Gale en el descenso | USGS Astrogeology, HRSC-MOLA Blended DEM 200 m v2 (Fergason et al., 2017) |

### Lo que vio Curiosity (vista previa y visor del mapa)

Imágenes de dominio público descargadas de `images-assets.nasa.gov/image/PIA…/PIA…~orig.jpg` y reducidas con `sips` en `public/fotos/` (la versión `-mini` es la miniatura de la ficha). Datos en `src/lib/data/fotos.ts`.

Los títulos, fechas, créditos, número de imágenes y orientación salen de la ficha oficial de cada PIA: `https://images-api.nasa.gov/search?nasa_id=PIA…` y la página del Photojournal. La descripción que se muestra es un resumen fiel en español del pie oficial. El crédito oficial es NASA/JPL-Caltech/MSSS en todas, salvo PIA23042, que es **NASA/JPL-Caltech**.

| Destino | PIA | Qué es | Cámara · sol | Visor |
|---|---|---|---|---|
| T1 Ogunquit Beach | [PIA11241](https://photojournal.jpl.nasa.gov/catalog/PIA11241) | Panorámica junto a una duna activa | Mastcam · 1647 | 360° |
| T2 Ireson Hill | [PIA21718](https://photojournal.jpl.nasa.gov/catalog/PIA21718) | Ireson Hill, en el monte Sharp | Mastcam · 1598 | Panorámica |
| T3 Rock Hall | [PIA23042](https://photojournal.jpl.nasa.gov/catalog/PIA23042) | Panorámica de 360° en Vera Rubin Ridge | Mastcam · 2265 | 360° |
| T4 Aberlady/Kilmarie | [PIA23240](https://photojournal.jpl.nasa.gov/catalog/PIA23240) | Autorretrato en Aberlady y Kilmarie | MAHLI · 2405 | Foto |
| T5 Edinburgh | [PIA25046](https://photojournal.jpl.nasa.gov/catalog/PIA25046) | Alrededores de la perforación Edinburgh | Mastcam · 2711–2712 | Foto |
| T6 Mary Anning | [PIA24173](https://photojournal.jpl.nasa.gov/catalog/PIA24173) | Autorretrato en Mary Anning | MAHLI · 2922 | Foto |

### Fichas oficiales del USGS (consultadas en noviembre de 2026)

- **DEM:** *Mars MSL Gale Merged DEM 1m*. Autores: Timothy Parker y Fred J. Calef III. Publicado por USGS Astrogeology Science Center el 20/10/2016. Tiene 1 m/px y une modelos HRSC, CTX y HiRISE ajustados a MOLA.
- **Ortomosaico:** *Mars MSL Gale Merged Orthophoto Mosaic 25cm*. Autores: Fred J. Calef III y Timothy Parker. Publicado por USGS Astrogeology Science Center el 20/10/2016. Tiene 25 cm/px y está hecho con HiRISE georreferenciado sobre CTX, HRSC y MOLA.

En la herramienta, todo esto se ve en el mapa (botón «Fuentes», abajo a la derecha). Datos en `src/lib/data/fuentes.ts`.

## Referencias de diseño del mapa

- **Estética («Apolo»):** [NASA Eyes on the Solar System](https://www.jpl.nasa.gov/news/explore-the-solar-system-with-nasas-new-and-improved-3d-eyes/) (azul noche, líneas finas, una sola tarjeta) y la Futura de la placa del Apolo 11. Las cifras en monoespaciada, como en la instrumentación. Reglas completas en `docs/estilo_mapa.md`.
- **Principio de uso:** cabina de cristal de Orion: mostrar por defecto solo lo necesario para la tarea, con zonas táctiles pensadas para guantes ([Design News](https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit)).
- **Relieve (cuando llegue el DEM):** sombreado con luz del noroeste, en la tradición de Eduard Imhof ([Terrain cartography](https://en.wikipedia.org/wiki/Terrain_cartography)).
- **Color:** viridis (perceptualmente uniforme y legible con daltonismo); contornos del 50 % en blanco y del 90 % en ámbar, como en la figura 5 del informe.

## Librerías

| Paquete | Uso |
|---|---|
| `next`, `react`, `tailwindcss` | Web |
| Jost e IBM Plex Mono (`next/font/google`) | Texto y cifras del mapa |
| `d3-contour` | Contornos del 50 % y 90 % (marching squares) |
| `d3-scale-chromatic` | Viridis |
| `d3-zoom`, `d3-selection`, `d3-transition`, `d3-ease` | Zoom, desplazamiento y animaciones del mapa |
| `vitest` (desarrollo) | Pruebas de coordenadas, contornos, rasterizado, textos y malla 3D |
| `three` 0.187, `@react-three/fiber` 9.8, `@react-three/drei` 10.7 | Mapa 3D: globo, terreno, etiquetas HTML ancladas y cámara (`CameraControls`, que trae `camera-controls`) |
| `@react-three/postprocessing` 3.2, `postprocessing` 6.39 | Solo escritorio: oclusión ambiental, brillo suave, viñeta, SMAA y tonos ACES |

## Herramientas

- `scripts/preparar_datos.py`: genera `public/data/dem_real.bin` y `aoi_color.jpg` desde los mosaicos oficiales del USGS, leyendo por HTTP solo la ventana de estudio. Usa rasterio y numpy.
- `scripts/preparar_datos_3d.py`: genera `public/data/3d/` (globo, región de Gale y terreno 3D) desde el WMS y los GeoTIFF del USGS. Pasos `globo`, `gale` y `terreno`; caché en `scripts/.cache/`.
- `scripts/npy_a_bin.py`: convierte los `.npy` de Python a `.bin` float32 para el navegador.
- GDAL: solo si hay que recortar nosotros la imagen HiRISE (receta en `public/data/README.md`).
- Playwright: capturas y comprobaciones del mapa en distintos anchos.
