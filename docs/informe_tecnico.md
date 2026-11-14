# Land & Stand

**Capacidad funcional del astronauta y alcanzabilidad probabilística en la superficie de Marte** · Informe técnico (versión revisada)

Katrina Espinar Herranz · Equipo Land & Stand · NASA Space Apps Challenge 2026 · 14 de noviembre de 2026

> **Nota de transcripción.** Texto copiado del informe que compartió el equipo. Al copiarlo se perdieron las ecuaciones y las figuras. Las ecuaciones marcadas con † se han rellenado con las fórmulas de la [especificación de algoritmos](especificacion_algoritmos.md), que es la referencia para el código. Las que no estaban en la especificación se indican como pendientes.

## Resumen

**Objetivo.** Cuantificar qué parte del terreno marciano es alcanzable a pie, ida y vuelta, para una tripulación recién llegada tras meses de ingravidez: con qué probabilidad, para qué fracción de la tripulación y en función del sol de misión.

**Métodos.** Modelo mecanicista con tres componentes:

- Recuperación aeróbica, con calibración bayesiana a partir de astronautas de la ISS.
- Recuperación sensoriomotora, con calibración bayesiana a partir de cinco pruebas funcionales en 19 tripulantes.
- Coste metabólico de la marcha con traje presurizado, calibrado con mediciones en gravedad marciana simulada y con una curva empírica de coste en pendiente.

Un modelo alternativo basado en la ecuación de Pandolf se descartó como principal por no reproducir los datos de Marte, y se conserva como análisis de sensibilidad.

La incertidumbre de los parámetros fisiológicos y del traje se propagó con un Monte Carlo en dos niveles, que separa la incertidumbre de conocimiento de la variabilidad entre astronautas. Se descompuso con índices de Sobol y se tradujo en decisiones con el valor esperado de la información parcial, estimado por regresión no paramétrica. Las variables de diseño (soporte vital, duración de la salida, intensidad de marcha) se fijaron y se estudian como escenarios.

**Resultados.**

- **Alcance.** El radio alcanzable mediano en llano el sol 1 es de 1,6 km (intervalo predictivo del 90 %: 0,8–2,7 km) y sube a 1,9 km el sol 30, con un soporte vital de 352 W durante 6 h y marcha al 30–40 % del VO₂máx.
- **Fracción de la tripulación.** El sol 1, el 69 % de la tripulación podría ir y volver a 1,5 km (intervalo creíble: 6–96 %).
- **Parejas.** En salidas por parejas, limitadas por el miembro más lento, esa cifra baja al 48 %.
- **Aptitud aeróbica.** El sol 1, entre el 40 % y el 63 % de los astronautas simulados, con datos de tripulaciones de la ISS, estaría por debajo del requisito de la NASA de VO₂máx en misión para salidas en superficie (36,5 mL/kg/min), frente al 13–27 % antes del vuelo. El rango depende de si se corrige que el VO₂pico se midió en cicloergómetro.
- **Qué explica la incertidumbre.** Sobre todo el VO₂máx individual (Sₜ = 0,50), la velocidad a la que se midió el coste del traje (0,31) y la intensidad de marcha (0,14). La recuperación aeróbica no supera Sₜ = 0,04.
- **Valor de la información.** Planificar el primer paseo con la aptitud medida de cada tripulante, en lugar de con un astronauta medio, aumenta la ciencia esperada entre un 21 % y un 44 % (según el coste supuesto de abortar). La NASA ya mide esta aptitud antes del vuelo; lo nuevo es usarla en el mapa y actualizarla en misión. Conocer la curva de coste del traje la aumenta entre un 13 % y un 16 %.
- **Terreno real.** Sobre el modelo digital de elevaciones de Gale (USGS, 1 m remuestreado a 32 m), con el hábitat en roca de la formación Murray junto a las dunas Bagnold y seis destinos reales del recorrido de Curiosity, Rock Hall (Vera Rubin Ridge, a 1,2 km y 157 m más arriba) se alcanza el sol 1 con una probabilidad del 29 % (49 % el sol 14), frente al 78 % en llano a la misma distancia. Los sitios de perforación más lejanos y altos (1,7–1,8 km, +170–210 m) se quedan en el 4–5 % el sol 1 y en el 8–13 % el sol 14.
- **Equilibrio.** El modelo no deja bajar más deprisa que en llano, por el riesgo de caída: sin ese límite, Rock Hall subiría del 29 % al 50 %. Como límite de pendiente, y con la tolerancia supuesta (20–30°, nivel C), el equilibrio no cambió la alcanzabilidad de ningún objetivo, ni a 32 m ni a 16 m; si la pendiente tolerable el sol 1 fuera de 10°, Rock Hall bajaría al 15 %.
- **Supuestos de diseño.** Los resultados en terreno dependen sobre todo de dos decisiones de diseño, que se muestran como escenarios: con el presupuesto energético del soporte vital del Apolo (4 h en lugar de 6 h), Rock Hall baja al 6 % el sol 1; con la intensidad de marcha observada en salidas lunares simuladas (47 % del VO₂pico), sube al 73 %.

**Conclusiones.** Con nuestros supuestos, lo que se recupera rápido (el equilibrio, en días) no es lo que limita el alcance. Lo que lo limita (el coste de caminar con traje frente a la capacidad aeróbica de cada persona) apenas cambia en un mes, y su valor absoluto depende de supuestos de diseño del traje que hay que fijar con datos reales. La planificación debe ser probabilística, por tripulante y por pareja, y con supuestos explícitos, nunca en términos de zona segura.

## 1. Introducción

El primer paseo humano por Marte lo hará alguien que llega tras unos seis meses de ingravidez, con capacidad aeróbica reducida y equilibrio alterado, y sin apoyo en tiempo real desde la Tierra (1): en la máxima separación entre ambos planetas, una señal tarda unos 22 minutos por trayecto. El registro de riesgos para la salud humana de la NASA señala que la afectación sensoriomotora es máxima durante y poco después de los cambios de gravedad, incluidas las primeras salidas extravehiculares (2). El marco de operaciones médicas independientes de la Tierra (EIMO) propone trasladar progresivamente las decisiones a la tripulación (3).

Las herramientas cartográficas actuales, como Mars Trek o los mapas geológicos de USGS, describen el terreno a escala regional (4) y tratan al explorador como una constante. Este trabajo convierte la capacidad funcional de la tripulación en variable de planificación y la expresa como probabilidad.

**Contribuciones:**

- Un modelo de capacidad dependiente del sol con constantes de recuperación calibradas por inferencia bayesiana sobre datos de astronautas.
- La separación explícita entre variabilidad entre astronautas, incertidumbre de conocimiento, incertidumbre estructural y variables de diseño, estas últimas como escenarios.
- Una formulación probabilística del conjunto alcanzable que sustituye la noción de «zona segura».
- Una cuantificación robusta del valor de la información, que ordena qué conviene medir antes de una misión.
- Recomendaciones operativas para la herramienta Land & Stand.

## 2. Métodos

### 2.1 Marco formal

Sea Ω el conjunto de celdas, s el sol desde el aterrizaje, ψ el vector de parámetros de conocimiento y ξ el de características individuales. Una celda c es alcanzable si, sobre el camino de mínima energía γ\*, se cumplen a la vez:

