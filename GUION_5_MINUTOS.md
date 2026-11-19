# Guion oral · EcoAccess P3 (≈ 5 minutos)

Jorge Alfonso Gutiérrez Thomas · Universidad Popular del Cesar — Ingeniería de Sistemas

> **[ACCIÓN]** indica lo que debes activar en pantalla mientras hablas. Con la tecla **N** este mismo guion aparece dentro de la presentación.

## Diapositiva 1 · EcoAccess en acción (≈ 2 min 45 s)

**1. [ACCIÓN]** Al aparecer la diapositiva, señala la estación.

Buenos días. Soy Jorge Alfonso Gutiérrez Thomas, de Ingeniería de Sistemas de la Universidad Popular del Cesar, y les presento EcoAccess P3. Partimos de un problema cotidiano: frente a tres canecas, muchas personas dudan dónde va cada residuo, y esa interacción no queda registrada en ningún lugar.

**2. [ACCIÓN]** Arrastra la estación para girarla y haz clic en una tapa.

Esta es la estación EcoAccess. Tiene tres canecas, en este orden: negra para no aprovechables, verde para orgánicos aprovechables y blanca para aprovechables. Arriba hay un único código QR, compartido por toda la estación.

**3. [ACCIÓN]** Pulsa «Iniciar demostración» (tecla 1).

Veamos el recorrido completo con una botella PET vacía. El estudiante escanea el QR y se abre la interfaz web de EcoAccess en su celular, sin instalar otra aplicación.

**4. [ACCIÓN]** Señala a ECO cuando muestre la tablet.

Aquí aparece ECO, nuestro asistente. ECO recibe la consulta y la busca en el catálogo de residuos verificados. Encuentra «botella plástica PET, vacía y seca», la clasifica como aprovechable y recomienda la caneca blanca.

**5. [ACCIÓN]** Espera a que la botella entre en la caneca blanca.

La interacción queda registrada. Una precisión importante: esta apertura de tapa es una representación demostrativa. No acredita que el hardware esté integrado ni validado, y una consulta registrada no es lo mismo que un depósito confirmado.

**6. [ACCIÓN]** Pulsa «Cáscara de banano» (2) y luego «Residuo desconocido» (4).

Con una cáscara de banano, ECO indica la caneca verde. Y si el residuo no está en el catálogo, ECO no adivina: pide una aclaración y no recomienda ninguna caneca. Esa abstención también es parte de la seguridad.

**7. [ACCIÓN]** Señala el esquema de arquitectura de la derecha.

Detrás del recorrido está esta arquitectura. En verde lo desarrollado: el bot de Telegram, el backend en C# y Oracle. En blanco lo que propone el MVP: la interfaz web, ECO con su catálogo y las funciones mínimas de operario y supervisor. En ámbar lo pendiente de validación: la IA visual y la estación física con el ESP32. Tenemos un prototipo avanzado, pero todavía no un MVP comprobado de forma integral. Por eso la pregunta siguiente es cómo construirlo y validarlo.

**8. [ACCIÓN]** Haz clic en «IA visual» y en «ESP32 + estación» del esquema.

Telegram, la IA visual y el ESP32 no se descartan: son trabajo existente que se integrará cuando la validación lo permita. Lo importante es no presentar como validado algo que solo está desarrollado.

## Diapositiva 2 · Cómo construir y validar el MVP (≈ 2 min 15 s)

**1. [ACCIÓN]** Avanza con → . Queda activa la fase 1.

Un MVP es la versión mínima que permite comprobar una hipótesis con usuarios reales. Lo organizamos en cuatro fases.

**2. [ACCIÓN]** Señala el panel derecho mientras hablas.

Nuestra hipótesis es concreta: si una persona escanea el QR y consulta su residuo con ECO, recibirá la caneca correcta en menos de noventa segundos y la interacción quedará registrada. Todo lo que no ayude a comprobar esa hipótesis queda fuera del MVP.

**3. [ACCIÓN]** Fase 1 · Definir (tecla 1). Haz clic en los niveles.

Primero, definir. Partimos del problema, identificamos a los usuarios, ciudadano, operario y supervisor, y formulamos la propuesta de valor: orientación inmediata desde el celular con registro trazable. El alcance mínimo es uno solo: consultar un residuo, recibir la caneca correcta y registrar la interacción.

**4. [ACCIÓN]** Fase 2 · Integrar (tecla 2).

Segundo, integrar. La pila mínima va del QR a la interfaz web con ECO, un catálogo inicial de al menos treinta residuos verificados, el backend en C# y la persistencia en Oracle. Añadimos una operación mínima del operario y una consulta básica del supervisor.

**5. [ACCIÓN]** Fase 3 · Probar (tecla 3). Pulsa «Recorrer pruebas».

Tercero, probar. Son siete pruebas: acceso desde un celular, clasificación correcta, residuos desconocidos, escritura y lectura en Oracle, permisos de usuario, reproducibilidad en otra computadora y, cuando corresponda, integración física. Cada prueba tiene un criterio y una evidencia; por ejemplo, para Oracle, una consulta SQL que demuestre que lo registrado se puede leer. Todas aparecen como «por ejecutar», porque así están hoy.

**6. [ACCIÓN]** Fase 4 · Validar (tecla 4). Alterna «Metas» y «Resultados reales» (tecla V).

Cuarto, validar. Estos indicadores son metas propuestas: consultas completadas, clasificaciones correctas, tiempo de interacción, abstenciones, registros persistidos, facilidad de uso y aceptación. Si cambio a resultados reales, todos aparecen sin medir: el piloto aún no se ha ejecutado, y no presentamos cifras que no existen.

**7. [ACCIÓN]** Señala la conclusión inferior.

En conclusión: el MVP de EcoAccess debe demostrar que una persona puede consultar un residuo, recibir orientación correcta y registrar la interacción de manera funcional, segura y verificable. Muchas gracias.

---

**Frase de cierre:** «El MVP de EcoAccess debe demostrar que una persona puede consultar un residuo, recibir orientación correcta y registrar la interacción de manera funcional, segura y verificable.»
