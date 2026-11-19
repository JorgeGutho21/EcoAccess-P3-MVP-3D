// =====================================================================
// EcoAccess P3 · Contenido académico (textos, estados, guion)
// Todo el texto editable de la presentación vive en este archivo.
// =====================================================================

// Orden visual OBLIGATORIO de la estación: NEGRA · VERDE · BLANCA
export const BINS = [
  { key: 'negra',  nombre: 'Caneca negra',  cat: 'No aprovechables',        label: ['NO', 'APROVECHABLES'],
    body: 0x1d2320, rim: 0x2b332f, text: '#F2F5F1', css: '#1D2320', id: 1401, gpio: 18 },
  { key: 'verde',  nombre: 'Caneca verde',  cat: 'Orgánicos aprovechables', label: ['ORGÁNICOS', 'APROVECHABLES'],
    body: 0x2f8a3c, rim: 0x23702f, text: '#FFFFFF', css: '#2F8A3C', id: 1400, gpio: 23 },
  { key: 'blanca', nombre: 'Caneca blanca', cat: 'Aprovechables',           label: ['RESIDUOS', 'APROVECHABLES'],
    body: 0xeef1ec, rim: 0xd5dbd3, text: '#1D2320', css: '#EEF1EC', id: 1093, gpio: 19 },
];

// Ejemplos de la demostración (catálogo ilustrativo; no son datos de producción)
export const WASTES = {
  pet: {
    key: 'pet', nombre: 'Botella PET vacía', bin: 'blanca', btn: 'Botella PET',
    query: 'Botella PET vacía', match: 'Botella plástica PET · vacía y seca',
    advice: 'Vacíala, tápala y deposítala en la caneca BLANCA.',
    reason: 'Plástico PET limpio → residuo aprovechable',
  },
  banano: {
    key: 'banano', nombre: 'Cáscara de banano', bin: 'verde', btn: 'Cáscara de banano',
    query: 'Cáscara de banano', match: 'Cáscara de fruta · orgánico',
    advice: 'Deposítala en la caneca VERDE, sin bolsa plástica.',
    reason: 'Resto de alimento → orgánico aprovechable',
  },
  servilleta: {
    key: 'servilleta', nombre: 'Servilleta contaminada', bin: 'negra', btn: 'Servilleta contaminada',
    query: 'Servilleta usada con grasa', match: 'Papel contaminado con alimento',
    advice: 'Deposítala en la caneca NEGRA: el papel sucio no se recicla.',
    reason: 'Papel con grasa → no aprovechable',
  },
  desconocido: {
    key: 'desconocido', nombre: 'Residuo desconocido', bin: null, btn: 'Residuo desconocido',
    query: 'Objeto metálico con cables', match: null,
    advice: 'No está en el catálogo verificado. ¿Puedes describirlo o tomar otra foto?',
    reason: 'Sin coincidencia verificada → ECO pide aclaración y no recomienda caneca',
  },
};

// Recorrido funcional (diapositiva 1)
export const FLOW = [
  { k: 'estudiante', t: 'Estudiante', d: 'Llega a la estación con su residuo' },
  { k: 'qr',         t: 'QR',         d: 'Escanea el único QR de la estación' },
  { k: 'eco',        t: 'ECO',        d: 'El asistente recibe la consulta' },
  { k: 'catalogo',   t: 'Catálogo',   d: 'Busca el residuo en el catálogo verificado' },
  { k: 'clasif',     t: 'Clasificación', d: 'Decide destino o pide aclaración' },
  { k: 'caneca',     t: 'Caneca',     d: 'Señala la caneca correspondiente' },
  { k: 'registro',   t: 'Registro',   d: 'Guarda la interacción' },
];

// Estados de la arquitectura (según la documentación entregada por el autor)
export const STATUS = {
  dev:  { t: 'Desarrollado', d: 'Existe en el código del proyecto' },
  mvp:  { t: 'Propuesto para el MVP', d: 'Se integra en esta versión mínima' },
  pend: { t: 'Pendiente de validación', d: 'Existe o se diseñó, pero falta prueba física o integral' },
};