```
(1) T_ida(γ*) + T_tarea + T_vuelta(γ*) ≤ (1 − ρ) · T_EVA                     †
(2) E_ida(γ*) + P_tarea · T_tarea + E_vuelta(γ*) ≤ (1 − ρ) · P_des · T_EVA    †
(3) θ_i ≤ θ_max(s)  y  |i| ≤ 0,45  en cada tramo de γ*                        †
```

γ\* se obtiene con el algoritmo de Dijkstra (5) sobre un grafo dirigido de 8 vecinos, con la energía como coste. El tiempo se integra sobre ese mismo camino, de modo que las ecuaciones 1 y 2 se evalúan sobre una única ruta. θ_i es la pendiente de cada tramo del camino, no el gradiente máximo del terreno: las diagonales de la malla permiten zigzaguear. El límite |i| ≤ 0,45 es el dominio de validez de la curva de coste en pendiente (sección 2.4).

**Variables de diseño, fijas:** reserva ρ = 0,20; T_EVA = 6 h; tarea en destino de 30 min a 300 W. Como presupuesto energético medio usamos P_des = 352 W (los 1200 Btu/h medios del soporte vital del Apolo (6)) mantenidos durante las 6 h de la salida. Esto supone un soporte vital con 1,5 veces la energía del diseño del Apolo, que era de 4 h. Con el presupuesto del Apolo (4 h), el radio mediano del sol 1 baja de 1,6 a 1,2 km (sección 3.8).

El conjunto alcanzable con confianza 1 − α es:

```
R_{1−α}(s) = { c ∈ Ω : P_{ψ,ξ}[ c cumple (1)–(3) en el sol s ] ≥ 1 − α }      † (reconstruida)
```

Es una restricción probabilística en el sentido de Charnes y Cooper (7), y formaliza la distinción entre alcanzable y seguro.

### 2.2 Recuperación aeróbica

```
VO₂máx(s) = VO₂pre · (1 − δ · e^(−s/τa))                                      †
```

Moore et al. (8) observaron en 14 astronautas, con pruebas en cicloergómetro, un cambio del VO₂pico del −15 % el día 1 (IC 95 %: −19 a −10 %) y del −2 % el día 30 (IC 95 %: −6 a +3 %). El índice de capacidad aeróbica de 37 astronautas de la ISS muestra el mismo patrón: cae tras el aterrizaje y se recupera a los 30 días (9).

**Calibración bayesiana.** Verosimilitud gaussiana (desviación típica = ancho del IC / 3,92) y distribuciones a priori uniformes poco informativas (δ en 0,01–0,40; τa en 1–80 soles), resueltas por rejilla. Resultado:

- δ: mediana 0,16 (IC creíble 90 %: 0,11–0,25).
- τa: mediana 15 soles (2–40). Con solo dos puntos queda mal identificada.

La posterior conjunta tiene correlación −0,55 entre δ y τa. En el Monte Carlo ambos se muestrean conjuntamente de la misma fila de la posterior para conservarla.

### 2.3 Recuperación sensoriomotora

Clément et al. (10) midieron en 19 tripulantes, con cinco medidas de tres pruebas funcionales (marcha en tándem, recuperación tras caída, caminar y girar), las diferencias respecto a antes del vuelo, con IC del 95 %, unas horas después del aterrizaje, al día siguiente y a los 6–11 días. El perfil temporal coincide con el del estudio Field Test, en el que la marcha en tándem empeora sobre todo en las primeras 24 h (11). Para cada medida se ajustó D(t) = D₀ · e^(−t/τ) por inferencia bayesiana sobre una rejilla (D₀, τ):

| Medida | τ mediana (IC creíble 90 %) |
|---|---|
| Marcha en tándem, ojos cerrados | 3,5 días (2,1–5,5) |
| Giro (velocidad angular) | 1,1 días (0,6–2,7) |
| Recuperación tras caída | 0,9 días (0,6–1,4) |
| Caminar y girar (tiempo) | 0,8 días (0,2–2,9) |
| Marcha en tándem, ojos abiertos | 0,5 días (0,2–0,9) |

τb se muestrea de la mezcla a partes iguales de las cinco posteriores (mediana 0,95 días; 0,35–4,4). No es un modelo jerárquico. La pendiente máxima transitable es:

```
θ_max(s) = θ_lim − Δθ · e^(−s/τb)                                             †
```

con θ_lim ~ U(20°, 30°) y Δθ ~ U(5°, 10°). La conversión del déficit sensoriomotor en grados es el supuesto más débil del modelo (nivel C).

*Figura 1 (no incluida en este texto). Recuperación sensoriomotora tras estancias de larga duración en la ISS. Puntos: déficit relativo en las cinco medidas de Clément et al. (10), normalizado por su valor el día del aterrizaje. Banda: mezcla de las posteriores de la constante de recuperación.*

### 2.4 Coste de la marcha con traje

**Modelo principal (M2).** En el ensayo EVA Walkback Test de la NASA (12), según lo resume la revisión de Ade et al. (13), caminar sobre cinta con traje presurizado a velocidad muy lenta (menos de 1 m/s) costó unos 28–30 mL/kg/min en gravedad marciana simulada y 17–20 en lunar. No pudimos consultar el informe primario, así que la velocidad exacta de esas mediciones se trata como incertidumbre. Modelamos el consumo como lineal en la velocidad, con la dependencia de la pendiente de Minetti et al. (14):

```
VO₂(V, i) = VO₂^rest + (VO₂^ref − VO₂^rest) · (V / V_ref) · C(i) / C(0)       †
C(i) = 280,5·i⁵ − 58,7·i⁴ − 76,8·i³ + 51,9·i² + 19,6·i + 2,5                  †
```

C(i) es el coste por metro en J/(kg·m) para una pendiente i, válido entre −0,45 y 0,45. Parámetros: VO₂^ref ~ U(28, 30) mL/kg/min, VO₂^rest ~ U(4, 6) mL/kg/min y V_ref ~ U(0,5; 1,0) m/s. La velocidad sostenible resultante (0,22 m/s el sol 1 con los parámetros centrales) está muy por debajo de las velocidades medidas con traje: es una extrapolación lineal fuera del rango de las mediciones y una de las mayores fuentes de incertidumbre estructural. La curva de Minetti se midió sin traje y en 1 g; escalarla por C(i)/C(0) supone que ni el traje ni la gravedad marciana cambian el efecto de la pendiente.

**Velocidad.** El astronauta camina a la mayor velocidad que mantiene su consumo por debajo de una fracción f_walk de su VO₂máx del día. Ese valor no puede superar el límite del terreno, dado por la función de Tobler normalizada y acotada por v_flat (15). En salidas lunares simuladas con traje (n = 5), la intensidad media de toda la salida fue del 31–36 % del VO₂pico, dentro de un rango sostenible del 30–40 %; los tramos de marcha fueron más intensos (recorrido de 2 km: 47 % de media, máximo 69 %) (16). En bajada, la velocidad no puede superar la velocidad sostenible en llano del mismo astronauta ese sol: con el equilibrio alterado y el traje, bajar más deprisa aumentaría el riesgo de caída (sección 3.9). Tomamos f_walk ~ U(0,30; 0,40) como escenario conservador y mostramos f_walk = 0,47 como escenario de marcha observada (sección 3.8). Las probabilidades del mapa son condicionales a esta elección.

**Modelo alternativo (M1), solo sensibilidad.** Ecuación de Pandolf et al. (17) con los términos dependientes del peso escalados por r = 0,38:

```
[Ecuación pendiente: no se conservó al copiar el texto y no está en la especificación.]
```

