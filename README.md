# EcoAccess P3 · Presentación MVP en 3D (versión 3)

Presentación académica de **dos diapositivas interactivas** para *Innovación y Emprendimiento Tecnológico* (Universidad Popular del Cesar).
Expositor: **Jorge Alfonso Gutiérrez Thomas** · Ingeniería de Sistemas · Fecha de referencia: 19 de noviembre de 2026.

Es una renovación del proyecto anterior (`EcoAccess_P3_Presentacion_Windows.zip`): conserva sus datos técnicos, el panel técnico, los atajos y el enfoque de MVP, y rehace por completo las escenas 3D, la simulación, los esquemas y el guion.

> **Todo lo que se anima es demostrativo.** La presentación no se conecta a Telegram, Oracle, la IA visual ni al ESP32, no usa credenciales y no envía comandos. La apertura de tapas representa el comportamiento esperado: no acredita que el hardware esté integrado ni validado.

## 1. Abrir la presentación

**Sin instalar nada (Windows):** descomprime el ZIP y haz doble clic en `Abrir_presentacion.bat` (abre Edge) o en `dist/index.html`. Pulsa **F** para pantalla completa.

`dist/index.html` es un único archivo autocontenido (Three.js y GSAP incluidos). Funciona sin internet; con internet además carga las tipografías de Google Fonts. Recomendado: Edge o Chrome actualizados con aceleración por hardware.

**En línea:** versión publicada en claude.ai (ver sección 6).

## 2. Qué contiene

**Diapositiva 1 · EcoAccess en acción**
- Estación 3D con tres canecas en el orden obligatorio **NEGRA · VERDE · BLANCA**, tapas independientes con bisagra (clic para abrir/cerrar) y **un único QR** en el panel superior compartido.
- **ECO**, asistente con tablet, como protagonista: expresiones (normal, pensando, feliz, duda), cabeza que sigue la consulta, brazo que señala la caneca y tablet que consulta el catálogo.
- Teléfono 3D con la interfaz web de EcoAccess (escaneo del QR → chat con ECO → resultado), con la mención del bot de Telegram como canal existente.
- Recorrido animado de 7 pasos: Estudiante → QR → ECO → Catálogo → Clasificación → Caneca → Registro, con narración y registro de interacciones de demostración.
- Ejemplos: botella PET → BLANCA, cáscara de banano → VERDE, servilleta contaminada → NEGRA, residuo desconocido → ECO pide aclaración y no abre nada.
- Esquema de arquitectura 3D por capas (roles, canales, inteligencia, lógica, datos y hardware) con tres estados: desarrollado, propuesto para el MVP y pendiente de validación. Se ilumina al ritmo de la demostración.

**Diapositiva 2 · Cómo construir y validar el MVP**
- Cuatro islas 3D, una por fase, cada una con un esquema distinto:
  1. **Definir**: zigurat que va del problema al alcance mínimo.
  2. **Integrar**: pila QR + interfaz + ECO → catálogo (≥ 30 residuos, meta) → backend C# → Oracle, con operario y supervisor.
  3. **Probar**: circuito con las 7 pruebas, todas marcadas «por ejecutar», y un recorrido animado del protocolo.
  4. **Validar**: 7 indicadores con su meta propuesta; el modo «Resultados reales» muestra «Sin medir».
- Conclusión principal y las cuatro distinciones (consulta ≠ depósito, simulación ≠ prueba física, desarrollado ≠ validado, datos sintéticos ≠ registros reales).

## 3. Controles

| Tecla | Acción |
|---|---|
| → · Espacio · AvPág / ← · RePág | Diapositiva siguiente / anterior |
| F | Pantalla completa |
| N | Guion del expositor (palabras exactas + acciones) |
| T | Panel técnico (IDs, GPIO, resultados documentados, pendientes) |
| H o ? | Ayuda |
| M | Movimiento reducido |
| A / D · W / S | Girar · acercar o alejar la escena |
| **Diapositiva 1:** 1 · 2 · 3 · 4 | Demostración PET · banano · servilleta · desconocido |
| P · R · 0 | Pausar/reanudar · repetir · restablecer vista |
| **Diapositiva 2:** 1–4 | Ir a cada fase |
| P · V | Recorrer pruebas · alternar metas / resultados reales |

