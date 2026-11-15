# Sources, libraries and tools

*Spanish version: [es/fuentes.md](es/fuentes.md)*

A single list of everything the tool uses. The website credits and the “Data” slide of the pitch come from here.

## Official data we use

List of official sources Katrina sent on 2026-11-14, checked that same day: all the links respond, and the projection and extent of the mosaics were read from the header of each GeoTIFF.

| Data | Official link | Size | Use in the project |
|---|---|---|---|
| Gale elevation model, 1 m (product page) | [USGS · Mars MSL Gale Merged DEM 1m](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | — | Terrain for the computation (person 1 / Katrina): slopes and elevation change, reduced to 32 m cells |
| Elevation model, direct download | [MSL_Gale_DEM_Mosaic_1m_v3.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif) | 3.6 GB | Same. Float32, 1 m/px, 32,980 × 57,440 px |
| HiRISE 25 cm orthophoto mosaic (product page) | [USGS · Mars MSL Gale Merged Orthophoto Mosaic 25cm](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm) | — | Reference. Its product page also has the color mosaic |
| Orthophoto mosaic, direct download | [MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif) | ≈ 50 GB on the server (the product page says 23 GB) | Not used for the study area: it is grayscale. A reduced, colorized copy is the image of the 3D surroundings (table below) |
| **HiRISE color mosaic**, direct download | [MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif) | ≈ 1 GB | **Map background** (`public/data/aoi_color.jpg`; in 3D on desktop, `3d/zona_color.jpg` at 1.33 m/px) and terrain around the area (`contexto_color.jpg`). RGB, 0.25 m/px, COG. The strips it only has in grayscale are colorized with its own palette |
| **Curiosity positions** | [MSL_waypoints.json (NASA MMGIS)](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) | 665 KB | Placing destinations T1–T6 |
| Ogunquit Beach photo (and the other PIAs) | [PIA11241](https://photojournal.jpl.nasa.gov/catalog/PIA11241) | — | Map preview and viewer (table below) |

**3D map (globe, descent and terrain around the study area).** These are not part of Katrina's list: they only provide the imagery for the globe, the flight down to Gale and the terrain that continues around the study area, and they don't feed into any computation. Product pages checked on 2026-11-14; the links of the MSL orthophoto and the CTX mosaic, on 2026-11-15.

| Data | Official link | Use in the project |
|---|---|---|
| Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 colorized; NASA Ames, USGS 2009) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m) · read from the USGS WMS service (`mars_simp_cyl.map`, layer `MDIM21_color`) | Color of the globe (`3d/marte_4k.jpg`, `3d/marte_8k.jpg`). It is also the color the Gale region image is matched to on the globe (`3d/gale_color.json`) |
| Mars MGS MOLA DEM 463m (Goddard Space Flight Center; Smith et al., 2001) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m) · [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif) | Globe shading (`3d/marte_normal_2k.jpg`, relief ×6) |
| Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (DLR, NASA, GSFC; USGS 2018; Fergason, Laura and Hare, 2017) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m) · [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif) | Relief of Gale crater and Mount Sharp (`3d/gale_alturas.bin`): on the globe, ×3; in 3D, at true scale, beyond the surroundings of the study area. It also fills the gaps and edges of the surroundings' relief |
| MSL Gale Merged DEM 1 m v3 (the one above) | — | Relief of the 3D terrain around the area, at 16 m (`3d/terreno_alturas.bin`), with fine detail at 8 m (`3d/terreno_normal.jpg`), and of the surroundings, the whole mosaic of 33 × 57 km, at 64 m (`3d/entorno_alturas.bin`) |
| MSL Gale Merged Orthophoto Mosaic 25cm v3 (the one above; Calef and Parker, 2016) | [USGS Astropedia](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm) · [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif) (≈ 23 GB; read at lower resolution through its overviews) | Image of the surroundings in 3D, 16 m/px over 33 × 57 km (`3d/entorno_color.jpg`; 32 m/px on mobile, `3d/entorno_color_m.jpg`). It is grayscale and is colorized with the palette of the HiRISE color mosaic (approximate color, not measured); where the color mosaic exists, that is used instead |
| Mars CTX Controlled Equatorial Mosaics, 6 m/px, quadrangle MC-23 (Aeolis) (S. J. Robbins and colleagues; distributed by USGS) | [USGS · Mars CTX Controlled Equatorial Mosaics](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/Mars_MRO_CTX_Equi_Mosaics_Robbins/index.html) · [VRT](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/Mars_MRO_CTX_Equi_Mosaics_Robbins/6mpp/MC23_6mpp_clon180.vrt) | Image of the Gale region (4° × 4°) on the globe and on the 3D horizon (`3d/gale_color.jpg`, 2048 px; on desktop `3d/gale_color_4k.jpg`, 4096 px, ≈ 60 m/px), colorized the same way (approximate color, not measured). It replaces Viking MDIM 2.1 (232 m/px) for that region |