Con gravedad lunar, 1 m/s y η = 1,1 predice 236 W. Es del mismo orden que las medias de las EVAs completas del Apolo (228–352 W) (18), pero esas medias incluyen todas las tareas, no solo la marcha. En gravedad marciana a 0,75 m/s predice unos 14 mL/kg/min, la mitad de lo medido con traje. Además, su término de carga se aplica fuera de su rango de validación (carga mayor que la masa corporal) y produce un comportamiento de todo o nada. Por eso M1 no se combina con M2.

### 2.5 Fuentes de incertidumbre

| Parámetro | Tipo | Distribución | Nivel | Fuente |
|---|---|---|---|---|
| VO₂máx previo | Variabilidad | N(40,6; 6,4) mL/kg/min | A | (8) |
| Masa corporal W | Variabilidad | N(75; 10) kg | C | Supuesto (adultos) |
| δ y τa | Conocimiento | Posterior conjunta | A/B | Calibración con (8) |
| τb | Conocimiento | Mezcla de posteriores | A/B | Calibración con (10) |
| θ_lim / Δθ | Conocimiento | U(20°; 30°) / U(5°; 10°) | C | Supuesto |
| Intensidad de marcha f_walk | Conocimiento | U(0,30; 0,40); escenario 0,47 | B | (16) |
| Velocidad máxima en llano | Conocimiento | U(0,8; 1,2) m/s | C | Supuesto |
| VO₂^ref / VO₂^rest | Conocimiento | U(28; 30) / U(4; 6) mL/kg/min | B/C | (12), citado en (13) |
| Velocidad de referencia V_ref | Conocimiento | U(0,5; 1,0) m/s | B | (13): «menos de 1 m/s» |
| Soporte vital, duración, reserva | Diseño | Fijos; escenarios en la sección 3.8 | — | (6) |

Niveles de evidencia: A, medición directa en astronautas o en gravedad marciana simulada; B, dato análogo o calibración; C, supuesto razonado.

### 2.6 Propagación, sensibilidad y valor de la información

**Monte Carlo en un nivel.** 20 000 muestras astronauta-parámetros. Métrica resumen: el radio alcanzable en llano d\*(s), máxima distancia que cumple las ecuaciones 1 y 2 sobre regolito compacto.

**Monte Carlo en dos niveles.** 800 mundos posibles (parámetros de conocimiento) por 400 astronautas (variabilidad). Para cada mundo se calcula qué fracción de la tripulación alcanza cada distancia. La dispersión entre mundos es la incertidumbre sobre esa fracción. Es el enfoque estándar en análisis de riesgos (19). Para las salidas por parejas, el alcance de la pareja es el del miembro más limitado.

**Sensibilidad global.** Índices de Sobol de primer orden (S₁) y totales (Sₜ) con los estimadores de Saltelli et al. (20), implementados en SALib (21), sobre M2 y con las variables de diseño fijas. Para δ y τa se usan marginales uniformes sobre sus IC creíbles del 90 %, lo que ignora su correlación de −0,55.

**Valor de la información.** Decisión de referencia: elegir la distancia d del objetivo del primer paseo. Utilidad: d km de ciencia si el astronauta llega y vuelve, y −C si hay que abortar, con C = 1 o 3 km equivalentes. El valor esperado de la información parcial (22) es:

```
EVPPI(φ) = E_φ[ max_d E_{ψ|φ} U(d, ψ) ] − max_d E_ψ U(d, ψ)      (forma estándar; la ecuación original no se conservó)
```

Se estimó por regresión no paramétrica de la utilidad sobre φ (23), con polinomios de grado 3. La incertidumbre de la estimación se obtuvo con 200 réplicas bootstrap. Como referencia de ruido se calculó el EVPPI de una variable aleatoria sin relación con el resultado.

**Alcanzabilidad en terreno real.** Se usó el modelo digital de elevaciones combinado de Gale (MSL Gale Merged DEM, versión 3), construido para la misión Curiosity a partir de modelos HiRISE, CTX y HRSC ajustados a MOLA, con 1 m de resolución (24). Se leyó su versión reducida interna (promedio a 32 m) y se recortó un área de 3,52 × 3,52 km (110 × 110 celdas) entre las dunas Bagnold meridionales, Vera Rubin Ridge y Glen Torridon, en el recorrido de Curiosity (soles 1600–2840). El desnivel del área es de 546 m. El hábitat se situó sobre roca de la formación Murray (4,712° S, 137,367° E). Los seis destinos son sitios donde Curiosity tomó muestras, situados con el archivo oficial de posiciones del rover (25) en el sol del muestreo; Ireson Hill se situó en la imagen orbital (±30 m). Se resolvieron las ecuaciones 1–3 para 300 muestras y los soles 1–14, en dos escenarios: con el déficit sensoriomotor y sin él (Δθ = 0). Con 300 muestras, el error típico de una probabilidad del 70 % es de unos 2,6 puntos, y una muestra equivale a 0,33 puntos. Como pruebas de robustez se repitió el cálculo a 16 m de resolución, sin ningún límite de pendiente, con tolerancias de pendiente menores, con el hábitat desplazado 64–181 m, en los escenarios de diseño de la sección 3.8 y en un terreno sintético con un escarpe continuo de 37°.

**Reproducibilidad.** `calib.py`, `landstand_model.py`, `analysis.py`, `terrain.py`, `terrain_real.py` y `figs.py` regeneran todas las cifras y figuras con semillas fijas.

## 3. Resultados

### 3.1 Calibración y comprobaciones

| Comprobación | Modelo | Referencia | Interpretación |
|---|---|---|---|
| M1, gravedad lunar, 1 m/s | 236 W | 228–352 W, medias de EVAs del Apolo (18) | Mismo orden; no es una comparación de marcha pura |
| M1, gravedad marciana, 0,75 m/s | ≈ 14 mL/kg/min | 28–30 mL/kg/min con traje (12,13) | M1 falla: se excluye como modelo principal |
| M2, gravedad marciana | Calibrado | 28–30 mL/kg/min (12,13) | Datos de calibración, no validación independiente |
| Déficit aeróbico, días 1 y 30 | Posterior centrada en −15 % / −2 % | −15 % / −2 % (8) | Calibración |
| Recuperación sensoriomotora | τ 0,5–3,5 días | Cinco pruebas, 19 tripulantes (10) | Calibración |

Todas las filas son calibración o comprobaciones de orden de magnitud: el modelo principal no cuenta con una validación externa en gravedad marciana, y lo declaramos como limitación (sección 4.1).

### 3.2 Radio alcanzable

| Sol | Mediana (intervalo predictivo 90 %) | Radio con el 90 % de probabilidad |
|---|---|---|
| 1 | 1,6 km (0,8–2,7) | 0,95 km |
| 7 | 1,8 km (0,9–2,9) | 1,1 km |
| 14 | 1,9 km (1,0–2,9) | 1,2 km |
| 30 | 1,9 km (1,0–3,0) | 1,2 km |

*Figura 2 (no incluida). Probabilidad de que un objetivo sea alcanzable, ida y vuelta, en terreno llano, según la distancia y el sol (modelo M2). Contornos: 50 % (rojo) y 90 % (blanco).*

