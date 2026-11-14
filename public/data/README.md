# Datos (pendiente de Katrina)

Aquí van los archivos que se sirven al navegador:

- `aoi_color.jpg`: fondo HiRISE, 1320 × 1320, norte arriba
- `dem_real.bin` (o `.json`): DEM 110 × 110 float32, **fila 0 = sur** (convertido desde `dem_real.npy`)
- `targets.json`: hábitat y T1–T6
- `post_delta`, `post_tau_a` y `post_tau_b`: posteriores (40 000 muestras)
- `draws_seed11_300.json`: sorteos para la validación del paso 2
- `real_prob_con`: mapa de referencia (validación)