> The original message continued (“Read more”): if there are more rows, they get added here.

**Verified details:**

- **Common projection:** Mars equirectangular, central meridian 0°, sphere of radius 3,396,190 m. It is the same in the project window (x from 8141.0 to 8144.52 km; y from −282.0 to −278.48 km), in the DEM, in the color mosaic and in the Curiosity positions (`easting` and `northing` fields). No reprojection is needed.
- **Color mosaic:** it covers x from 8140 to 8149 km and y from −289 to −270 km, so it contains the window. According to the USGS product page (July 2025), it is made of georectified HiRISE color strips merged with the mission's HiRISE RED orthomosaic. It is a COG with overviews (2× to 64×), so the window can be cropped over HTTP without downloading the whole file (recipe in `public/data/README.md`).
- **DEM:** it covers x from 8128.0 to 8161.0 km and y from −302.2 to −244.8 km.
- **Orthophoto:** there are two copies on the server: the one linked in the first table (≈ 50 GB) and `mosaic/Mars/MSL/MSL_Gale_Orthophoto_Mosaic_25cm_v3.tif` (≈ 23 GB, the size the product page gives), which is the one `scripts/preparar_datos_3d.py` reads.
- **CTX mosaic:** quadrangle MC-23 is equirectangular with central meridian 180° (`MC23_6mpp_clon180.vrt`), so the script shifts the Gale box by 180° in longitude before reading it.
- **`MSL_waypoints.json`:** a GeoJSON with 1389 rover stops. Each one has `sol`, `site`, `drive`, `easting`, `northing`, `lat`, `lon`, `elev_geoid`, orientation (`roll`, `pitch`, `yaw`) and distance traveled. It runs from sol 3 to sol 5073.

### Alternatives (in case another area or more detail is wanted)

