# Land & Stand · Especificación de algoritmos por capas

Para reimplementar la herramienta desde cero y obtener exactamente los números del informe (modelo v3.1).

NASA Space Apps Challenge 2026 · Madrid · 14 de noviembre de 2026

> Versión en Markdown de `especificacion_algoritmos.docx` (el original, con figuras, está en esta misma carpeta). Si hay alguna discrepancia, manda el `.docx`.

## 0. Cómo usar este documento

La herramienta tiene siete capas. Cada una recibe la salida de la anterior:

1. **Datos:** terreno, imagen, hábitat y destinos.
2. **Fisiología:** capacidad aeróbica y equilibrio según el sol.
3. **Marcha con traje:** velocidad y potencia en cada pendiente.
4. **Grafo del terreno:** coste en tiempo y energía de cada paso entre celdas.
5. **Alcanzabilidad:** ida y vuelta dentro del presupuesto (Dijkstra).
6. **Incertidumbre y agregación:** Monte Carlo, tripulante, pareja, población y escenarios.
7. **Lugar de aterrizaje:** dónde situar el hábitat para alcanzar más ciencia, respetando la seguridad del aterrizaje.

Al final hay una capa de interfaz y el protocolo de validación. La referencia es el código Python del repositorio (`src/landstand/model.py` y `src/landstand/terrain_real.py`). Si vuestro código no reproduce los valores de la sección 10, hay un error.

**Unidades:** SI salvo VO₂ en mL/kg/min, ángulos en grados y distancias de presentación en km. Tiempo en segundos, energía en julios y potencia en vatios.

## 1. Capa de datos

| Elemento | Archivo | Detalle |
|---|---|---|
| Modelo de elevaciones | `data/dem_real.npy` | Matriz 110 × 110 float32, celdas de 32 m (3,52 × 3,52 km). **La fila 0 es el SUR**, la columna 0 es el oeste. Elevación en metros. Sin huecos. |
| Imagen de fondo | `data/aoi_color.jpg` | 1320 × 1320 px, HiRISE color de la misma ventana, **norte arriba** (fila 0 de la imagen = norte). |
| Destinos | `docs/targets/targets.json` | Hábitat y T1–T6 en km desde la esquina suroeste: `north_km`, `east_km`, más foto y créditos. |
| Ventana | — | Proyección equirectangular de Marte (meridiano central 0, esfera R = 3 396 190 m). x de 8141,0 a 8144,52 km; y de −282,0 a −278,48 km. |

Conversión km → celda (igual que en Python, con truncado):

```python
fila    = int(north_km / 0.032)   # int() trunca hacia cero
columna = int(east_km  / 0.032)
```

- Hábitat: (2,70; 1,36) km → celda (84, 42).
- Destinos:
  - T1 Ogunquit Beach (2,621; 1,018)
  - T2 Ireson Hill (2,800; 0,825)
  - T3 Rock Hall (1,725; 2,049)
  - T4 Aberlady/Kilmarie (1,863; 2,375)
  - T5 Edinburgh (1,212; 2,205)
  - T6 Mary Anning (1,672; 2,818)

Latitud y longitud de una celda (para el inspector):

```
x   = 8 141 000 + (columna + 0,5) · 32
y   = −282 000 + (fila + 0,5) · 32
lon = x / R · 180/π
lat = y / R · 180/π
```

**Posteriores** (`data/post_delta.npy`, `post_tau_a.npy`, `post_tau_b.npy`): 40 000 muestras cada una. δ y τa deben tomarse de la misma fila (están correlacionadas, r = −0,55); τb se muestrea aparte.

## 2. Capa fisiológica

Para un astronauta con parámetros p y un sol s (s = 1 es el día siguiente al aterrizaje):

```
vo2max(s)    = VO2pre · (1 − δ · exp(−s / τa))     # mL/kg/min
theta_max(s) = th_lim − d_th · exp(−s / τb)        # grados
```

`vo2max` es la capacidad aeróbica del día. `theta_max` es la pendiente máxima que puede transitar con el equilibrio de ese día.