export const ARCH_NODES = [
  // fila 0 · roles
  { id: 'r_ciu', row: 0, col: 0, kind: 'person', st: 'mvp', t: 'Ciudadano', s: 'Consulta y recibe orientación', icon: 'person', tint: 0x2f8a3c },
  { id: 'r_ope', row: 0, col: 1, kind: 'person', st: 'mvp', t: 'Operario', s: 'Operación mínima del MVP', icon: 'person', tint: 0x7a8a80 },
  { id: 'r_sup', row: 0, col: 2, kind: 'person', st: 'mvp', t: 'Supervisor', s: 'Consulta básica de registros', icon: 'person', tint: 0x30403a },
  // fila 1 · canales
  { id: 'web',   row: 1, col: 0, st: 'mvp', t: 'Interfaz web', s: 'Se abre con el QR, sin instalar apps', icon: 'phone' },
  { id: 'tg',    row: 1, col: 1, st: 'dev', t: 'Bot de Telegram', s: 'Canal existente: chat y fotografía', icon: 'plane' },
  { id: 'wf',    row: 1, col: 2, st: 'dev', t: 'Windows Forms', s: 'Pantallas de operario y supervisor', icon: 'window' },
  // fila 2 · inteligencia
  { id: 'eco',   row: 2, col: 0, st: 'mvp', t: 'ECO + catálogo', s: '≥ 30 residuos verificados (meta)', icon: 'eco' },
  { id: 'ia',    row: 2, col: 1, st: 'pend', t: 'IA visual', s: 'Ollama · LFM3-VL + reglas C#', icon: 'ia' },
  // fila 3 · lógica
  { id: 'cs',    row: 3, col: 1, st: 'dev', t: 'Backend C#', s: '.NET 4.8 · 4 capas · lógica de negocio', icon: 'server' },
  // fila 4 · persistencia y hardware
  { id: 'ora',   row: 4, col: 0, st: 'dev', t: 'Oracle', s: 'Persistencia · migración V026 por verificar', icon: 'db' },
  { id: 'esp',   row: 4, col: 2, st: 'pend', t: 'ESP32 + estación', s: 'Apertura física sin validar en 3 canecas', icon: 'chip' },
];

export const ARCH_EDGES = [
  ['r_ciu', 'web', 'flow'], ['r_ciu', 'tg', 'flow'], ['r_ope', 'wf'], ['r_sup', 'wf'],
  ['web', 'eco', 'flow'], ['tg', 'cs'], ['eco', 'cs', 'flow'], ['ia', 'cs'],
  ['wf', 'cs'], ['cs', 'ora', 'flow'], ['cs', 'esp', 'hw'],
];

// Qué nodos se iluminan en cada paso del recorrido
export const FLOW_TO_ARCH = {
  estudiante: ['r_ciu'], qr: ['r_ciu', 'web'], eco: ['web', 'eco'], catalogo: ['eco'],
  clasif: ['eco', 'cs'], caneca: ['cs', 'esp'], registro: ['cs', 'ora'],
};