Con los parámetros centrales (no la mediana), la velocidad sostenible sube de 0,22 m/s el sol 1 a 0,28 m/s el sol 30, y el radio de 1,7 a 2,2 km. Con los supuestos de diseño de referencia, el límite activo suele ser el tiempo (en el 79 % de las muestras el sol 1): caminar cuesta 304–349 W, por debajo de la potencia de diseño. Con el presupuesto energético del Apolo pasaría a ser la energía (sección 3.8). La velocidad de referencia del traje mueve por sí sola el radio central del sol 1 entre 1,1 km (V_ref = 0,5 m/s) y 2,3 km (1,0 m/s).

**Sensibilidad a M1.** Con M1, el 48 % de las muestras no puede sostener la marcha el sol 1 y las demás alcanzan varios kilómetros (medianas de 1,7, 3,8 y 5,0 km los soles 1, 7 y 30). Esta bimodalidad es un artefacto del término de carga fuera de su rango de validez.

### 3.3 Qué fracción de la tripulación llega

Mediana entre mundos e intervalo creíble del 90 %:

| Distancia | Sol 1 | Sol 7 | Sol 30 |
|---|---|---|---|
| 1,0 km | 93 % (64–100) | 98 % (76–100) | 98 % (86–100) |
| 1,5 km | 69 % (6–96) | 82 % (15–98) | 89 % (27–98) |
| 2,0 km | 21 % (0–83) | 35 % (0–90) | 50 % (1–93) |
| 2,5 km | 1 % (0–46) | 3 % (0–61) | 9 % (0–75) |

**Salidas en pareja (sol 1, mediana).** A 1,0 km llega el 88 % de las parejas, frente al 93 % de los individuos. A 1,5 km, el 48 % frente al 69 %. A 2,0 km, el 2,5 % frente al 21 %.

*Figura 3 (no incluida). Fracción de la tripulación que puede ir y volver según la distancia. Líneas: mediana entre mundos simulados; bandas: intervalo creíble del 90 % (incertidumbre de conocimiento). La pendiente de la línea refleja la variabilidad entre astronautas. Discontinua: parejas el sol 1.*

### 3.4 Aptitud aeróbica frente a los requisitos de la NASA

La norma NASA-STD-3001 exige mantener en misión un VO₂máx de al menos 36,5 mL/kg/min en misiones con salidas en superficie (requisito V1 4002) y conservar al menos el 80 % de la capacidad previa (V1 4003) (26).

| Momento | Por debajo de 36,5 mL/kg/min (V1 4002) | Por debajo del 80 % del valor previo (V1 4003) |
|---|---|---|
| Antes del vuelo | 27 % | — |
| Sol 1 | 63 % | 1 % |
| Sol 7 | 47 % | 0 % |
| Sol 30 | 32 % | 0 % |

La caída relativa apenas incumple el requisito V1 4003. El problema del requisito V1 4002 es el nivel absoluto: parte de la cohorte de referencia ya está por debajo antes del vuelo, y la caída tras el aterrizaje empuja a la mayoría por debajo el primer sol.

**Advertencias.** El VO₂pico de (8) se midió en cicloergómetro, que suele dar valores un 5–10 % inferiores a la cinta; con esa corrección, el porcentaje del sol 1 bajaría al 40–52 % (y el previo al vuelo, al 13–18 %). Además, la cohorte de la ISS no se seleccionó con el requisito de 36,5 mL/kg/min, que sí se exigiría a una tripulación de Marte, y las pruebas tras el vuelo se hicieron en 1 g.

### 3.5 Sensibilidad global

*Figura 4 (no incluida). Índices de Sobol del radio alcanzable el sol 1 (M2, variables de diseño fijas). Barras claras: índice total, que incluye interacciones; oscuras: primer orden.*

El sol 1 dominan:

- El VO₂máx individual (Sₜ = 0,50; S₁ = 0,46).
- La velocidad de referencia del traje (0,31; 0,29).
- La intensidad de marcha (0,14; 0,12).

La caída aeróbica δ (0,04), el coste de pie con traje (0,03) y la masa corporal (0,03) contribuyen poco. La constante τa no pasa de 0,005 el sol 1 ni de 0,034 el sol 7. Con M2 la salida es unimodal y las interacciones son pequeñas (la suma de los Sₜ es 1,05), así que la varianza es una medida adecuada.

### 3.6 Valor de la información y decisiones operativas

| Qué se conoce antes de planificar el primer paseo | EVPPI, C = 1 (IC 90 %) | Mejora | EVPPI, C = 3 (IC 90 %) | Mejora |
|---|---|---|---|---|
| Aptitud de cada tripulante (VO₂máx, masa) | 0,17 (0,15–0,18) | +21 % | 0,28 (0,24–0,31) | +44 % |
| Curva coste-velocidad del traje | 0,10 (0,09–0,12) | +13 % | 0,10 (0,09–0,11) | +16 % |
| Intensidad de marcha f_walk | 0,05 (0,04–0,06) | +6 % | 0,05 (0,05–0,06) | +8,5 % |
| Recuperación aeróbica (δ, τa) | 0,005 (0,004–0,011) | +0,6 % | 0,004 (0,003–0,011) | +0,7 % |
| Referencia de ruido | 0,000 (0,000–0,004) | — | 0,000 (0,000–0,002) | — |

Valores en km equivalentes de ciencia. Decisión actual óptima: un objetivo a 1,0 km (C = 1, utilidad esperada 0,79) o a 0,9 km (C = 3, utilidad 0,62). La recuperación aeróbica queda en el entorno del ruido de referencia.

**Cómo leer estos valores.** La NASA ya mide el VO₂máx de cada tripulante antes del vuelo: el primer valor mide la ganancia de planificar con esa medida, y de actualizarla en misión, en lugar de con un astronauta medio. Es un cálculo con información perfecta, terreno llano y una utilidad simplificada (llegar o abortar); el rango 21–44 % refleja dos costes de abortar, no un intervalo de incertidumbre. La aptitud individual pertenece al eje de variabilidad y los demás parámetros al de conocimiento. La prioridad de investigación que se deriva es medir la curva de coste del traje de exploración en gravedad parcial y comprobar la aptitud en misión antes de la primera salida.

**La intensidad de marcha como decisión.** Con los parámetros centrales, el radio del sol 1 pasa de 1,3 km a f_walk = 0,30 a 1,7 km (0,35), 2,1 km (0,40) y 2,4 km (0,50). Por encima de 0,40 la ganancia es pequeña porque pasa a limitar la energía del soporte vital. Trabajar por encima del rango sostenible aumenta la fatiga y no está modelado. El efecto conjunto con el presupuesto energético se muestra en la sección 3.8.

### 3.7 Alcanzabilidad en terreno real

| Destino (sitio de Curiosity) | Distancia | Subida | Sol 1 | Sol 7 | Sol 14 | En llano, sol 1 |
|---|---|---|---|---|---|---|
| T1 Ogunquit Beach (duna) | 0,33 km | 0 m | > 99 % | > 99 % | > 99 % | > 99 % |
| T2 Ireson Hill | 0,53 km | −14 m | 99 % | > 99 % | > 99 % | 99 % |
| T3 Rock Hall (Vera Rubin Ridge) | 1,19 km | +157 m | 29 % | 44 % | 49 % | 78 % |
| T4 Aberlady y Kilmarie (Glen Torridon) | 1,32 km | +142 m | 26 % | 41 % | 46 % | 70 % |
| T5 Edinburgh (pedimento Greenheugh) | 1,71 km | +211 m | 4 % | 7 % | 8 % | 44 % |
| T6 Mary Anning (Glen Torridon) | 1,79 km | +171 m | 5 % | 10 % | 13 % | 39 % |