## 3. Capa de marcha con traje (modelo M2)

Constantes: `KJ_PER_L = 20.1` (kJ por litro de O₂).

**Curva de coste en pendiente (Minetti 2002).** G es la pendiente en % (100 · Δz / distancia):

```
i     = clip(G / 100, −0.45, +0.45)
C(i)  = 280.5·i⁵ − 58.7·i⁴ − 76.8·i³ + 51.9·i² + 19.6·i + 2.5
ratio = max(C(i), 0.5) / 2.5          # = 1 en llano
```

**Velocidad máxima por terreno (Tobler, acotada)**, con S = G / 100:

```
tobler(S) = min(v_flat, v_flat · exp(−3.5 · (|S + 0.05| − 0.05)))
```

**Velocidad y consumo metabólicos:**

```
cap      = f_walk · vo2max(s)                                         # intensidad permitida
v_met(G) = max(0, V_ref · (cap − rest2) / ((ref2 − rest2) · ratio(G)))
vo2(V,G) = rest2 + (ref2 − rest2) · (V / V_ref) · ratio(G)
```

**Velocidad final con el tope de bajada (caso base v3.1):**

```
V = min(tobler(G/100), v_met(G))
si G < 0:
    V_llano = min(tobler(0), v_met(0))
    V = min(V, V_llano)                    # nadie baja más deprisa que en llano
P = vo2(V, G) · W · KJ_PER_L / 60          # vatios; W = masa corporal en kg
```

P se calcula **después** de aplicar el tope, con la V final.

**Radio en llano** (para la figura en llano y la comparación «en llano»), con V y P en G = 0:

```
dT    = V · (0.8 · T_EVA − T_TASK) / 2
dE    = V · (0.8 · P_DES · T_EVA − P_TASK · T_TASK) / (2 · max(P, 1))   # 0 si V = 0
radio = min(dT, dE)
```

## 4. Capa del grafo del terreno

Grafo dirigido con 8 vecinos. Cada celda (r, c) conecta con (r + dr, c + dc) para dr, dc ∈ {−1, 0, 1} salvo (0, 0), si el destino está dentro de la malla.

Para cada arista u → v:

```
dist     = 32 · sqrt(dr² + dc²)            # 32 o 45,25 m
S        = (z[v] − z[u]) / dist ;  G = 100 · S
theta    = degrees(atan(|S|))
(V, P)   = capa_marcha(G, s, p)
factible = (V > 0.02) y (|G| ≤ 45) y (theta ≤ theta_max(s))
t        = dist / V      (solo si factible)
e        = P · t         (solo si factible)
```

Las aristas no factibles no existen en ese sorteo. La geometría (dist, S, G, theta, ratio) no depende del sorteo: precalculadla una vez. Por sorteo solo cambian V, P, t y e.

## 5. Capa de alcanzabilidad (ida y vuelta)

Constantes de diseño: `T_EVA = 6 h = 21 600 s`, `RHO = 0.20`, `T_TASK = 1800 s`, `P_TASK = 300 W`, `P_DES = 352 W`.

Algoritmo por sorteo y sol:

```
1. IDA:    Dijkstra desde H con peso = e (energía) sobre las aristas factibles u→v.
           → Eo[c] energía mínima H→c, pred_o[c] predecesor.

2. VUELTA: Dijkstra desde H sobre el GRAFO INVERSO: relajar desde u hacia v usando
           la arista v→u (coste de ir de v hacia u).
           → Eb[c] energía mínima c→H, pred_b[c].

3. Tiempo SOBRE ESOS MISMOS CAMINOS (no un Dijkstra de tiempo aparte):
           To[c] = To[pred_o[c]] + t(pred_o[c] → c)
           Tb[c] = Tb[pred_b[c]] + t(c → pred_b[c])
           (se puede acumular durante el propio Dijkstra: al mejorar la energía de c,
            se guarda el tiempo del camino que la mejoró)

4. c es alcanzable si:
           Eo[c] y Eb[c] son finitos
           To[c] + T_TASK + Tb[c] ≤ (1 − RHO) · T_EVA                      # 17 280 s
           Eo[c] + P_TASK·T_TASK + Eb[c] ≤ (1 − RHO) · P_DES · T_EVA_E
           con T_EVA_E = 6 h por defecto; 4 h en el escenario "energía del Apolo"
```