// ---------------------------------------------------------------------
// Diapositiva 2 · Fases del MVP
// ---------------------------------------------------------------------
export const PHASES = [
  {
    n: 1, k: 'DEFINIR', q: '¿Qué debe demostrar el MVP?',
    caption: 'De lo general a lo mínimo: cada nivel reduce el alcance.',
    layers: [
      { t: 'Problema', d: 'El ciudadano duda en qué caneca va cada residuo y la interacción no queda registrada.' },
      { t: 'Usuarios', d: 'Ciudadano de la comunidad UPC, operario de la estación y supervisor.' },
      { t: 'Propuesta de valor', d: 'Orientación inmediata desde el celular, sin instalar otra aplicación, con registro trazable.' },
      { t: 'Alcance mínimo', d: 'Consultar un residuo → recibir la caneca correcta → registrar la interacción.' },
    ],
    out: 'Fuera del MVP: recompensas, Power BI, más estaciones y apertura autónoma.',
  },
  {
    n: 2, k: 'INTEGRAR', q: '¿Qué piezas forman el MVP?',
    caption: 'Pila mínima: del QR a la persistencia en Oracle.',
    parts: [
      { t: 'QR de la estación', s: 'dev', d: 'Puerta de entrada única' },
      { t: 'Interfaz web + ECO', s: 'mvp', d: 'Orienta al ciudadano' },
      { t: 'Catálogo inicial', s: 'mvp', d: '≥ 30 residuos verificados' },
      { t: 'Backend C#', s: 'dev', d: 'Reglas y lógica de negocio' },
      { t: 'Oracle', s: 'dev', d: 'Persistencia · V026 por verificar' },
      { t: 'Operario', s: 'mvp', d: 'Operación mínima' },
      { t: 'Supervisor', s: 'mvp', d: 'Consulta básica de registros' },
    ],
    note: 'Telegram, IA visual y ESP32 se conservan como módulos existentes; el MVP no depende de ellos para demostrar la propuesta central.',
  },
  {
    n: 3, k: 'PROBAR', q: '¿Cómo comprobamos cada parte?',
    caption: 'Siete pruebas en un circuito. Estado: por ejecutar.',
    tests: [
      { t: 'Acceso desde un celular', c: 'El QR abre la interfaz en Android e iOS sin instalar nada.', e: 'Video + lista de dispositivos' },
      { t: 'Clasificación correcta', c: 'Cada residuo del catálogo recibe la caneca esperada.', e: 'Tabla esperado vs. obtenido' },
      { t: 'Residuo desconocido', c: 'ECO pide aclaración y no recomienda caneca.', e: 'Casos fuera del catálogo' },
      { t: 'Escritura y lectura en Oracle', c: 'Cada consulta queda registrada y se puede leer.', e: 'Consulta SQL de verificación' },
      { t: 'Permisos de usuario', c: 'Ciudadano, operario y supervisor ven solo lo suyo.', e: 'Matriz de roles probada' },
      { t: 'Reproducibilidad', c: 'El sistema se instala y funciona en otra computadora.', e: 'Guía de instalación seguida' },
      { t: 'Integración física', c: 'Cuando corresponda: orden → ESP32 → tapa correcta.', e: 'Prueba supervisada por caneca' },
    ],
  },
  {
    n: 4, k: 'VALIDAR', q: '¿Cómo sabremos que funciona?',
    caption: 'Metas propuestas (hipótesis). Resultados reales: sin medir.',
    metrics: [
      { t: 'Consultas completadas', meta: '≥ 80 %', v: 80, max: 100, u: '%', how: 'Recorridos terminados / iniciados' },
      { t: 'Clasificaciones correctas', meta: '≥ 80 %', v: 80, max: 100, u: '%', how: 'Destino correcto / consultas resueltas' },
      { t: 'Tiempo de interacción', meta: '≤ 90 s', v: 90, max: 180, u: 's', how: 'Del escaneo al resultado', lower: true },
      { t: 'Abstención ante dudosos', meta: '≥ 95 %', v: 95, max: 100, u: '%', how: 'Errores críticos: meta = 0' },
      { t: 'Registros persistidos', meta: '100 %', v: 100, max: 100, u: '%', how: 'Filas en Oracle / consultas' },
      { t: 'Facilidad de uso', meta: '≥ 4 / 5', v: 4, max: 5, u: '', how: 'Encuesta escala 1–5' },
      { t: 'Aceptación', meta: '≥ 70 %', v: 70, max: 100, u: '%', how: 'Intención de volver a usarlo' },
    ],
  },
];

export const CONCLUSION =
  'El MVP de EcoAccess debe demostrar que una persona puede consultar un residuo, recibir orientación correcta y registrar la interacción de manera funcional, segura y verificable.';