Distancia en línea recta desde el centro de la celda del hábitat. «En llano»: probabilidad de alcanzar la misma distancia en terreno llano (sección 3.2).

*Figura 5 (no incluida). Probabilidad de alcanzar cada celda ida y vuelta el sol 1 y el sol 14 sobre el terreno real de Gale, con el mosaico en color HiRISE de fondo (NASA/JPL-Caltech/University of Arizona; mosaico USGS). Triángulo: hábitat. Puntos: sitios de muestreo de Curiosity T1–T6. Contornos del 50 % (blanco) y del 90 % (naranja).*

**La subida pesa más que la distancia.** Rock Hall está a 1,2 km, pero exige subir 157 m a Vera Rubin Ridge: su probabilidad el sol 1 es del 29 %, frente al 78 % de un punto a la misma distancia en llano. En los sitios más lejanos y altos la diferencia se multiplica: Edinburgh, en el pedimento Greenheugh, tiene un 4 % frente a un 44 % en llano. Lo que crece sol a sol es lo alcanzable en terreno moderado, por la recuperación aeróbica: Rock Hall pasa del 29 % al 49 % en dos semanas.

**El equilibrio como límite de pendiente no limita con la tolerancia supuesta.** Los resultados con y sin déficit sensoriomotor coinciden en todos los objetivos (35 de 12 100 celdas cambian en una muestra). Tampoco cambian a 16 m de resolución ni al eliminar por completo el límite de pendiente: con pendientes del 20 %, la velocidad sostenible ya es de unos 0,07 m/s, así que los caminos de mínima energía nunca usan tramos empinados. Esta conclusión depende, sin embargo, de la tolerancia supuesta (nivel C):

| Pendiente máxima tolerable el sol 1 | T3 | T4 | T5 | T6 |
|---|---|---|---|---|
| Referencia (θ_lim 20–30°, Δθ 5–10°) | 29 % | 26 % | 4 % | 5 % |
| θ_lim = 15°, Δθ = 7,5° | 27 % | 23 % | 4 % | 5 % |
| θ_lim = 10°, Δθ = 7,5° | 15 % | 11 % | 2 % | 2 % |
| 6° fija (DEM a 16 m) | 7 % | 3 % | 0 % | 1 % |

En el terreno sintético, con un escarpe de 37° cuyo cruce exige al menos 20,8°, el límite cambió la probabilidad de dos objetivos el sol 1 en una sola muestra (del 0,7 % al 1,0 %).

**Robustez.** Pasar de 32 a 16 m sube Rock Hall 3 puntos (32 % frente a 29 %) y no cambia los demás destinos. Desplazar el hábitat 64 m en cualquier dirección cambia T3–T6 en 7 puntos como máximo.

### 3.8 Escenarios de diseño

| Sol 1 | Referencia | Energía del Apolo (4 h) | Marcha observada (f = 0,47) | Ambos |
|---|---|---|---|---|
| Radio mediano en llano | 1,6 km | 1,2 km | 2,3 km | 1,5 km |
| La energía es el límite activo | 21 % | 87 % | 71 % | 99 % |
| T3 Rock Hall | 29 % | 6 % | 73 % | 25 % |
| T4 Aberlady y Kilmarie | 26 % | 4 % | 71 % | 20 % |
| T5 Edinburgh | 4 % | 0 % | 31 % | 1 % |
| T6 Mary Anning | 5 % | 0,3 % | 39 % | 2 % |

Referencia: 352 W durante 6 h y f_walk ~ U(0,30; 0,40). Energía del Apolo: 352 W durante 4 h, el diseño del soporte vital del Apolo (6). Marcha observada: f_walk = 0,47, la media del recorrido de 2 km en salidas lunares simuladas (16).

Estas dos decisiones mueven las probabilidades en terreno más que cualquier parámetro fisiológico, en sentidos opuestos: un soporte vital menor las reduce y caminar más deprisa las aumenta. Las probabilidades del mapa son, por tanto, condicionales a ellas, y la herramienta permite cambiarlas. Fijarlas exige datos del traje de exploración real (energía disponible por salida y coste de la marcha en gravedad parcial).

### 3.9 Sensibilidad estructural

Además de la incertidumbre de los parámetros, comprobamos cuatro decisiones de construcción del modelo con las mismas 300 muestras (soles 1 y 14; comparaciones pareadas).

- **Bajada.** En llano, la velocidad está limitada por el metabolismo (0,22 m/s de mediana el sol 1), pero en bajada solo la limitaría la velocidad preferida. La primera versión del modelo dejaba así bajar hasta 2,7 veces más deprisa que en llano: la vuelta desde Rock Hall duraba 41 min frente a 213 min de ida. Para un astronauta con traje y el equilibrio alterado no es creíble, de modo que el caso base limita la bajada a la velocidad en llano. Es la decisión estructural que más pesa: sin ese límite, Rock Hall sería del 50 % el sol 1 (64 % el sol 14). Una variante más estricta, que reduce la velocidad de bajada según el déficit sensoriomotor del día, apenas cambia el resultado (26 %).
- **Malla.** Con 8 vecinos, los caminos en llano son de media un 5,5 % más largos que la recta (hasta un 8,2 %); con 16 vecinos, un 1,4 %. Usar 16 vecinos sube los destinos de la cresta entre 0 y 4 puntos.
- **Arena suelta.** Delimitamos las dunas Bagnold en la imagen HiRISE (15 % de la ventana, incluida Ogunquit Beach) y multiplicamos el coste neto de caminar por 1,5 o 2,0; el factor de terreno medido para arena suelta es de 2,0–2,1 (27). Ogunquit Beach no cambia, Ireson Hill pierde 3–6 puntos, Aberlady y Kilmarie 4, y el área con p ≥ 0,9 se reduce un 15–22 %.
- **Muestras sin capacidad de salida.** Solo 1 de 300 no llega a 0,05 m/s en llano; excluirla cambia las probabilidades 0,3 puntos como mucho.

| Destino | Base, sol 1 | Conservador, sol 1 | Sin límite de bajada, sol 1 | Base, sol 14 | Conservador, sol 14 |
|---|---|---|---|---|---|
| T1 Ogunquit Beach | > 99 % | > 99 % | > 99 % | > 99 % | > 99 % |
| T2 Ireson Hill | 99 % | 96 % | 99 % | > 99 % | 99 % |
| T3 Rock Hall | 29 % | 33 % | 50 % | 49 % | 50 % |
| T4 Aberlady y Kilmarie | 26 % | 25 % | 47 % | 46 % | 44 % |
| T5 Edinburgh | 4 % | 5 % | 12 % | 8 % | 11 % |
| T6 Mary Anning | 5 % | 6 % | 15 % | 13 % | 14 % |
| Área con p ≥ 0,5 | 4,5 km² | 4,4 km² | 5,4 km² | 5,6 km² | 5,7 km² |

Base: malla de 8 vecinos, sin coste de arena y bajada limitada a la velocidad en llano. Conservador: 16 vecinos y arena con factor 1,5. Con la bajada ya limitada, las demás decisiones estructurales se compensan: el caso conservador queda a menos de 5 puntos del base.

## 4. Discusión