Use un montículo binario. Optimización válida: no expandir nodos cuya energía de ida ya supera el presupuesto, porque no cambia el resultado. Coste típico: 12 100 nodos y unas 95 000 aristas, del orden de milisegundos por Dijkstra en JavaScript.

**Ruta para el inspector:** con los parámetros centrales (sección 6), la cadena de `pred_o` desde el destino hasta H es la ida, y la de `pred_b` la vuelta. Es solo ilustrativa: los colores integran toda la incertidumbre.

## 6. Capa de incertidumbre y agregación

**Parámetros de conocimiento** (un «sorteo epistémico»):

| Parámetro | Distribución |
|---|---|
| δ, τa | Misma fila aleatoria de `post_delta` y `post_tau_a` |
| τb | Elemento aleatorio de `post_tau_b` |
| f_walk | U(0,30; 0,40) |
| th_lim | U(20; 30) grados |
| d_th | U(5; 10) grados |
| v_flat | U(0,8; 1,2) m/s |
| ref2 | U(28; 30) mL/kg/min |
| rest2 | U(4; 6) mL/kg/min |
| V_ref | U(0,5; 1,0) m/s |

**Variabilidad entre astronautas** (solo en modo población): VO2pre ~ N(40,6; 6,4) recortada a [25, 60]; W ~ N(75; 10) recortada a [50, 100].

**Valores centrales** (para rutas y comprobaciones): VO2pre 40,6; W 75; δ 0,16; τa 15; τb 0,95; f_walk 0,35; th_lim 25; d_th 7,5; v_flat 1,0; ref2 29; rest2 5; V_ref 0,75.

**Modos de agregación** (N sorteos, máscara binaria 110 × 110 por sorteo):

```
Población:   sorteo i = parámetros epistémicos i + astronauta aleatorio i
             prob[c] = media_i( alcanzable_i[c] )

Tripulante:  VO2pre y W fijos (los del tripulante); solo varía lo epistémico
             prob[c] = media_i( alcanzable_i[c] )

Pareja A+B:  en CADA sorteo i, mismos parámetros epistémicos para A y B
             prob[c] = media_i( alcanzable_A,i[c] Y alcanzable_B,i[c] )
```

Usad **números aleatorios comunes**: el sorteo i debe ser el mismo en todos los soles, modos y tripulantes, para que los cambios entre opciones no sean ruido. Error de Monte Carlo: ±1,96 · sqrt(p(1−p)/N), unos ±10 puntos con N = 80 y p = 0,5. Para citar cifras, usad N = 300.

**Escenarios de diseño** (selectores en la interfaz):

- **Intensidad:** por defecto f_walk ~ U(0,30; 0,40) (conservador); opciones fijas de 30, 35, 40, 47 % (marcha observada en simulaciones lunares) y 50 % (prueba de estrés).
- **Energía del traje:** T_EVA_E = 6 h (por defecto) o 4 h (diseño del Apolo). Solo cambia la restricción de energía; la de tiempo sigue en 6 h.

## 7. Capa de selección del lugar de aterrizaje (nueva)

**Pregunta:** si se pudiera elegir dónde aterrizar dentro de la ventana, ¿qué lugar seguro maximiza la ciencia alcanzable para una tripulación recién llegada?

**Truco que la hace barata.** Evaluar cada celda como hábitat exigiría 2 Dijkstra por celda candidata (más de 24 000 por sorteo). En su lugar se enraíza en cada destino j:

```
para cada sorteo i y cada destino j:
    VUELTA (j → h):  Dijkstra desde j en el grafo DIRECTO   → Eb_j[h], pred_b
    IDA    (h → j):  Dijkstra desde j en el grafo INVERSO   → Eo_j[h], pred_o
    tiempos sobre esos mismos árboles (como en la capa 5):
        Tb_j[h] = Tb_j[pred_b[h]] + t(pred_b[h] → h)
        To_j[h] = To_j[pred_o[h]] + t(h → pred_o[h])
    alcanzable_j,i[h] = finitos y To+T_TASK+Tb ≤ 0,8·T_EVA
                        y Eo+P_TASK·T_TASK+Eb ≤ 0,8·P_DES·T_EVA_E

P_j[h] = media_i( alcanzable_j,i[h] )   # probabilidad de llegar a j y volver si el hábitat está en h
```

Son 2 × (número de destinos) Dijkstra por sorteo, el mismo coste que un mapa normal. Está verificado: da exactamente lo mismo que enraizar en el hábitat (0 diferencias en 360 comparaciones).

**Máscara de seguridad del aterrizaje** (supuestos explícitos, ajustables en la interfaz):

```
pendiente[c]   = degrees(atan(|gradiente del DEM|))   # gradiente con diferencias centrales, 32 m
pend_lander[c] = media de pendiente en la ventana 3×3 (~96 m)
arena          = máscara de dunas (zonas oscuras de la imagen HiRISE), dilatada 1 celda
seguro[c]      = pend_lander[c] ≤ 5°  y  c no está en arena dilatada
                 y  c no está a menos de 2 celdas del borde
```

**Función objetivo y robustez a la dispersión del aterrizaje:**

```
ciencia[h]  = Σ_j w_j · P_j[h]               # w_j = 1: número esperado de destinos alcanzables
robusta[h]  = media de ciencia en la ventana 3×3 (dispersión de ±~50 m)
mejor sitio = argmax_h { robusta[h] : seguro[h] }
```

Los pesos w_j permiten dar más valor científico a unos destinos que a otros. La robustez puede endurecerse usando el mínimo en lugar de la media, o una ventana mayor si la dispersión del aterrizador es mayor.

**Resultado de referencia** (300 sorteos, semilla 11, caso base):

| | Hábitat actual (84, 42) | Mejor sitio seguro, sol 1 |
|---|---|---|
| Celda | (84, 42) | (52, 60), a 1,1 km: 4,729° S, 137,376° E |
| Destinos esperados el sol 1 (de 6) | 2,63 | 4,25 |
| Destinos esperados el sol 14 | 3,16 | 4,75 (mejor sitio del sol 14: celda 55, 46) |
| Rock Hall / Edinburgh, sol 1 | 29 % / 4 % | > 99 % / 93 % |
| Ogunquit Beach / Ireson Hill, sol 1 | > 99 % / 99 % | 29 % / 15 % |
| Fracción de la ventana segura para aterrizar | 13,7 % | |

*Figura (en el `.docx`):* destinos alcanzables esperados el sol 1 según el lugar de aterrizaje (solo zonas aptas). Triángulo: hábitat actual. Estrella: mejor sitio apto.

**Lectura:** aterrizar sobre Vera Rubin Ridge, junto a Glen Torridon, en lugar de en la llanura, sube la ciencia esperada del primer sol de 2,6 a 4,3 destinos. A cambio, las dunas quedan lejos. Es una demostración del método con 6 destinos de ejemplo y una regla de aterrizaje supuesta (≤ 5°), no una propuesta de lugar de aterrizaje.

**En la interfaz:** un mapa de «ciencia esperada según dónde se aterrice» (solo zonas seguras), el mejor sitio marcado y la opción de arrastrar el hábitat a cualquier celda para recalcular. Código de referencia: `landing/landing_site.py`.

## 8. Capa de interfaz (mínimo para la demo)

- Mapa con fondo HiRISE, probabilidad en escala perceptual (viridis) y transparente por debajo del 2 %. Contornos del 50 % y del 90 % calculados con *marching squares* sobre los centros de celda. Hábitat y destinos con su porcentaje.
- Deslizador de soles del 1 al 30. Precalcular en segundo plano todos los soles para los ajustes actuales.
- Selector de quién camina (población, tripulantes editables, pareja).
- Tabla de destinos: distancia en línea recta entre centros de celda, desnivel neto y probabilidad.
- Selectores de escenario: intensidad y energía del traje.
- Panel de supuestos siempre visible: «alcanzable bajo los supuestos indicados, nunca seguro»; resolución de 32 m; tripulación ficticia; modelo no validado en Marte; bajadas no más rápidas que en llano.
- Cálculo en Web Workers para no bloquear la interfaz, con barra de progreso.
- Capa de aterrizaje: mapa de ciencia esperada según el lugar de aterrizaje, con el mejor sitio seguro marcado y el hábitat arrastrable.