Con el ratón: arrastrar gira, la rueda acerca, clic en una tapa la abre, clic en ECO lo hace saludar, clic en un módulo de la arquitectura muestra su estado. La barra del expositor aparece abajo al mover el ratón. Ir directo a la diapositiva 2: `index.html#s2`.

## 4. Editar y recompilar

Requiere Node.js 18 o superior.

```bash
npm install
node build.mjs     # genera dist/index.html, dist/web/index.html, dist/artifact.html y GUION_5_MINUTOS.md
```

| Archivo | Qué cambiar |
|---|---|
| `src/content.js` | Textos, canecas (ID, GPIO), residuos de ejemplo, estados de la arquitectura, fases, métricas y **guion** |
| `src/index.html` · `src/styles.css` | Maquetación 1920×1080 y estilos |
| `src/eco.js` | ECO en 3D (cuerpo completo según la imagen de referencia): poses `idle`, `present`, `point`, `wave1/2`, `thumbsUp`, expresiones del visor |
| `src/station.js` | Estación: marco de tubo, cartel con QR único y «Habla con ECO», canecas con tapa abombada |
| `src/env.js` | Campus: cielo, adoquines, césped, setos con flores, árboles, edificio de ladrillo |
| `src/models.js` | Teléfono, residuos de ejemplo e íconos de la arquitectura |
| `src/slide1.js` | Escena 1 y la línea de tiempo de la demostración (`run()`) |
| `src/arch.js` | Esquema de arquitectura |
| `src/slide2.js` | Islas de las cuatro fases y panel de detalle |
| `src/main.js` | Navegación, teclado, paneles, pantalla completa |

## 4.1 Versión 3.1 (rediseño visual)

- ECO modelado a partir de las imágenes de referencia; aparece también como guía en cada fase de la diapositiva 2.
- Estación con el diseño de la imagen de referencia, conservando el código de colores de la Resolución 2184 de 2019 (negra no aprovechables, verde orgánicos, blanca aprovechables).
- Escenas a pantalla completa en un campus 3D, con luz solar, sombras suaves y bloom selectivo (render HDR + MSAA).
- Vista previa individual de modelos: `dist/eco_preview.html` y `dist/station_preview.html`.

## 5. Pruebas realizadas

- Compilación de producción sin errores (≈ 730 KB, un solo HTML).
- Ambas diapositivas renderizadas a 1920×1080 en un navegador Chromium (GPU Intel UHD): sin errores de consola, ≈ 84 llamadas de dibujo y ≈ 44 000 triángulos en la escena 1.
- Recorridos completos de los cuatro ejemplos (PET, banano, servilleta, desconocido) y de las cuatro fases, incluido el modo «Resultados reales».
- Sin desplazamiento horizontal; el escenario se escala a cualquier resolución (Full HD, 4K, proyector).
- No se probó en un proyector físico ni en teléfonos reales.

## 6. Publicación

- **Publicada en claude.ai como Artifact** (enlace HTTPS). Se crea **privada**: para que otras personas la abran, actívala desde el menú **Compartir** de la página.
- **Alternativas sin cuenta de desarrollador:** arrastra la carpeta `dist/web` a <https://app.netlify.com/drop>, o sube `dist/web/index.html` a un repositorio de GitHub y activa *Settings → Pages*. Cloudflare Pages y Vercel aceptan la misma carpeta.

## 7. Límite de verificación

Los estados de los módulos (desarrollado / propuesto / pendiente) y las cifras del panel técnico provienen de la documentación entregada por el autor (PR #11 abierto y sin fusionar en la revisión de referencia). El repositorio no fue consultado al preparar esta versión: conviene contrastarlos antes de exponer. Las metas de la fase 4 son hipótesis; no hay resultados reales del piloto.