**Hallazgo principal.** Dentro de los supuestos de diseño, el alcance a pie en los primeros soles depende sobre todo de dos cosas: la capacidad aeróbica de cada persona y el coste de caminar con el traje. La primera varía mucho entre astronautas y la segunda se conoce mal. La recuperación aeróbica tras el aterrizaje, en cambio, apenas mueve el resultado. Esta conclusión depende de que la recuperación en 0,38 g siga el patrón observado en 1 g; si fuera más lenta, la recuperación ganaría peso. Las decisiones de diseño (energía del soporte vital e intensidad de marcha) pesan más que todo lo anterior en terreno.

**Dos relojes, uno que no limita.** La recuperación sensoriomotora es rápida (constantes de 0,5–3,5 días), pero, con la tolerancia de pendiente supuesta, su recuperación no cambia la alcanzabilidad: el coste de subir pendientes con traje limita antes. Lo que sí pesa es una regla de seguridad que no depende del sol: no bajar más deprisa que en llano. Si la pendiente tolerable fuera de unos 10°, la pendiente también limitaría. Su importancia operativa está en el riesgo de caída y de lesión, que no se ha cuantificado aquí. La prueba más lenta, caminar con ojos cerrados (τ ≈ 3,5 días), sugiere tratar los primeros soles con baja visibilidad como un escenario de riesgo propio.

**Personalización y parejas.** El VO₂máx individual explica la mitad de la varianza y planificar con la aptitud medida de cada tripulante es lo que más valor añade. La salida por parejas, limitada por el más lento, reduce drásticamente el alcance a distancias intermedias. Esto justifica planificar por tripulante y por pareja, no con un astronauta medio.

**Requisitos de la NASA.** Entre cuatro y seis de cada diez astronautas simulados, con datos de la ISS, estarían por debajo del requisito de VO₂máx en misión el primer sol. Esto apunta a reforzar las contramedidas aeróbicas antes del aterrizaje o a escalonar las primeras salidas.

**Limitaciones.**

- El modelo principal (M2) se calibra con un único conjunto de mediciones con traje, citado de forma secundaria (12, citado en 13), sin validación externa en gravedad marciana. Extrapola linealmente en velocidad hasta 0,22 m/s, y la curva de Minetti se midió sin traje y en la Tierra.
- La conversión del déficit sensoriomotor en grados de pendiente no tiene datos directos (nivel C), y el riesgo de caída no se cuantifica. El equilibrio actúa como límite de pendiente y, de forma simplificada, limitando la bajada a la velocidad en llano; sin ese límite, Rock Hall pasaría del 29 % al 50 % (sección 3.9).
- Los resultados en terreno son condicionales a dos variables de diseño (energía del soporte vital e intensidad de marcha) que los cambian en hasta 45 puntos (sección 3.8).
- Los datos de readaptación proceden de regresos a 1 g y se calibran en días, aunque se aplican en soles (1 sol = 1,027 días).
- Cohortes pequeñas: 14 y 19 tripulantes, con unos 48 años de media.
- No se modela la variabilidad individual de δ, τa ni τb, solo su incertidumbre media.
- τb procede de una mezcla de posteriores, no de un modelo jerárquico.
- Los índices de Sobol ignoran la correlación entre δ y τa.
- El EVPPI depende de la función de utilidad (se muestran C = 1 y C = 3) y de la regresión elegida.
- No se modelan termorregulación, fatiga acumulada, sueño, ritmo circadiano, nutrición ni contramedidas en tránsito.
- El coste de la marcha supone regolito compacto: caminar sobre arena suelta, como en las dunas Bagnold (T1), cuesta bastante más. La malla de 8 vecinos alarga los caminos hasta un 8 % (un 5,5 % de media), lo que sesga el alcance a la baja en 0–4 puntos (sección 3.9). El hábitat es una propuesta y las fotos de cada destino son vistas del rover en el sitio, no desde el hábitat. Con 300 muestras, las probabilidades tienen un error típico de unos 2–3 puntos.
- Es un modelo de demostración para el hackathon, no una herramienta operativa.

### 4.1 Credibilidad y camino hacia el uso operativo

Evaluamos el modelo con la norma de la NASA para modelos y simulaciones, NASA-STD-7009B (revisión vigente, de 2024) (28). La norma puntúa once factores de 0 a 4 y no fija niveles obligatorios: exige comunicarlos con los resultados. Es una autoevaluación del equipo, asistida por IA, no independiente.

| Factor (NASA-STD-7009B) | Nivel | Base |
|---|---|---|
| Procedencia de los datos | 1 | Coste del traje de fuente secundaria (13); pendiente tolerable supuesta |
| Verificación | 2 | 34 pruebas; reproducción bit a bit; versión web idéntica |
| Validación | 1 | Solo calibración; sin datos en 0,38 g ni de EVAs reales |
| Revisión técnica (desarrollo y uso) | 1\* | Revisión interna asistida por IA, no independiente |
| Gestión del proceso (desarrollo y uso) | 1 | Git y pruebas, sin requisitos formales |
| Adecuación al uso | 1 | Primer uso; Marte fuera del dominio calibrado |
| Procedencia de las entradas | 2 | USGS, JPL; energía del traje del Apolo |
| Caracterización de la incertidumbre | 2 | Monte Carlo en dos niveles; diseño y forma del modelo sin propagar |
| Robustez de los resultados | 3 | Sobol, EVPPI, resolución, hábitat, escenarios |

\*Solo si el equipo confirma que revisó los hallazgos; si no, 0.

Para una demostración de criticidad mínima bastan, si los mapas dicen «alcanzable bajo los supuestos» y nunca «seguro». Para planificar EVAs reales proponemos nivel 3 en todos los factores, como hizo un panel de expertos en EVA de la NASA (29). Las brechas mayores (validación, adecuación al uso, datos, revisión independiente) no se cierran con código, sino con datos y personas.

**Hoja de ruta, por prioridad:**

1. Control de configuración, requisitos y uso previsto documentados.
2. Conseguir los informes primarios del traje (12,30) y una revisión humana independiente.
3. Consumibles del traje de exploración actual en lugar del Apolo.
4. Coste metabólico con traje según velocidad y pendiente en 0,38 g (ARGOS (31), vuelo parabólico), reservando datos para validar.
5. Pruebas funcionales en rampas tras el aterrizaje y modelo de riesgo de caída.
6. Coste en arena suelta y capa de tipos de terreno.
7. Análogos (Desert RATS, MDRS, HERA) con predicciones registradas antes de cada salida.
8. Datos de readaptación tras gravedad parcial (Artemis).
9. En misión: prueba de aptitud antes de cada EVA y actualización bayesiana con telemetría.

En uso operativo la herramienta solo asesora; deciden la tripulación y el control en Tierra. Se recalcula a diario y durante la salida, avisa cuando sale del dominio validado y muestra siempre su credibilidad.

## 5. Conclusiones

- Con nuestros supuestos, el alcance a pie temprano en Marte está limitado por el coste de caminar con traje frente a la capacidad aeróbica de cada persona, no por la recuperación tras el aterrizaje.
- El equilibrio se recupera en días y, con la tolerancia de pendiente supuesta, su recuperación no es lo que limita la alcanzabilidad. Su papel está en el riesgo de caída, y la regla de no bajar más deprisa que en llano reduce mucho el alcance a los destinos de la cresta.
- Lo más valioso para planificar es usar la aptitud medida de cada tripulante; lo más valioso que queda por medir es la curva de coste del traje en gravedad parcial.
- En terreno real, la subida pesa más que la distancia, y el resultado depende de dos decisiones de diseño (energía del soporte vital e intensidad de marcha) y de cómo se modele la bajada, que deben fijarse con datos del traje de exploración y pruebas funcionales.
- Según la norma NASA-STD-7009B, el modelo sirve para una demostración, no para operaciones: el siguiente paso no es más código, sino datos de marcha con traje en 0,38 g y una revisión humana independiente.
- La planificación debe ser probabilística, por tripulante y por pareja, y con supuestos explícitos, nunca en términos de «zona segura».