## 9. Capa analítica (opcional; no hace falta para la herramienta)

El informe usa además un Monte Carlo en dos niveles (800 mundos × 400 astronautas), índices de Sobol (SALib) y el valor esperado de la información (EVPPI) por regresión. Está en `src/landstand/analysis.py`. No hace falta reimplementarla.

## 10. Protocolo de validación (obligatorio)

**Paso 1. Funciones sueltas** (valores centrales, sol 1):

| Comprobación | Valor esperado |
|---|---|
| ratio(0) | 1,000 |
| vo2max(1) con δ = 0,16 y τa = 15 | ≈ 34,5 mL/kg/min |
| Velocidad en llano | ≈ 0,22 m/s |
| Velocidad en bajada del 20 % | igual a la de llano (por el tope) |
| Radio en llano, sol 1 | ≈ 1,7 km |

**Paso 2. Mapas con los mismos sorteos.** El generador aleatorio de Python (numpy) no se puede reproducir en JavaScript. Usad los 300 sorteos ya exportados en `results/draws_seed11_300.json` (generados con `rng = numpy.random.default_rng(11)`, `P = {**sample_epi(300, rng), **sample_var(300, rng)}`), cargadlos en vuestro código y comparad:

| Destino (sol 1, base) | Probabilidad esperada |
|---|---|
| T1 Ogunquit Beach | 0,997 |
| T2 Ireson Hill | 0,987 |
| T3 Rock Hall | 0,290 |
| T4 Aberlady/Kilmarie | 0,263 |
| T5 Edinburgh | 0,037 |
| T6 Mary Anning | 0,053 |

- Sol 14: T3 0,490 · T4 0,460 · T5 0,083 · T6 0,130.
- Escenario de 4 h (sol 1): T3 0,057 · T4 0,043.
- Escenario del 47 % (sol 1): T3 0,727 · T4 0,713 · T5 0,313 · T6 0,390.

El mapa completo de referencia es `results/real_prob_con.npy` (soles 1, 2, 3, 5, 7, 10, 14). Objetivo: 0 celdas distintas. Así se validó la herramienta actual (`tool/VALIDATION.md`).

**Paso 3. Con vuestro propio generador aleatorio:** las probabilidades deben coincidir con las de referencia dentro del error de Monte Carlo (|z| < 2).

## 11. Errores típicos que hay que evitar

- Invertir filas: el modelo de elevaciones tiene el sur en la fila 0 y la imagen tiene el norte arriba.
- Redondear en lugar de truncar al pasar de km a celda.
- Calcular el tiempo con un Dijkstra de tiempo independiente: debe ir sobre los caminos de mínima energía.
- Olvidar el grafo inverso para la vuelta, porque subir y bajar no cuestan lo mismo.
- Calcular la potencia antes de aplicar el tope de bajada.
- Muestrear δ y τa por separado.
- En modo pareja, usar sorteos distintos para cada miembro.
- Mostrar la palabra «seguro» para el terreno alcanzable. En la capa de aterrizaje, «zona apta según la regla de pendiente supuesta», no «segura».
- En la capa de aterrizaje, olvidar que la vuelta es j → h en el grafo directo y la ida h → j en el inverso, que es al revés que en la capa 5.

## 12. Créditos que deben aparecer en la herramienta

- **Terreno:** USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016).
- **Imagen:** HiRISE, NASA/JPL-Caltech/University of Arizona.
- **Posiciones de los destinos:** NASA/JPL-Caltech, archivo de posiciones de Curiosity.
- **Fotos de los destinos:** NASA/JPL-Caltech/MSSS, con su número PIA.