| Data | Link |
|---|---|
| Individual HiRISE elevation models, 1 m | [uahirise.org/dtm](https://www.uahirise.org/dtm/) |
| HRSC mosaic of Gale at 30 m (Persaud et al., 2021) | [doi:10.5281/zenodo.5808354](https://doi.org/10.5281/zenodo.5808354) |
| Index of Mars elevation models (UCLA) | [GALE-Lab/Mars_DEMs](https://github.com/GALE-Lab/Mars_DEMs) |

### Credits that must be shown (specification §12)

| Data | Credit |
|---|---|
| Terrain | USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef and Parker, 2016) |
| Background image | HiRISE, NASA/JPL-Caltech/University of Arizona |
| Destination positions | NASA/JPL-Caltech, Curiosity position archive |
| Destination photos | NASA/JPL-Caltech/MSSS, with their PIA number (PIA23042: NASA/JPL-Caltech) |
| Globe: color | NASA/JPL/USGS, Viking MDIM 2.1 colorized |
| Globe: relief | MOLA Science Team, NASA/GSFC · USGS Astrogeology |
| Gale relief (globe and 3D horizon) | USGS Astrogeology, HRSC-MOLA Blended DEM 200 m v2 (Fergason et al., 2017) |
| Image of the surroundings (3D) | USGS Astrogeology, MSL Gale Merged Orthophoto Mosaic 25 cm v3 (Calef and Parker, 2016) · NASA/JPL-Caltech/University of Arizona/MSSS |
| Image of the Gale region (globe and 3D horizon) | CTX: NASA/JPL-Caltech/MSSS · controlled mosaic by Robbins et al., USGS Astrogeology |

### What Curiosity saw (map preview and viewer)

Public-domain images downloaded from `images-assets.nasa.gov/image/PIA…/PIA…~orig.jpg` and downscaled with `sips` into `public/fotos/` (the `-mini` version is the info card thumbnail). Data in `src/lib/data/fotos.ts`.

The titles, dates, credits, number of images and orientation come from the official record of each PIA: `https://images-api.nasa.gov/search?nasa_id=PIA…` and the Photojournal page. The description shown is a faithful Spanish summary of the official caption. The official credit is NASA/JPL-Caltech/MSSS for all of them, except PIA23042, which is **NASA/JPL-Caltech**.

| Destination | PIA | What it is | Camera · sol | Viewer |
|---|---|---|---|---|
| T1 Ogunquit Beach | [PIA11241](https://photojournal.jpl.nasa.gov/catalog/PIA11241) | Panorama next to an active dune | Mastcam · 1647 | 360° |
| T2 Ireson Hill | [PIA21718](https://photojournal.jpl.nasa.gov/catalog/PIA21718) | Ireson Hill, on Mount Sharp | Mastcam · 1598 | Panorama |
| T3 Rock Hall | [PIA23042](https://photojournal.jpl.nasa.gov/catalog/PIA23042) | 360° panorama on Vera Rubin Ridge | Mastcam · 2265 | 360° |
| T4 Aberlady/Kilmarie | [PIA23240](https://photojournal.jpl.nasa.gov/catalog/PIA23240) | Self-portrait at Aberlady and Kilmarie | MAHLI · 2405 | Photo |
| T5 Edinburgh | [PIA25046](https://photojournal.jpl.nasa.gov/catalog/PIA25046) | Surroundings of the Edinburgh drill hole | Mastcam · 2711–2712 | Photo |
| T6 Mary Anning | [PIA24173](https://photojournal.jpl.nasa.gov/catalog/PIA24173) | Self-portrait at Mary Anning | MAHLI · 2922 | Photo |

### Official USGS product pages (checked in November 2026)

- **DEM:** *Mars MSL Gale Merged DEM 1m*. Authors: Timothy Parker and Fred J. Calef III. Published by USGS Astrogeology Science Center on 2016-10-20. It is 1 m/px and merges HRSC, CTX and HiRISE models adjusted to MOLA.
- **Orthomosaic:** *Mars MSL Gale Merged Orthophoto Mosaic 25cm*. Authors: Fred J. Calef III and Timothy Parker. Published by USGS Astrogeology Science Center on 2016-10-20. It is 25 cm/px and made from HiRISE georeferenced to CTX, HRSC and MOLA.

In the tool, all of this can be seen on the map (“Sources” button, bottom right). Data in `src/lib/data/fuentes.ts`.

## Map design references

- **Aesthetic (“Apollo”):** [NASA Eyes on the Solar System](https://www.jpl.nasa.gov/news/explore-the-solar-system-with-nasas-new-and-improved-3d-eyes/) (night blue, thin lines, a single card) and the Futura of the Apollo 11 plaque. Numbers in monospace, as on instrumentation. Full rules in `docs/map-style.md`.
- **Usage principle:** Orion's glass cockpit: show by default only what is needed for the task, with touch targets designed for gloves ([Design News](https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit)).
- **Relief (when the DEM arrives):** shading lit from the northwest, in the tradition of Eduard Imhof ([Terrain cartography](https://en.wikipedia.org/wiki/Terrain_cartography)).
- **Color:** viridis (perceptually uniform and readable with color blindness); 50% contours in white and 90% contours in amber, as in figure 5 of the report.

## Libraries

| Package | Use |
|---|---|
| `next`, `react`, `tailwindcss` | Web |
| Jost and IBM Plex Mono (`next/font/google`) | Map text and numbers |
| `d3-contour` | 50% and 90% contours (marching squares) |
| `d3-scale-chromatic` | Viridis |
| `d3-zoom`, `d3-selection`, `d3-transition`, `d3-ease` | Map zoom, panning and animations |
| `vitest` (development) | Tests for coordinates, contours, rasterization, text, the 3D relief and the camera gestures |
| `three` 0.187, `@react-three/fiber` 9.8, `@react-three/drei` 10.7 | 3D map: globe, terrain, lines of constant width (`Line`), anchored HTML labels and the globe camera (`CameraControls`, which brings in `camera-controls`). The terrain camera uses its own map-style controller (`src/lib/mapa3d/control.ts`) |
| `@react-three/postprocessing` 3.2, `postprocessing` 6.39 | Desktop only: ambient occlusion, soft bloom, vignette, SMAA and ACES tone mapping |

## Tools

- `scripts/preparar_datos.py`: generates `public/data/dem_real.bin` and `aoi_color.jpg` from the official USGS mosaics, reading only the study window over HTTP. Uses rasterio and numpy.
- `scripts/preparar_datos_3d.py`: generates `public/data/3d/` (globe, Gale region, 3D terrain and its surroundings) from the USGS WMS and GeoTIFFs. Steps `globo`, `gale`, `terreno` and `entorno` (which needs the cache left by `gale`, and also remakes `public/data/contexto_color.jpg` with its grayscale strips colorized); cache in `scripts/.cache/`.
- `scripts/npy_a_bin.py`: converts Python `.npy` files to float32 `.bin` for the browser.
- GDAL: only if we have to crop the HiRISE image ourselves (recipe in `public/data/README.md`).
- Playwright: screenshots and checks of the map at different widths.