## Anexo A · Recomendaciones para el equipo

| Decisión | Recomendación | Motivo |
|---|---|---|
| Modelo | Solo M2 | M1 no reproduce los datos de Marte |
| Leyenda | Contornos del 90 % y del 50 % de probabilidad | Formaliza «alcanzable bajo supuestos» |
| Selector de tripulante | VO₂máx y masa de cada astronauta | Mayor valor de información |
| Modo pareja | El alcance lo marca el miembro más limitado | Cambia mucho el resultado a 1,5–2 km |
| Escenarios de diseño | Selector de intensidad (30–40 %, 47 %, 50 %) y de presupuesto energético (6 h o 4 h del Apolo) | Mueven el resultado más que la fisiología |
| Área de estudio | Recorte de 3,5 × 3,5 km del DEM real del USGS con seis sitios de Curiosity | El radio mediano ronda 1,6–1,9 km |
| Subidas | Mostrar el desnivel junto a la distancia de cada objetivo | Rock Hall (1,2 km, +157 m): 29 % frente al 78 % en llano |
| Crecimiento sol a sol | Enseñarlo en los destinos de subida moderada (T3, T4) | Ahí es donde se ve |
| Cálculo | La herramienta calcula en el navegador; para citar cifras, usar 300 muestras | Unos 37 s por sol con 300 muestras en Python a 32 m |

## Anexo B · Guion y presentación

**Vídeo de 30 segundos (inglés):**

> Every team will map Mars. We map Mars as it looks to a body just back from six months in zero gravity. Land & Stand shows, sol by sol, the probability that each astronaut, and each pair, can walk to a real Curiosity site on Mount Sharp and get back. Change the crew member: the map changes. We show what's reachable, for whom, how likely, and why.

**Pitch de 2 minutos:** véase el documento de entregables (versiones en español e inglés, de menos de 260 palabras).

**Siete diapositivas:**

| N.º | Título | Contenido | Criterio |
|---|---|---|---|
| 1 | Land & Stand | Pregunta gancho: ¿hasta dónde el primer día? | Presentación |
| 2 | The body is the missing layer | Desacondicionamiento, retraso de 22 min, 4–6 de cada 10 bajo el requisito el sol 1 | Relevancia |
| 3 | Reachable, sol by sol | Figura 5: Rock Hall 29 % frente al 78 % en llano | Creatividad |
| 4 | Who can make it? | Individuos frente a parejas | Validez |
| 5 | Fast clock, slow clock | Con la tolerancia supuesta, el equilibrio no es lo que limita | Validez |
| 6 | What to know first | Planificar con la aptitud medida: +21–44 %; curva del traje: +13–16 % | Impacto |
| 7 | Data, method & next steps | Datos de la NASA con créditos, código reproducible, escenarios de diseño, revisión asistida por IA declarada | Presentación |

## Anexo C · Preguntas difíciles del jurado

1. **¿Por qué descartasteis el modelo de Pandolf?** Porque en gravedad marciana predice la mitad del coste medido con traje y produce un todo o nada artificial. Lo mantenemos solo como análisis de sensibilidad.
2. **¿No es demasiado lento 0,22 m/s?** Sí, es lenta, y lo decimos: es una extrapolación lineal del coste medido con traje a menos de 1 m/s, limitada al 30–40 % del VO₂máx del día. En salidas lunares simuladas, la marcha se hizo al 47 % del VO₂pico; con ese valor, el radio mediano del sol 1 pasa de 1,6 a 2,3 km. Por eso la intensidad es un selector de escenario en la herramienta.
3. **¿Por qué el equilibrio no influye, si es lo más afectado?** Porque, con la tolerancia de pendiente supuesta (20–30°), el coste de subir con traje limita antes: a un 20 % de pendiente la velocidad sostenible ya es de 0,07 m/s. Si la pendiente tolerable fuera de 10°, Rock Hall bajaría del 29 % al 15 %. Donde sí actúa es en la bajada: no dejamos bajar más deprisa que en llano, y eso pesa mucho (sin ese límite, Rock Hall sería del 50 %). El riesgo de caída en sí no lo cuantificamos.
4. **¿Por qué un Monte Carlo en dos niveles?** Porque «los astronautas son distintos» y «no sabemos lo suficiente» se gestionan de forma diferente: la primera con mapas por tripulante y la segunda midiendo.
5. **¿Cómo sabéis que el valor de la información no es ruido?** Lo estimamos por regresión, con intervalos bootstrap y una variable de ruido como referencia, y lo mostramos con dos funciones de utilidad. La recuperación aeróbica queda al nivel del ruido; la aptitud individual y el traje, muy por encima.
6. **¿El requisito de 36,5 mL/kg/min es real?** Sí: NASA-STD-3001, requisito V1 4002, para el VO₂máx en misión con salidas en superficie.
7. **¿Por qué no «zona segura»?** Porque la seguridad exige probabilidades de fallo validadas que no existen para Marte. Mostramos probabilidades bajo supuestos visibles.
8. **¿Habéis validado el modelo?** Lo hemos calibrado con datos de astronautas y de trajes, y hemos revisado el análisis con ayuda de IA (lo declaramos). Una validación externa en gravedad marciana no existe todavía; lo decimos como limitación.
9. **¿Por qué el monte Sharp?** Porque tiene el mejor modelo de elevaciones de Marte y un recorrido de Curiosity con sitios de muestreo reales: podemos poner probabilidades sobre lugares que la ciencia ya eligió. *[Confirmar si el enunciado del reto lo menciona.]*
10. **¿Por qué 352 W durante 6 h, si el soporte vital del Apolo era de 4 h?** Es un supuesto de traje moderno y lo mostramos como escenario: con el presupuesto del Apolo, Rock Hall baja del 29 % al 6 % el sol 1. Fijarlo exige datos del traje de exploración real.
11. **¿Se podría usar en una misión real?** Todavía no, y lo decimos con la norma NASA-STD-7009B: el código está verificado y es reproducible, pero la validación es mínima porque no existen datos de marcha con traje en gravedad marciana. Tenemos la hoja de ruta para llegar.
12. **¿Qué haríais con más tiempo?** Obtener el informe primario del EVA Walkback Test, calibrar M2 con el traje de exploración actual, modelo jerárquico de recuperación por tripulante, coste en arena suelta, terreno de Gale a 1 m de resolución, cuantificación del riesgo de caída y validación en estaciones análogas como la MDRS de Utah.

## Referencias