// ---------------------------------------------------------------------
// Guion oral (≈ 5 minutos). [ACCIÓN] = lo que se activa en pantalla.
// ---------------------------------------------------------------------
export const SCRIPT = [
  {
    title: 'Diapositiva 1 · EcoAccess en acción',
    time: '≈ 2 min 45 s',
    blocks: [
      { a: 'Al aparecer la diapositiva, señala la estación.', s: 'Buenos días. Soy Jorge Alfonso Gutiérrez Thomas, de Ingeniería de Sistemas de la Universidad Popular del Cesar, y les presento EcoAccess P3. Partimos de un problema cotidiano: frente a tres canecas, muchas personas dudan dónde va cada residuo, y esa interacción no queda registrada en ningún lugar.' },
      { a: 'Arrastra la estación para girarla y haz clic en una tapa.', s: 'Esta es la estación EcoAccess. Tiene tres canecas, en este orden: negra para no aprovechables, verde para orgánicos aprovechables y blanca para aprovechables. Arriba hay un único código QR, compartido por toda la estación.' },
      { a: 'Pulsa «Iniciar demostración» (tecla 1).', s: 'Veamos el recorrido completo con una botella PET vacía. El estudiante escanea el QR y se abre la interfaz web de EcoAccess en su celular, sin instalar otra aplicación.' },
      { a: 'Señala a ECO cuando muestre la tablet.', s: 'Aquí aparece ECO, nuestro asistente. ECO recibe la consulta y la busca en el catálogo de residuos verificados. Encuentra «botella plástica PET, vacía y seca», la clasifica como aprovechable y recomienda la caneca blanca.' },
      { a: 'Espera a que la botella entre en la caneca blanca.', s: 'La interacción queda registrada. Una precisión importante: esta apertura de tapa es una representación demostrativa. No acredita que el hardware esté integrado ni validado, y una consulta registrada no es lo mismo que un depósito confirmado.' },
      { a: 'Pulsa «Cáscara de banano» (2) y luego «Residuo desconocido» (4).', s: 'Con una cáscara de banano, ECO indica la caneca verde. Y si el residuo no está en el catálogo, ECO no adivina: pide una aclaración y no recomienda ninguna caneca. Esa abstención también es parte de la seguridad.' },
      { a: 'Señala el esquema de arquitectura de la derecha.', s: 'Detrás del recorrido está esta arquitectura. En verde lo desarrollado: el bot de Telegram, el backend en C# y Oracle. En blanco lo que propone el MVP: la interfaz web, ECO con su catálogo y las funciones mínimas de operario y supervisor. En ámbar lo pendiente de validación: la IA visual y la estación física con el ESP32. Tenemos un prototipo avanzado, pero todavía no un MVP comprobado de forma integral. Por eso la pregunta siguiente es cómo construirlo y validarlo.' },
      { a: 'Haz clic en «IA visual» y en «ESP32 + estación» del esquema.', s: 'Telegram, la IA visual y el ESP32 no se descartan: son trabajo existente que se integrará cuando la validación lo permita. Lo importante es no presentar como validado algo que solo está desarrollado.' },
    ],
  },
  {
    title: 'Diapositiva 2 · Cómo construir y validar el MVP',
    time: '≈ 2 min 15 s',
    blocks: [
      { a: 'Avanza con → . Queda activa la fase 1.', s: 'Un MVP es la versión mínima que permite comprobar una hipótesis con usuarios reales. Lo organizamos en cuatro fases.' },
      { a: 'Señala el panel derecho mientras hablas.', s: 'Nuestra hipótesis es concreta: si una persona escanea el QR y consulta su residuo con ECO, recibirá la caneca correcta en menos de noventa segundos y la interacción quedará registrada. Todo lo que no ayude a comprobar esa hipótesis queda fuera del MVP.' },
      { a: 'Fase 1 · Definir (tecla 1). Haz clic en los niveles.', s: 'Primero, definir. Partimos del problema, identificamos a los usuarios, ciudadano, operario y supervisor, y formulamos la propuesta de valor: orientación inmediata desde el celular con registro trazable. El alcance mínimo es uno solo: consultar un residuo, recibir la caneca correcta y registrar la interacción.' },
      { a: 'Fase 2 · Integrar (tecla 2).', s: 'Segundo, integrar. La pila mínima va del QR a la interfaz web con ECO, un catálogo inicial de al menos treinta residuos verificados, el backend en C# y la persistencia en Oracle. Añadimos una operación mínima del operario y una consulta básica del supervisor.' },
      { a: 'Fase 3 · Probar (tecla 3). Pulsa «Recorrer pruebas».', s: 'Tercero, probar. Son siete pruebas: acceso desde un celular, clasificación correcta, residuos desconocidos, escritura y lectura en Oracle, permisos de usuario, reproducibilidad en otra computadora y, cuando corresponda, integración física. Cada prueba tiene un criterio y una evidencia; por ejemplo, para Oracle, una consulta SQL que demuestre que lo registrado se puede leer. Todas aparecen como «por ejecutar», porque así están hoy.' },
      { a: 'Fase 4 · Validar (tecla 4). Alterna «Metas» y «Resultados reales» (tecla V).', s: 'Cuarto, validar. Estos indicadores son metas propuestas: consultas completadas, clasificaciones correctas, tiempo de interacción, abstenciones, registros persistidos, facilidad de uso y aceptación. Si cambio a resultados reales, todos aparecen sin medir: el piloto aún no se ha ejecutado, y no presentamos cifras que no existen.' },
      { a: 'Señala la conclusión inferior.', s: 'En conclusión: el MVP de EcoAccess debe demostrar que una persona puede consultar un residuo, recibir orientación correcta y registrar la interacción de manera funcional, segura y verificable. Muchas gracias.' },
    ],
  },
];