1. Phelps SE, Martin K, Costes SV, Thompson M, Suresh R, Abadie L, et al. TOPICAL: development of medical capabilities and technologies for health monitoring, diagnostics, and treatment during human exploration spaceflight [Internet]. Houston (TX): NASA Johnson Space Center; 2021 [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/20210023828
2. National Aeronautics and Space Administration, Human System Risk Board. Risk of altered sensorimotor/vestibular function impacting critical mission tasks, human health, and long-term health (Sensorimotor Risk) [Internet]. Washington (DC): NASA; [actualizado 8 jul 2025; citado 14 nov 2026]. Disponible en: https://www.nasa.gov/directorates/esdmd/hhp/sensorimotor-risk/
3. Parker M, Krihak M, Laing C, Bardina J, Anderson A. Earth-Independent Medical Operations (EIMO) concept of operations (ConOps) [Internet]. Presentado en: NASA Human Research Program Investigators' Workshop; 13 feb 2024 [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/20240001402
4. NASA International Space Apps Challenge. Interplanetary survival guide: Martian map [Internet]. Washington (DC): NASA; 2026 [citado 14 nov 2026]. Disponible en: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
5. Dijkstra EW. A note on two problems in connexion with graphs. Numer Math. 1959;1(1):269-71. doi:10.1007/BF01386390
6. Carson MA. Apollo portable life support system performance report. En: Second Conference on Portable Life Support Systems. Washington (DC): NASA; 1972 [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/19720019460
7. Charnes A, Cooper WW. Chance-constrained programming. Manage Sci. 1959;6(1):73-9. doi:10.1287/mnsc.6.1.73
8. Moore AD Jr, Downs ME, Lee SM, Feiveson AH, Knudsen P, Ploutz-Snyder L. Peak exercise oxygen uptake during and following long-duration spaceflight. J Appl Physiol (1985). 2014;117(3):231-8. doi:10.1152/japplphysiol.01251.2013
9. Moore AD Jr, Lynn PA, Feiveson AH. The first 10 years of aerobic exercise responses to long-duration ISS flights. Aerosp Med Hum Perform. 2015;86(12 Suppl):A78-86. doi:10.3357/AMHP.EC10.2015
10. Clément G, Moudy SC, Macaulay TR, Bishop MO, Wood SJ. Mission-critical tasks for assessing risks from vestibular and sensorimotor adaptation during space exploration. Front Physiol. 2022;13:1029161. doi:10.3389/fphys.2022.1029161
11. Rosenberg MJF, Reschke MF, Cerisano JM, Kofman IS, Fisher EA, Gadd NE, et al. Field Test: results of tandem walk performance following long-duration spaceflight [resumen]. Presentado en: NASA Human Research Program Investigators' Workshop; 23-26 ene 2017; Galveston (TX) [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/20160013636
12. Norcross JR, Lee LR, Clowers KG, Morency RM, Desantis L, De Witt JK, et al. Feasibility of performing a suited 10-km ambulation on the Moon: final report of the EVA Walkback Test (EWT). Hanover (MD): NASA Center for AeroSpace Information; 2009. Informe n.º: NASA/TP-2009-214796.
13. Ade CJ, Broxterman RM, Craig JC, Schlup SJ, Wilcox SL, Warren S, et al. Prediction of lunar- and Martian-based intra- and site-to-site task performance. Aerosp Med Hum Perform. 2016;87(4):367-74. doi:10.3357/AMHP.4399.2016
14. Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. Energy cost of walking and running at extreme uphill and downhill slopes. J Appl Physiol (1985). 2002;93(3):1039-46. doi:10.1152/japplphysiol.01177.2001
15. Tobler W. Three presentations on geographical analysis and modeling. Santa Barbara (CA): National Center for Geographic Information and Analysis; 1993. Informe técnico n.º: 93-1.
16. Strock NC, Frisco D, Estep PN, Schlotman T, Norcross J, Prejean BJ, et al. Evaluation of aerobic capacity in relation to simulated lunar surface extravehicular activities [póster]. Presentado en: 94th Aerospace Medical Association Annual Scientific Meeting; 5-9 may 2024; Chicago (IL) [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/20230014953
17. Pandolf KB, Givoni B, Goldman RF. Predicting energy expenditure with loads while standing or walking very slowly. J Appl Physiol Respir Environ Exerc Physiol. 1977;43(4):577-81. doi:10.1152/jappl.1977.43.4.577
18. Waligora JM, Hawkins WR, Humbert GF, Nelson LJ, Vogel SJ, Kuznetz LH. Apollo experience report: assessment of metabolic expenditures. Washington (DC): NASA; 1975. Informe n.º: NASA TN D-7883.
19. Frey HC. Quantitative analysis of uncertainty and variability in environmental policy making. Washington (DC): American Association for the Advancement of Science; 1992.
20. Saltelli A, Annoni P, Azzini I, Campolongo F, Ratto M, Tarantola S. Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index. Comput Phys Commun. 2010;181(2):259-70. doi:10.1016/j.cpc.2009.09.018
21. Herman J, Usher W. SALib: an open-source Python library for sensitivity analysis. J Open Source Softw. 2017;2(9):97. doi:10.21105/joss.00097
22. Felli JC, Hazen GB. Sensitivity analysis and the expected value of perfect information. Med Decis Making. 1998;18(1):95-109. doi:10.1177/0272989X9801800117
23. Strong M, Oakley JE, Brennan A. Estimating multiparameter partial expected value of perfect information from a probabilistic sensitivity analysis sample: a nonparametric regression approach. Med Decis Making. 2014;34(3):311-26. doi:10.1177/0272989X13505910
24. Calef FJ III, Parker T. Mars MSL Gale merged DEM 1m, versión 3 [Internet]. Flagstaff (AZ): USGS Astrogeology Science Center; 2016 [citado 14 nov 2026]. Disponible en: https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m
25. NASA Jet Propulsion Laboratory. Mars Science Laboratory (Curiosity) rover waypoints [Internet]. Pasadena (CA): NASA/JPL-Caltech; [consultado 14 nov 2026]. Disponible en: https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json
26. National Aeronautics and Space Administration. NASA space flight human-system standard. Volume 1: crew health. NASA-STD-3001, revisión C [Internet]. Washington (DC): NASA; 2023 [citado 14 nov 2026]. Requisitos V1 4002 y V1 4003. Disponible en: https://www.nasa.gov/reference/4-0-human-performance
27. Soule RG, Goldman RF. Terrain coefficients for energy cost prediction. J Appl Physiol. 1972;32(5):706-8. doi:10.1152/jappl.1972.32.5.706
28. National Aeronautics and Space Administration. NASA-STD-7009B. Standard for models and simulations [Internet]. Washington (DC): NASA; 2024 [citado 14 nov 2026]. Disponible en: https://standards.nasa.gov/sites/default/files/standards/NASA/B/1/NASA-STD-7009B-Final-3-5-2024.pdf
29. Perkins RA, Gallo CA, Ivanoff AE, Yates KM, Schkurko CM, Somers JT, et al. Modeling and simulation credibility assessments of whole-body finite element computational models for use in NASA extravehicular activity applications. Comput Methods Biomech Biomed Engin. 2023. doi:10.1080/10255842.2023.2293653
30. Norcross JR, Clowers KG, Clark T, Harvill L, Morency RM, Stroud LC, et al. Metabolic costs and biomechanics of inclined ambulation and exploration tasks in a planetary suit [Internet]. Houston (TX): NASA Johnson Space Center; 2010 [citado 14 nov 2026]. Informe n.º: NASA/TP-2010-216125. Disponible en: https://ntrs.nasa.gov/citations/20110003409
31. Yao J, Jarvis S, Vu LQ, Kim KH, Flaspohler C, Sabahi SP, et al. In-depth analysis of subject functional performance and subjective feedback data for evaluating ARGOS simulation quality [Internet]. Presentado en: International Conference on Environmental Systems; 21-25 jul 2024; Louisville (KY) [citado 14 nov 2026]. Disponible en: https://ntrs.nasa.gov/citations/20230016453