// Panel técnico (se conserva del proyecto original)
export const TECH_HTML = `
<h2>Capa técnica</h2>
<p class="muted">Datos de referencia entregados por el autor. La simulación no envía comandos ni escribe en bases de datos.</p>
<h3>Tres canecas</h3>
<table><tr><th>Caneca</th><th>Categoría</th><th>ID</th><th>GPIO</th></tr>
<tr><td>Negra</td><td>No aprovechables</td><td>1401</td><td>18</td></tr>
<tr><td>Verde</td><td>Orgánicos aprovechables</td><td>1400</td><td>23</td></tr>
<tr><td>Blanca</td><td>Aprovechables</td><td>1093</td><td>19</td></tr></table>
<h3>Controles de apertura (diseñados)</h3>
<ul><li>Órdenes firmadas entre el servicio y el ESP32.</li><li>Prevención de comandos duplicados.</li><li>Una sola apertura a la vez.</li><li>Ventana de apertura de unos 10 segundos.</li><li>Ante clasificación insuficiente: orientar y no abrir.</li></ul>
<h3>Resultados documentados (conjuntos distintos)</h3>
<table><tr><th>Evaluación</th><th>Resultado</th></tr>
<tr><td>Catálogo histórico de reglas</td><td>307 tipos de objetos</td></tr>
<tr><td>Fotografías evaluadas (varios ejercicios)</td><td>546</td></tr>
<tr><td>Conjunto independiente · 317 imágenes</td><td>83,3 % de rutas correctas</td></tr>
<tr><td>Otra evaluación · 350 fotografías</td><td>61 aperturas automáticas, 1 incorrecta</td></tr>
<tr><td>Pruebas unitarias</td><td>2.096 aprobadas · 0 fallidas · 1 omitida</td></tr></table>
<p class="warn">Los denominadores no se suman ni se comparan. El 83,3 % mide rutas, no aperturas físicas. Las pruebas unitarias no equivalen a validación integral.</p>
<h3>Pendientes</h3>
<ul><li>Recorrido integral consulta → Oracle → ESP32.</li><li>Validación presencial de las tres canecas y cierre de tapas.</li><li>Migración V026 en el entorno productivo.</li><li>Servicio sin depender de una sesión de Windows abierta.</li><li>Cierre de incidencias del PR #11 (abierto en la revisión de referencia).</li></ul>
<h3>Datos experimentales</h3>
<p>50 ciudadanos ficticios y 100 depósitos sintéticos sirven para pruebas: no son participantes ni depósitos reales.</p>`;
