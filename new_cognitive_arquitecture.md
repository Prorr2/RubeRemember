# RubeRemember Cognitive Engine Specification

> **Versión:** 1.0
> **Estado:** Draft
> **Documento:** Cognitive Engine Specification
> **Dependencias:** Ninguna
>
> Este documento define el comportamiento completo del motor cognitivo de RubeRemember.
> No describe interfaces, componentes visuales ni tecnologías concretas.
> Su único objetivo es especificar cómo la aplicación toma decisiones.

---

# Índice

## Parte I · Fundamentos

1. Objetivo
2. Filosofía
3. Principios del Cognitive Engine
4. Flujo general de decisión

## Parte II · Modelo Cognitivo

5. Modelo de una Task
6. Prioridad
7. Peso
8. Estrategia de ejecución
9. Tipo de energía
10. Estado
11. Focus Tasks
12. Contexto
13. Historial
14. Progreso

## Parte III · Engines

15. Cognitive Engine
16. Recommendation Engine
17. Score Engine
18. Focus Engine
19. Session Engine
20. Energy Engine
21. Transition Engine
22. Progress Engine
23. Notification Engine

## Parte IV · Algoritmos

24. Algoritmo de recomendación
25. Algoritmo de puntuación
26. Algoritmo de Focus Tasks
27. Algoritmo de bloques
28. Algoritmo de energía
29. Algoritmo de transición
30. Algoritmo de progreso

## Parte V · Casos especiales

31. Rechazo de recomendaciones
32. Ausencia de tareas
33. Conflictos entre motores
34. Empates
35. Recordatorios urgentes
36. Casos límite

## Parte VI · Ejemplos completos

37. Escenario 1
38. Escenario 2
39. Escenario 3
40. Escenario 4

---

# 1. Objetivo

El objetivo del Cognitive Engine es responder continuamente a una única pregunta:

> **¿Qué debería hacer el usuario ahora mismo?**

Todas las decisiones de la aplicación existen para responder esa pregunta de la forma más útil posible.

La aplicación no pretende maximizar productividad.

No pretende completar el mayor número de tareas.

No pretende optimizar matemáticamente el tiempo.

Su objetivo es reducir la carga mental necesaria para decidir cuál es el siguiente paso.

Cada decisión tomada por el motor debe perseguir cuatro objetivos fundamentales.

1. Reducir el estrés del usuario.
2. Reducir el número de decisiones que el usuario debe tomar.
3. Mantener un progreso constante.
4. Adaptarse al contexto real del momento.

Si dos decisiones producen resultados similares, siempre deberá elegirse la opción que genere menor carga mental.

---

# 2. Filosofía

Las aplicaciones tradicionales almacenan tareas.

RubeRemember almacena información para poder tomar decisiones.

Una tarea, por sí sola, no contiene suficiente información para decidir si debe realizarse.

Dos tareas con la misma prioridad pueden requerir estrategias completamente distintas.

Ejemplo.

```
Responder un correo

5 minutos

Prioridad alta
```

La decisión adecuada es eliminarla inmediatamente.

Sin embargo.

```
Grabar un curso completo

20 horas

Prioridad alta
```

La decisión adecuada no es terminarla.

La decisión adecuada es avanzar.

El Cognitive Engine nunca trabaja únicamente con tareas.

Trabaja con contexto.

Cada recomendación se construye combinando múltiples dimensiones.

- Prioridad.
- Peso.
- Estrategia de ejecución.
- Energía.
- Estado.
- Focus Task.
- Contexto temporal.
- Historial reciente.
- Configuración del usuario.

La recomendación final nunca dependerá de una única variable.

Siempre será el resultado de combinar todas ellas.

---

# 3. Principios del Cognitive Engine

Todo el motor cognitivo deberá cumplir los siguientes principios.

## 3.1 Independencia

El Cognitive Engine nunca dependerá de la interfaz gráfica.

No conocerá pantallas.

No conocerá componentes.

No conocerá React Native.

Su única responsabilidad será calcular decisiones.

---

## 3.2 Determinismo

Con las mismas entradas siempre deberá producir exactamente la misma salida.

No existirán decisiones aleatorias.

Esto facilita el mantenimiento y las pruebas automáticas.

---

## 3.3 Explicabilidad

Toda recomendación deberá poder explicarse.

Nunca existirá una recomendación sin motivo.

Ejemplo.

```
Editar vídeo.

Motivo.

• Es una Focus Task.
• Hace cinco días que no avanzas.
• Dispones de una sesión libre de 45 minutos.
• La última tarea realizada fue administrativa.
```

El usuario debe comprender por qué la aplicación recomienda una tarea concreta.

---

## 3.4 Modularidad

Cada algoritmo tendrá una única responsabilidad.

Ejemplo.

Recommendation Engine:

Seleccionar la mejor recomendación.

Score Engine:

Calcular puntuaciones.

Energy Engine:

Gestionar el cambio entre tipos de energía.

Session Engine:

Definir cómo debe ejecutarse una tarea.

Ningún Engine podrá realizar el trabajo de otro.

---

## 3.5 Adaptabilidad

El motor deberá adaptarse al estilo de trabajo del usuario.

La configuración personal siempre tendrá prioridad frente a valores por defecto.

Ejemplos.

- Duración de bloques.
- Número máximo de Focus Tasks.
- Orden preferido de energías.
- Orden preferido de pesos.
- Horarios de trabajo.

---

# 4. Flujo general de decisión

El Cognitive Engine coordina todos los motores especializados.

Ningún Engine toma decisiones globales.

Cada uno resuelve un problema concreto y devuelve un resultado al Cognitive Engine.

El flujo general será siempre el siguiente.

```
Usuario abre la aplicación
            │
            ▼
   Cognitive Engine
            │
            ▼
 ¿Existe un Reminder crítico?
      │             │
     Sí             No
      │              │
Recomendar       Focus Engine
Reminder              │
                      ▼
        Obtener Focus Tasks
                      │
                      ▼
          Recommendation Engine
                      │
                      ▼
             Score Engine
                      │
                      ▼
            Energy Engine
                      │
                      ▼
          Transition Engine
                      │
                      ▼
            Session Engine
                      │
                      ▼
           Progress Engine
                      │
                      ▼
      Generar recomendación final
```

Este flujo es obligatorio.

Todos los Engines trabajan sobre la misma información, pero cada uno modifica únicamente la parte de la decisión que le corresponde.

El resultado final siempre será una única recomendación principal acompañada de su explicación, la sesión de trabajo recomendada y el motivo por el que ha sido seleccionada.

---

# PARTE II · Modelo Cognitivo

# 5. Modelo Cognitivo de una Task

## Objetivo

En RubeRemember una Task no representa únicamente una acción pendiente.

Representa una decisión futura.

El objetivo del modelo cognitivo consiste en proporcionar suficiente información para que el Cognitive Engine pueda decidir correctamente:

- Qué recomendar.
- Cuándo recomendarlo.
- Cómo recomendarlo.
- Durante cuánto tiempo.
- Qué mostrar al usuario.
- Cómo medir el progreso.

Una Task deja de ser un elemento estático y pasa a ser un objeto dinámico cuyo comportamiento cambia dependiendo de sus propiedades.

---

## Estructura Cognitiva

Toda Task estará formada por dos tipos de información.

### Información descriptiva

Describe qué es la tarea.

No influye directamente en la toma de decisiones.

Campos:

- Título
- Descripción
- Fecha
- Franja horaria
- Etiquetas
- Recordatorios asociados

---

### Información cognitiva

Describe cómo debe tratar el Cognitive Engine esa tarea.

Esta información sí modifica el comportamiento de la aplicación.

Campos:

- Prioridad
- Peso
- Estrategia de ejecución
- Tipo de energía
- Estado
- Focus Task
- Tiempo invertido
- Número de sesiones
- Último avance
- Próximo paso
- Score (calculado)
- Contexto actual (calculado)

Toda recomendación se calculará únicamente utilizando esta información cognitiva.

---

# 6. Prioridad

## Objetivo

La prioridad no indica únicamente la importancia de una tarea.

Define cuánto protagonismo debe tener dentro del sistema.

La prioridad modifica:

- El Score.
- Las recomendaciones.
- La Home.
- Las notificaciones.
- Las Focus Tasks.

Nunca modifica la forma de ejecutar la tarea.

Eso corresponde al Peso y a la Estrategia.

---

## Valores

Low

Medium

High

Estos valores son configurables por el usuario únicamente en nombre y color.

Su comportamiento interno nunca cambia.

---

## Low

Representa tareas sin urgencia inmediata.

Comportamiento.

- Nunca interrumpen otras recomendaciones.
- Nunca generan presión.
- Solo aparecen cuando el algoritmo considera que encajan bien con el contexto.
- Nunca desplazan una Focus Task.

---

## Medium

Representa tareas relevantes.

Comportamiento.

- Pueden convertirse en Focus Tasks.
- Pueden generar recordatorios discretos.
- Se recomiendan cuando no existe una High más adecuada.

---

## High

Representa tareas prioritarias.

Comportamiento.

- Aumentan considerablemente el Score.
- Dominan la Home.
- Tienen prioridad en las recomendaciones.
- Pueden desplazar otras tareas del foco.
- Sus recordatorios tienen mayor frecuencia.

Una tarea High no implica que deba realizarse inmediatamente.

Solo implica que merece mayor atención por parte del sistema.

---

# 7. Peso

## Objetivo

El Peso deja de representar únicamente una estimación temporal.

El Peso define la estrategia general con la que el usuario debe afrontar una tarea.

El comportamiento del motor cambia completamente dependiendo del Peso.

Cada Peso representa una filosofía distinta de trabajo.

---

## Pesos disponibles

🌙 Luna

🌍 Terra

☀️ Sol

⭐ Astra

Cada uno modifica:

- El Recommendation Engine.
- El Session Engine.
- El Progress Engine.
- Las estadísticas.
- Los mensajes mostrados.
- El comportamiento de la Home.

---

## 🌙 Luna

### Filosofía

Eliminar.

Las tareas Luna deben desaparecer.

El usuario obtiene satisfacción completándolas rápidamente.

Nunca deben permanecer mucho tiempo abiertas.

---

### Objetivo

Completar.

No avanzar.

---

### Progreso

Solo existen dos estados.

Pendiente.

Terminada.

Nunca se mostrará un porcentaje.

---

### Sesiones

No existen sesiones parciales.

El algoritmo recomienda terminarla completamente.

---

### Recomendaciones

Siempre buscarán huecos pequeños.

Ejemplo.

```
Dispones de 25 minutos.

Puedes terminar esta tarea ahora mismo.
```

---

### Finalización

Cuando una Luna se completa.

- Registrar fecha.
- Registrar tiempo empleado.
- Mostrar animación de celebración.
- Actualizar estadísticas.
- Solicitar inmediatamente una nueva recomendación.

---

## 🌍 Terra

### Filosofía

Construir.

Una Terra nunca pretende completarse de una vez.

Su objetivo consiste en avanzar de forma constante.

---

### Objetivo

Generar progreso.

No completar.

---

### Progreso

Mostrar:

- Porcentaje.
- Tiempo invertido.
- Número de sesiones.
- Último avance.

---

### Sesiones

Siempre utilizan bloques configurables.

Por defecto.

45 minutos.

---

### Recomendaciones

Nunca utilizar mensajes como.

```
Termina esta tarea.
```

Siempre utilizar.

```
Dedica una sesión.
```

---

## ☀️ Sol

### Filosofía

Proyecto.

Una Sol representa un trabajo suficientemente grande como para dividirse en múltiples hitos.

---

### Objetivo

Completar el siguiente paso.

Nunca completar toda la tarea.

---

### Progreso

Mostrar.

- Último avance.
- Próximo paso.
- Tiempo total invertido.
- Número de sesiones.
- Historial de avances.

---

### Sesiones

Cada sesión comienza preguntando.

```
¿Cuál será el siguiente paso?
```

Cada sesión termina preguntando.

```
¿Qué harás después?
```

El motor utiliza esta información para mantener continuidad entre sesiones.

---

## ⭐ Astra

### Filosofía

Constancia.

Una Astra representa actividades de muy largo recorrido.

No se optimizan para terminar.

Se optimizan para mantenerse.

---

### Objetivo

Evitar abandonar.

---

### Progreso

Nunca mostrar porcentaje.

Mostrar.

- Racha.
- Días activos.
- Última sesión.
- Frecuencia.

---

### Sesiones

No tienen duración fija.

Lo importante es mantener la continuidad.

Incluso sesiones muy cortas generan progreso.

---

# 8. Estrategia de ejecución

## Objetivo

Mientras el Peso responde a "cómo de grande es esta tarea", la Estrategia responde a "cómo debería afrontarse".

Es una dimensión completamente independiente.

Dos tareas pueden compartir Peso pero tener estrategias diferentes.

---

## Estrategias disponibles

Sprint

Maratón

Constancia

Espera

Esta propiedad funciona exactamente igual que Prioridad y Peso.

- Puede filtrarse.
- Puede editarse.
- Puede personalizarse.
- Participa en las recomendaciones.

---

## Sprint

La tarea debe terminarse en una única sesión.

Ejemplos.

- Responder correos.
- Comprar algo.
- Llamar por teléfono.

---

## Maratón

La tarea debe dividirse en múltiples sesiones.

El algoritmo nunca intenta terminarla de una vez.

---

## Constancia

La tarea requiere repetición.

El progreso depende de la continuidad.

No del porcentaje.

---

## Espera

La tarea depende de factores externos.

Mientras permanezca en este estado.

- No genera presión.
- No genera recomendaciones.
- No consume espacio en Focus Tasks.

Puede seguir apareciendo como información al usuario.

Pero nunca como acción recomendada.

---

# 9. Tipo de Energía

## Objetivo

La prioridad determina la importancia.

El peso determina la forma de trabajar.

La estrategia determina cómo afrontar la tarea.

El tipo de energía determina el estado mental necesario para realizarla.

El objetivo de esta dimensión es evitar la fatiga cognitiva provocada por realizar demasiadas tareas similares de forma consecutiva.

El Cognitive Engine deberá utilizar esta información para alternar tipos de trabajo siempre que sea posible.

---

## Filosofía

El cerebro humano no se fatiga únicamente por la cantidad de trabajo.

También se fatiga por mantener durante mucho tiempo el mismo tipo de esfuerzo mental.

Por ejemplo.

Tres tareas analíticas consecutivas suelen generar más cansancio que alternar entre una tarea analítica, una administrativa y una creativa.

El algoritmo intentará reducir esa acumulación de fatiga.

Nunca obligará al usuario a cambiar de contexto.

Simplemente favorecerá recomendaciones más saludables cuando existan varias opciones equivalentes.

---

## Tipos de energía

Cada Task deberá pertenecer obligatoriamente a un único tipo de energía.

Los tipos iniciales serán:

• Creativa

• Analítica

• Administrativa

• Social

• Física

• Aprendizaje

En futuras versiones podrán añadirse nuevos tipos sin modificar el funcionamiento del motor.

---

## Creativa

Requiere imaginación.

Generación de ideas.

Diseño.

Escritura.

Edición.

Producción de contenido.

Ejemplos.

- Diseñar interfaz.
- Escribir documentación.
- Editar vídeo.
- Crear miniaturas.

---

## Analítica

Requiere concentración lógica.

Resolución de problemas.

Pensamiento estructurado.

Ejemplos.

- Programar.
- Resolver errores.
- Revisar arquitectura.
- Estudiar matemáticas.

---

## Administrativa

Requiere poca creatividad.

Generalmente son tareas rutinarias.

Ejemplos.

- Responder correos.
- Organizar archivos.
- Pagar facturas.
- Ordenar documentos.

---

## Social

Implica interacción con otras personas.

Ejemplos.

- Reuniones.
- Videollamadas.
- Llamadas.
- Mensajes.
- Networking.

---

## Física

Implica actividad corporal.

Ejemplos.

- Limpiar.
- Hacer ejercicio.
- Comprar.
- Pasear.

---

## Aprendizaje

Implica adquirir nuevos conocimientos.

Ejemplos.

- Leer.
- Ver un curso.
- Estudiar.
- Investigar.

---

## Uso dentro del algoritmo

El tipo de energía modifica únicamente las recomendaciones.

Nunca modifica:

- Prioridad.
- Score.
- Focus Tasks.

Su única responsabilidad consiste en mejorar la calidad de las transiciones entre tareas.

---

# 10. Estado

## Objetivo

El estado describe la situación actual de una Task.

No describe su importancia.

No describe su dificultad.

Describe únicamente en qué punto del proceso se encuentra.

---

## Estados disponibles

Pensando

Preparando

En marcha

Bloqueada

Esperando

Terminada

---

## Pensando

La tarea todavía no ha comenzado.

No existe progreso.

Puede recomendarse.

---

## Preparando

El usuario está reuniendo información.

Ejemplo.

Buscar documentación.

Preparar material.

Organizar recursos.

Todavía no se ha comenzado el trabajo principal.

---

## En marcha

La tarea ya ha comenzado.

Existe progreso registrado.

Puede seguir recomendándose.

---

## Bloqueada

Existe algún impedimento.

Ejemplos.

Esperando información.

Falta material.

Error externo.

Una tarea bloqueada nunca podrá convertirse en recomendación principal.

Tampoco podrá formar parte de las Focus Tasks.

Seguirá apareciendo en listas para que el usuario recuerde su existencia.

---

## Esperando

La tarea depende completamente de otra persona o de una fecha futura.

Ejemplos.

Esperando respuesta.

Esperando aprobación.

Esperando entrega.

Mientras permanezca en este estado.

- No genera recomendaciones.
- No consume Focus Tasks.
- No genera presión.

---

## Terminada

La tarea ha finalizado.

Se conserva únicamente para estadísticas e historial.

Nunca vuelve a recomendarse.

---

# 11. Focus Tasks

## Objetivo

Reducir la carga mental.

La mayoría de usuarios poseen decenas o cientos de tareas pendientes.

El objetivo del sistema no consiste en mostrar todas ellas.

Consiste en seleccionar únicamente aquellas sobre las que merece la pena concentrarse.

---

## Filosofía

Las Focus Tasks representan el compromiso actual del usuario.

No son las tareas más importantes del proyecto.

Son las tareas sobre las que el sistema considera que merece la pena trabajar ahora.

El número de Focus Tasks siempre será reducido.

---

## Configuración

En Configuración General existirá el parámetro.

```
Máximo de Focus Tasks
```

Valor por defecto.

```
3
```

El usuario podrá modificar este valor.

Por ejemplo.

1

3

5

10

El algoritmo nunca superará ese límite.

---

## Selección

Las Focus Tasks no se seleccionan manualmente por defecto.

El Score Engine propondrá automáticamente cuáles deberían formar parte del foco.

El usuario podrá:

• Aceptar la propuesta.

• Eliminar alguna.

• Añadir otra.

Una vez confirmadas, el algoritmo respetará esa selección hasta el siguiente recalculo.

---

## Comportamiento

Las Focus Tasks modifican toda la aplicación.

La Home gira alrededor de ellas.

Las recomendaciones las priorizan.

Las estadísticas les dan mayor importancia.

Los recordatorios son más visibles.

El progreso se muestra continuamente.

---

## Sustitución automática

Cuando una Focus Task termina.

El algoritmo ejecutará automáticamente un nuevo cálculo.

La siguiente Task con mayor Score ocupará su lugar.

El usuario no tendrá que intervenir.

El objetivo es mantener siempre lleno el conjunto de Focus Tasks.

---

# 12. Contexto

## Objetivo

Una misma tarea puede ser una excelente recomendación por la mañana y una mala recomendación por la noche.

Por ello el Cognitive Engine nunca recomendará únicamente utilizando los datos de la Task.

También analizará el contexto actual.

---

## Variables de contexto

El contexto estará formado por:

- Hora actual.
- Día de la semana.
- Tiempo disponible.
- Franja horaria configurada.
- Recordatorios activos.
- Última tarea realizada.
- Tipo de energía reciente.
- Focus Tasks.
- Estado de las tareas.

Este contexto se recalcula cada vez que el usuario solicita una nueva recomendación.

Nunca se almacena permanentemente.

Siempre representa el momento actual.

---

## Principio fundamental

Una Task nunca es buena o mala por sí misma.

Solo puede ser adecuada o inadecuada para el contexto actual.

Todo el Cognitive Engine se construye alrededor de esta idea.

---

# PARTE III · Engines

Hasta este punto se ha definido toda la información que una Task puede contener.

A partir de ahora se define cómo esa información es utilizada para tomar decisiones.

Cada Engine tiene una única responsabilidad.

Ningún Engine conoce el funcionamiento interno de los demás.

Todos reciben información.

Todos devuelven un resultado.

Únicamente el Cognitive Engine es responsable de combinar todos esos resultados para generar una recomendación final.

---

# 13. Cognitive Engine

## Objetivo

El Cognitive Engine es el coordinador del sistema.

No contiene reglas de negocio específicas.

No calcula Scores.

No calcula Focus Tasks.

No decide sesiones.

Su única responsabilidad consiste en ejecutar todos los Engines en el orden correcto y construir una recomendación final.

Podría entenderse como el director de una orquesta.

Cada músico conoce perfectamente su instrumento.

El director únicamente coordina cuándo debe intervenir cada uno.

---

## Responsabilidades

El Cognitive Engine debe:

• Obtener el contexto actual.

• Consultar si existen recordatorios prioritarios.

• Solicitar las Focus Tasks.

• Solicitar la puntuación de todas las tareas.

• Solicitar la recomendación principal.

• Solicitar la duración de la sesión.

• Solicitar el mensaje mostrado al usuario.

• Construir la respuesta final.

Nunca deberá contener lógica específica de prioridad, energía o peso.

Toda esa lógica pertenece a otros Engines.

---

## Flujo completo

Siempre deberá ejecutarse exactamente en este orden.

```
Actualizar contexto

↓

Buscar Recordatorios

↓

Actualizar Focus Tasks

↓

Calcular Score

↓

Seleccionar candidatos

↓

Aplicar Energía

↓

Aplicar Transiciones

↓

Calcular sesión

↓

Construir recomendación

↓

Mostrar resultado
```

Ningún Engine podrá ejecutarse fuera de este flujo salvo petición explícita del usuario.

---

## Resultado

El Cognitive Engine siempre devolverá un único objeto.

```
Recommendation
```

Este objeto representa la decisión final de la aplicación.

Nunca devolverá únicamente una Task.

Siempre incluirá toda la información necesaria para comprender por qué esa tarea ha sido elegida.

---

# Recommendation

Toda recomendación estará formada por los siguientes campos.

```
Task seleccionada

Motivo principal

Motivos secundarios

Nivel de confianza

Tiempo recomendado

Tipo de sesión

Mensaje principal

Acción sugerida

Posibles alternativas
```

---

## Task seleccionada

Representa la tarea recomendada.

Solo puede existir una recomendación principal.

---

## Motivo principal

Explica por qué esa tarea ha sido elegida.

Ejemplos.

```
Forma parte de tus Focus Tasks.
```

```
Hace cinco días que no avanzas.
```

```
Dispones exactamente del tiempo necesario.
```

---

## Motivos secundarios

Permiten explicar otras decisiones del algoritmo.

Ejemplo.

```
Se ha descartado otra tarea porque acabas de terminar una actividad analítica.
```

---

## Nivel de confianza

Representa cuánto coincide la recomendación con el contexto actual.

Se expresa como un porcentaje.

Ejemplo.

```
96 %
```

No representa una probabilidad matemática.

Representa la calidad de la recomendación según las reglas del Cognitive Engine.

---

## Tiempo recomendado

Toda recomendación deberá indicar cuánto tiempo recomienda dedicar.

Ejemplos.

```
20 minutos.
```

```
45 minutos.
```

```
Hasta completar el siguiente paso.
```

Nunca se mostrará simplemente la duración estimada de la tarea.

Siempre se mostrará la duración de la sesión recomendada.

---

## Tipo de sesión

El Session Engine devolverá uno de los siguientes valores.

```
Completar

Avanzar

Mantener

Esperar
```

Estos valores modifican posteriormente la interfaz.

---

## Acción sugerida

Describe qué espera exactamente el algoritmo.

Ejemplos.

```
Termina esta tarea.
```

```
Avanza un paso.
```

```
Mantén la racha.
```

```
Espera acontecimientos externos.
```

---

## Posibles alternativas

Opcionalmente podrán devolverse hasta tres alternativas.

Nunca sustituyen a la recomendación principal.

Únicamente ofrecen opciones cuando el usuario decide descartarla.

---

# 14. Recommendation Engine

## Objetivo

Seleccionar la mejor tarea posible para el momento actual.

Este Engine nunca calcula puntuaciones.

Nunca calcula progreso.

Nunca calcula sesiones.

Únicamente compara candidatos utilizando la información proporcionada por el resto de Engines.

---

## Filosofía

El Recommendation Engine no busca la tarea más importante.

Busca la tarea más adecuada.

Una tarea extremadamente importante puede no ser recomendable en un momento determinado.

Ejemplo.

Un proyecto Sol.

Prioridad alta.

Dos horas disponibles necesarias.

Tiempo libre del usuario.

15 minutos.

Aunque su Score sea el más alto.

No será la recomendación adecuada.

---

## Entradas

El Recommendation Engine recibirá.

• Contexto actual.

• Score de todas las tareas.

• Focus Tasks.

• Recordatorios.

• Orden preferido del usuario.

• Configuración.

• Historial reciente.

Nunca accederá directamente a la base de datos.

Toda la información deberá llegar ya procesada.

---

## Selección de candidatos

El primer paso consiste en eliminar automáticamente tareas que nunca deberían recomendarse.

Ejemplos.

• Terminadas.

• Bloqueadas.

• Esperando.

• Archivadas.

• Ocultas.

Solo las tareas restantes podrán convertirse en candidatas.

---

## Orden de prioridad

Las candidatas se analizarán siempre siguiendo este orden.

```
Reminder crítico

↓

Focus Task urgente

↓

Focus Task

↓

Task con mayor Score

↓

Actividad de ocio

↓

Sin recomendación
```

Este orden nunca podrá modificarse.

---

## Comparación entre tareas

Cuando existan varias candidatas similares.

El algoritmo aplicará los siguientes criterios de desempate.

1.

Mayor compatibilidad con el tiempo disponible.

↓

2.

Mejor transición energética.

↓

3.

Mayor continuidad respecto a sesiones anteriores.

↓

4.

Mayor antigüedad sin avances.

↓

5.

Mayor Score.

El objetivo consiste en evitar que un único parámetro domine todas las recomendaciones.

---

## Rechazo de una recomendación

Si el usuario pulsa.

```
No ahora
```

La tarea no desaparece.

Simplemente recibe una penalización temporal.

Durante un tiempo configurable.

Por defecto.

Dos horas.

No volverá a recomendarse salvo que sea la única opción disponible.

Esto evita que el usuario reciba repetidamente la misma sugerencia.

---

## Ausencia de recomendaciones

Puede ocurrir que ninguna Task sea adecuada.

Ejemplos.

Todas están bloqueadas.

Todas dependen de terceros.

No existe tiempo suficiente.

En ese caso el Recommendation Engine podrá devolver.

```
Sin recomendación
```

Y el Cognitive Engine solicitará una sugerencia alternativa.

Por ejemplo.

Una actividad de ocio.

Revisar notas.

Planificar la semana.

Vaciar la bandeja de entrada.

El objetivo es que la Home nunca quede vacía, pero tampoco fuerce una mala decisión.

---

# 15. Score Engine

## Objetivo

El Score Engine calcula una puntuación objetiva para todas las tareas.

Su única responsabilidad consiste en responder una pregunta.

> ¿Qué importancia tiene esta tarea en este momento?

No decide cuál recomendar.

No conoce el tiempo disponible.

No conoce el historial de energía.

Únicamente asigna una puntuación.

Posteriormente el Recommendation Engine utilizará esa información junto al resto del contexto.

---

## Filosofía

El Score nunca representa la importancia absoluta de una tarea.

Representa la importancia relativa dentro del momento actual.

Una misma tarea puede tener puntuaciones distintas en días diferentes.

---

## Variables utilizadas

El Score se calculará utilizando las siguientes dimensiones.

• Prioridad

• Urgencia

• Peso

• Focus Task

• Tiempo sin avanzar

• Fecha límite

• Recordatorios asociados

• Estado

Cada dimensión aporta una cantidad concreta de puntos.

---

## Fórmula

```
Score =

Prioridad

+

Urgencia

+

Peso

+

Focus

+

Tiempo sin avanzar

+

Fecha límite

+

Reminder

+

Estado
```

La fórmula es acumulativa.

Cada componente podrá modificarse en futuras versiones sin afectar al resto del algoritmo.

---

## Prioridad

Low

+10

Medium

+30

High

+60

---

## Urgencia

Sin fecha

+0

Esta semana

+15

Mañana

+25

Hoy

+40

Vencida

+80

---

## Peso

El Peso no representa dificultad.

Representa impacto potencial.

Luna

+10

Terra

+20

Sol

+30

Astra

+40

Este valor no hace que Astra sea siempre prioritaria.

Simplemente reconoce que abandonar tareas largas suele tener un mayor coste.

---

## Focus Task

No

+0

Sí

+50

Las Focus Tasks siempre reciben una ventaja considerable.

---

## Tiempo sin avanzar

Menos de dos días

+0

Tres días

+10

Una semana

+20

Dos semanas

+35

Más de un mes

+50

El objetivo es evitar el abandono silencioso.

---

## Fecha límite

Más de un mes

+0

Dos semanas

+10

Una semana

+20

Tres días

+35

Hoy

+60

Vencida

+90

---

## Reminder

Sin Reminder

+0

Reminder futuro

+10

Reminder activo

+50

Reminder crítico

+100

Un Reminder crítico puede convertir una tarea secundaria en la recomendación principal.

---

## Estado

Pensando

+0

Preparando

+5

En marcha

+15

Bloqueada

-1000

Esperando

-1000

Terminada

No participa.

Una tarea bloqueada nunca podrá aparecer entre los candidatos.

---

## Resultado

Todas las tareas deberán ordenarse de mayor a menor Score.

Este ranking nunca se mostrará directamente al usuario.

Será utilizado únicamente por el Cognitive Engine.

---

# 16. Focus Engine

## Objetivo

Reducir el universo de decisiones.

Aunque existan cientos de tareas pendientes, el usuario únicamente deberá preocuparse por un pequeño conjunto.

Ese conjunto recibe el nombre de Focus Tasks.

---

## Filosofía

El Focus Engine no busca las tareas más urgentes.

Busca las tareas que más impacto tendrán durante el periodo actual.

Su misión consiste en mantener un conjunto reducido de objetivos claramente visibles.

---

## Configuración

En Configuración General existirá el parámetro.

```
Número máximo de Focus Tasks
```

Valor por defecto.

3

El usuario podrá modificarlo.

---

## Proceso de selección

Cada vez que el algoritmo se actualiza.

1.

Calcular Score de todas las tareas.

↓

2.

Eliminar tareas inválidas.

↓

3.

Ordenar por Score.

↓

4.

Seleccionar las N primeras.

↓

5.

Comprobar conflictos.

↓

6.

Guardar resultado.

---

## Exclusiones

Nunca podrán convertirse en Focus Tasks.

• Terminadas.

• Esperando.

• Bloqueadas.

• Archivadas.

• Eliminadas.

---

## Promoción automática

Cuando una Focus Task termina.

El Focus Engine deberá ejecutarse inmediatamente.

La siguiente tarea del ranking ocupará automáticamente su lugar.

El usuario nunca verá un hueco vacío.

---

## Validación

Antes de confirmar una Focus Task.

El algoritmo comprobará.

¿Tiene sentido que esta tarea permanezca en el foco?

Ejemplos donde la respuesta es negativa.

• Está esperando respuesta.

• Tiene una fecha muy lejana.

• No puede ejecutarse todavía.

En esos casos.

Se promocionará automáticamente la siguiente.

---

## Intervención del usuario

El usuario siempre mantiene el control.

Podrá.

• Añadir una Focus Task.

• Eliminar una Focus Task.

• Bloquear una Focus Task.

Una Focus Task bloqueada manualmente nunca será sustituida automáticamente.

---

# 17. Session Engine

## Objetivo

Transformar una tarea en una sesión de trabajo concreta.

Una Task representa un objetivo.

Una sesión representa una acción inmediata.

El usuario nunca trabaja sobre una Task.

Trabaja sobre una sesión.

---

## Filosofía

Una buena recomendación sin una buena sesión sigue siendo una mala experiencia.

El Session Engine traduce tareas abstractas en acciones concretas.

Siempre responderá a tres preguntas.

```
¿Cuánto tiempo?

↓

¿Con qué objetivo?

↓

¿Qué ocurre al terminar?
```

---

## Entrada

Recibe.

• Task.

• Peso.

• Estrategia.

• Tiempo disponible.

• Configuración del usuario.

---

## Salida

Devuelve.

```
Duración

Objetivo

Mensaje

Temporizador

Acción al finalizar
```

---

## Luna

Objetivo.

Completar.

Duración.

La necesaria para terminar.

Si supera el tiempo disponible.

No recomendar.

Mensaje.

```
Puedes quitártela de encima ahora mismo.
```

Al terminar.

Celebración.

Actualizar estadísticas.

Solicitar nueva recomendación.

---

## Terra

Objetivo.

Avanzar.

Duración.

Bloque configurado.

Ejemplo.

45 minutos.

Nunca recomendar terminarla.

Siempre recomendar avanzar.

Al finalizar.

Preguntar.

```
¿Has avanzado?
```

Si.

Registrar.

• Tiempo invertido.

• Número de sesiones.

• Último avance.

---

## Sol

Objetivo.

Completar el siguiente paso.

Antes de comenzar.

Preguntar.

```
¿Cuál es el siguiente paso?
```

Al finalizar.

Preguntar.

```
¿Qué harás después?
```

Registrar ambos.

La continuidad entre sesiones será uno de los principales objetivos del algoritmo.

---

## Astra

Objetivo.

Mantener el hábito.

No importa la duración.

Importa no romper la continuidad.

El Session Engine nunca obligará a realizar sesiones largas.

Incluso cinco minutos pueden ser suficientes.

Al finalizar.

Actualizar.

• Racha.

• Frecuencia.

• Última sesión.

Nunca porcentaje.

---

# 18. Energy Engine

## Objetivo

El Energy Engine tiene como misión reducir la fatiga mental del usuario.

No modifica la importancia de una tarea.

No modifica su prioridad.

No modifica su Score.

Su única responsabilidad consiste en mejorar la calidad de la siguiente decisión evitando acumulaciones innecesarias del mismo tipo de esfuerzo mental.

---

## Filosofía

El objetivo del algoritmo no es recomendar la tarea más importante.

Es recomendar la tarea más sostenible.

Dos recomendaciones con una puntuación similar no son equivalentes si una de ellas obliga al usuario a mantener el mismo tipo de esfuerzo durante horas.

Siempre que sea posible, el sistema intentará alternar tipos de energía.

---

## Historial energético

El Energy Engine mantendrá un historial de las últimas tareas completadas.

Por defecto analizará las tres últimas sesiones.

Ejemplo.

```
Analítica

↓

Analítica

↓

Administrativa
```

A partir de ese historial calculará la fatiga acumulada.

---

## Penalización

Cuando varias tareas consecutivas utilizan la misma energía se aplicará una penalización temporal.

Ejemplo.

Primera repetición

Sin penalización.

Segunda repetición

-15%.

Tercera repetición

-35%.

Cuarta repetición

-60%.

Esta penalización únicamente afecta a la recomendación actual.

Nunca modifica permanentemente el Score.

---

## Excepciones

La penalización no se aplicará cuando:

- Existe un Reminder crítico.

- Solo existe una Task disponible.

- Existe una Focus Task urgente.

- El usuario fuerza manualmente una recomendación.

---

## Objetivo final

Siempre que existan alternativas equivalentes.

El algoritmo favorecerá la variedad.

No porque aumente la productividad.

Sino porque reduce el agotamiento psicológico.

---

# 19. Transition Engine

## Objetivo

El Transition Engine organiza el orden natural entre tareas.

Mientras el Energy Engine intenta evitar fatiga.

El Transition Engine intenta crear un flujo de trabajo agradable.

No decide qué tarea hacer.

Decide cuál debería venir después.

---

## Filosofía

Cada persona posee un ritmo de trabajo distinto.

Algunas personas prefieren comenzar con tareas rápidas.

Otras necesitan empezar por el trabajo profundo.

No existe un orden universal.

Por ello el algoritmo debe ser completamente configurable.

---

## Orden de Energías

El usuario podrá configurar un flujo personalizado.

Ejemplo.

```
Creativa

↓

Administrativa

↓

Social

↓

Analítica

↓

Aprendizaje

↓

Física
```

Este orden podrá modificarse mediante Drag & Drop.

---

## Funcionamiento

Cuando dos tareas poseen puntuaciones similares.

El algoritmo comprobará cuál respeta mejor el flujo configurado.

Ejemplo.

Última tarea.

```
Creativa
```

Configuración.

```
Creativa

↓

Administrativa
```

Si existen dos tareas disponibles.

Administrativa.

Analítica.

La tarea Administrativa recibirá prioridad.

---

## Orden de Pesos

Existirá un segundo flujo completamente independiente.

Ejemplo.

```
Luna

↓

Luna

↓

Terra

↓

Sol

↓

Astra
```

Otro usuario podría preferir.

```
Sol

↓

Terra

↓

Luna

↓

Luna
```

Ambos comportamientos serán válidos.

---

## Objetivo

El algoritmo intenta construir un ritmo.

No únicamente una lista de recomendaciones.

La transición entre tareas forma parte de la experiencia del usuario.

---

## Prioridad

El Transition Engine nunca podrá romper reglas superiores.

Por ejemplo.

Un Reminder crítico siempre tendrá prioridad.

Una Focus Task urgente también.

El orden configurado solo se utilizará cuando existan varias alternativas razonables.

---

# 20. Progress Engine

## Objetivo

Medir el progreso de la forma más adecuada según el tipo de tarea.

El progreso no puede calcularse igual para todas las Tasks.

Cada Peso representa una filosofía distinta.

Por tanto.

Cada Peso necesita un sistema de progreso diferente.

---

## Luna

### Filosofía

Eliminar.

---

### Información registrada

Estado.

Hora de inicio.

Hora de finalización.

Tiempo empleado.

---

### Información mostrada

Pendiente.

Terminada.

Nunca porcentaje.

---

## Terra

### Filosofía

Avanzar.

---

### Información registrada

Tiempo invertido.

Número de sesiones.

Último avance.

Porcentaje.

---

### Información mostrada

```
67 %

12 sesiones

8 horas invertidas

Último avance

Hace dos días
```

---

## Sol

### Filosofía

Construcción continua.

---

### Información registrada

Próximo paso.

Último paso completado.

Tiempo acumulado.

Historial completo de sesiones.

Número total de avances.

---

### Información mostrada

```
Último avance

Implementado sistema de login.

Próximo paso

Añadir autenticación biométrica.
```

El porcentaje pasa a un segundo plano.

La continuidad es más importante.

---

## Astra

### Filosofía

Mantener el hábito.

---

### Información registrada

Racha.

Frecuencia.

Sesiones.

Última actividad.

Tiempo acumulado.

---

### Información mostrada

```
Racha actual

18 días.

Última sesión

Ayer.

Frecuencia media

5 sesiones por semana.
```

Nunca se mostrará un porcentaje de progreso.

---

## Registro de sesiones

Cada sesión completada almacenará automáticamente.

Fecha.

Hora.

Duración.

Resultado.

Notas opcionales.

Tipo de sesión.

Estado final.

Esta información alimentará posteriormente las estadísticas del usuario.

---

# 21. Notification Engine

## Objetivo

Recordar.

Nunca agobiar.

Las notificaciones deberán actuar como apoyo.

Nunca como presión.

---

## Filosofía

Una mala notificación puede hacer que el usuario ignore completamente la aplicación.

Por ello el Notification Engine prioriza la tranquilidad frente a la insistencia.

---

## Prioridad Low

No genera notificaciones automáticas.

Solo aparece cuando el usuario consulta la aplicación.

---

## Prioridad Medium

Puede generar recordatorios discretos.

Nunca repetitivos.

Nunca insistentes.

---

## Prioridad High

Puede generar varios recordatorios.

La frecuencia será configurable.

Siempre respetando las horas de descanso del usuario.

---

## Recordatorios

Los Recordatorios poseen prioridad absoluta sobre las recomendaciones normales.

Cuando un Reminder entra en estado activo.

El Cognitive Engine interrumpe el flujo habitual.

La recomendación principal pasa a ser ese Reminder.

Una vez atendido.

El sistema vuelve automáticamente al flujo normal.

---

## Agrupación

Cuando existan varios recordatorios simultáneos.

El sistema intentará agruparlos.

Ejemplo.

```
Hoy tienes tres recordatorios pendientes.
```

En lugar de enviar tres notificaciones independientes.

---

## Horarios protegidos

El usuario podrá definir periodos donde nunca recibirá notificaciones.

Ejemplos.

Durante el sueño.

Durante reuniones.

Durante franjas de concentración.

El Notification Engine deberá respetar siempre estas restricciones.

---

# PARTE IV · Algoritmos

A diferencia de los Engines, esta sección no describe responsabilidades.

Describe el flujo exacto que sigue el Cognitive Engine para responder a la pregunta:

> ¿Qué debería hacer el usuario ahora?

Todos los algoritmos definidos aquí son deterministas.

Con las mismas entradas siempre deberán producir exactamente el mismo resultado.

---

# 22. Algoritmo principal de recomendación

## Objetivo

Generar una única recomendación principal adaptada al contexto actual.

El algoritmo nunca debe intentar maximizar la productividad.

Debe maximizar la probabilidad de que el usuario realmente comience la tarea recomendada.

---

## Flujo completo

```
Usuario solicita recomendación

↓

Actualizar contexto

↓

Actualizar Recordatorios

↓

Actualizar Focus Tasks

↓

Calcular Score

↓

Eliminar tareas inválidas

↓

Aplicar Energy Engine

↓

Aplicar Transition Engine

↓

Seleccionar candidata

↓

Calcular sesión

↓

Generar explicación

↓

Mostrar recomendación
```

Este flujo nunca podrá modificarse.

---

## Paso 1 · Actualizar contexto

Antes de realizar cualquier cálculo se deberá reconstruir el contexto completo.

El contexto incluye:

- Hora actual.
- Día.
- Tiempo libre disponible.
- Franja horaria.
- Última tarea realizada.
- Historial energético.
- Recordatorios activos.
- Configuración del usuario.
- Focus Tasks actuales.

Ningún algoritmo utilizará información antigua.

---

## Paso 2 · Comprobar Recordatorios

Si existe un Reminder crítico.

El algoritmo se detiene.

La recomendación principal pasa automáticamente a ser dicho Reminder.

No continúa calculando candidatos.

Solo cuando el Reminder desaparezca volverá a ejecutarse el flujo completo.

---

## Paso 3 · Actualizar Focus Tasks

Ejecutar el Focus Engine.

Si existe alguna Focus Task terminada.

Seleccionar automáticamente una nueva.

Si el número máximo cambia desde la configuración.

Recalcular inmediatamente.

---

## Paso 4 · Calcular Score

Ejecutar el Score Engine sobre todas las tareas válidas.

El resultado será un ranking ordenado de mayor a menor puntuación.

Todavía no existe ninguna recomendación.

Solo existe un orden objetivo.

---

## Paso 5 · Eliminar candidatos inválidos

Eliminar automáticamente.

- Terminadas.
- Esperando.
- Bloqueadas.
- Archivadas.
- Sin contexto válido.

Este filtrado siempre ocurre antes de aplicar inteligencia adicional.

---

## Paso 6 · Aplicar Energy Engine

Modificar temporalmente el ranking.

Nunca modificar el Score.

El objetivo consiste únicamente en favorecer mejores transiciones cognitivas.

---

## Paso 7 · Aplicar Transition Engine

Comprobar.

- Orden de energías.

- Orden de pesos.

- Preferencias personales.

Cuando existan dos tareas equivalentes.

Seleccionar aquella que mejor respete el flujo configurado.

---

## Paso 8 · Selección final

Elegir la primera tarea del ranking.

Esta será la recomendación principal.

Las tres siguientes pasarán a convertirse en recomendaciones secundarias.

Nunca se mostrarán más de cuatro recomendaciones.

---

## Paso 9 · Crear sesión

Solicitar al Session Engine.

El Session Engine devolverá.

- Duración.

- Objetivo.

- Tipo.

- Acción final.

---

## Paso 10 · Generar explicación

La explicación nunca será genérica.

Siempre deberá construirse utilizando las reglas que provocaron la recomendación.

Ejemplo.

```
Esta tarea ha sido seleccionada porque:

• Es una Focus Task.

• Dispones de una sesión libre de 45 minutos.

• Hace cuatro días que no avanzas.

• La última tarea realizada fue administrativa.
```

El usuario siempre debe comprender el motivo de la decisión.

---

# 23. Algoritmo de bloques de trabajo

## Objetivo

Transformar tiempo libre en sesiones concretas.

Los bloques de trabajo pertenecen al usuario.

No pertenecen a las tareas.

---

## Configuración

Cada Peso posee una duración configurable.

Ejemplo.

```
Luna

25 minutos

Terra

45 minutos

Sol

90 minutos

Astra

20 minutos
```

Estos valores podrán modificarse libremente.

---

## Funcionamiento

Cuando el Recommendation Engine selecciona una tarea.

El algoritmo consulta automáticamente el bloque asociado a su Peso.

Ejemplo.

Task.

```
Terra
```

Configuración.

```
Terra

↓

45 minutos
```

Resultado.

```
Sesión recomendada

45 minutos
```

---

## Inicio de sesión

Cuando el usuario pulsa.

```
Comenzar
```

Se crea automáticamente una nueva sesión.

La sesión registra.

- Hora de inicio.
- Duración prevista.
- Tipo de tarea.
- Peso.
- Estrategia.

El temporizador será opcional.

Nunca obligatorio.

---

## Finalización

Al finalizar la sesión.

El algoritmo preguntará.

```
¿Has avanzado?
```

Opciones.

Sí.

No.

---

## Si responde "Sí"

Registrar automáticamente.

- Tiempo invertido.
- Último avance.
- Número de sesiones.
- Fecha del avance.

Después.

Solicitar el siguiente paso cuando corresponda.

---

## Si responde "No"

No penalizar al usuario.

Registrar únicamente que la sesión no produjo avance.

El algoritmo utilizará esta información únicamente para mejorar futuras recomendaciones.

Nunca como castigo.

---

# 24. Algoritmo de transición

## Objetivo

Construir un ritmo de trabajo agradable.

El algoritmo no intenta únicamente seleccionar tareas.

Intenta seleccionar una buena secuencia de tareas.

---

## Orden de energías

El usuario podrá definir un orden mediante Drag & Drop.

Ejemplo.

```
Creativa

↓

Administrativa

↓

Analítica

↓

Social

↓

Aprendizaje

↓

Física
```

El algoritmo intentará seguir ese flujo.

---

## Orden de pesos

Existirá un segundo orden completamente independiente.

Ejemplo.

```
Luna

↓

Luna

↓

Terra

↓

Sol

↓

Astra
```

Cada usuario podrá definir el suyo.

---

## Funcionamiento

Cuando varias tareas tengan puntuaciones similares.

El algoritmo comprobará.

¿Existe alguna que respete mejor el flujo configurado?

Si la respuesta es sí.

Esa tarea recibirá prioridad.

---

## Regla de flexibilidad

El Transition Engine nunca podrá bloquear una recomendación.

Solo podrá favorecer unas alternativas frente a otras.

La prioridad, la urgencia y los Recordatorios siempre tendrán preferencia.

---

## Ejemplo

Última tarea realizada.

```
Analítica
```

Orden configurado.

```
Analítica

↓

Social
```

Tareas disponibles.

```
Social

Score 88
```

```
Creativa

Score 89
```

Aunque la tarea Creativa posea un Score ligeramente superior.

La Social será seleccionada.

La diferencia de Score es mínima y el cambio de energía reduce la fatiga mental.

Si la diferencia fuera muy elevada.

El algoritmo ignoraría la transición y seleccionaría la tarea más importante.

---

# 25. Algoritmo de Focus Tasks

## Objetivo

Mantener un conjunto reducido de tareas sobre las que el usuario debe concentrar su atención.

El algoritmo evita que el usuario tenga que decidir constantemente entre decenas o cientos de tareas pendientes.

Las Focus Tasks representan el compromiso actual del sistema.

---

## Cuándo se ejecuta

El Focus Engine recalculará automáticamente cuando ocurra cualquiera de estos eventos.

• Se crea una nueva tarea.

• Se elimina una tarea.

• Se completa una Focus Task.

• Cambia la prioridad de una tarea.

• Cambia la fecha límite.

• Cambia el número máximo de Focus Tasks.

• El usuario fuerza un recálculo.

---

## Procedimiento

```
Calcular Score

↓

Eliminar tareas inválidas

↓

Ordenar por Score

↓

Seleccionar N primeras

↓

Validar restricciones

↓

Guardar resultado
```

---

## Restricciones

Nunca podrán convertirse en Focus Tasks.

• Tareas bloqueadas.

• Tareas esperando.

• Tareas terminadas.

• Recordatorios ya vencidos.

• Actividades de ocio.

Las actividades de ocio seguirán existiendo en la aplicación, pero nunca consumirán espacio dentro del conjunto Focus.

---

## Sustitución

Cuando una Focus Task desaparezca.

El algoritmo promocionará inmediatamente la siguiente tarea del ranking.

La Home nunca deberá mostrar menos Focus Tasks de las configuradas salvo que realmente no existan suficientes tareas.

---

# 26. Algoritmo de progreso

## Objetivo

Actualizar el estado interno de una tarea después de cada sesión.

El progreso nunca dependerá únicamente del porcentaje completado.

Dependerá del tipo de Peso.

---

## Luna

Registrar.

• Hora inicio.

• Hora fin.

• Tiempo total.

• Estado final.

Si termina.

Eliminar automáticamente de las recomendaciones.

Buscar siguiente recomendación.

---

## Terra

Registrar.

• Tiempo invertido.

• Número de sesiones.

• Último avance.

• Porcentaje.

Si el usuario indica que no ha avanzado.

No modificar el porcentaje.

Únicamente registrar la sesión.

---

## Sol

Registrar.

• Próximo paso.

• Paso completado.

• Tiempo total.

• Historial.

Cada sesión genera un nuevo avance dentro del historial.

Nunca sobrescribe información anterior.

---

## Astra

Registrar.

• Racha.

• Última actividad.

• Frecuencia.

• Número de sesiones.

La continuidad siempre tendrá prioridad sobre el porcentaje.

---

## Historial

Toda sesión quedará registrada.

Información mínima.

```
Fecha

Hora

Duración

Resultado

Tipo

Peso

Estado

Notas
```

Este historial alimentará futuras estadísticas y versiones del Learning Engine.

---

# 27. Algoritmo de aprendizaje (Future Engine)

## Objetivo

Aprender de los hábitos del usuario sin modificar automáticamente su comportamiento.

El sistema observa.

Nunca decide por sí mismo.

---

## Filosofía

El usuario siempre mantiene el control.

El algoritmo únicamente realiza sugerencias.

Nunca cambia configuraciones automáticamente.

Nunca altera prioridades.

Nunca modifica Focus Tasks.

---

## Información observada

El sistema podrá registrar.

• Horas de mayor productividad.

• Pesos completados con mayor frecuencia.

• Duración media de las sesiones.

• Energías preferidas.

• Horas en las que el usuario rechaza recomendaciones.

• Días con mayor actividad.

---

## Ejemplos

```
Las tareas Terra suelen completarse mejor entre las 18:00 y las 20:00.
```

---

```
Las tareas Creativas tienen un porcentaje de éxito mayor por la mañana.
```

---

```
Normalmente rechazas tareas Sol después de las 21:00.
```

---

## Uso

Esta información nunca modifica automáticamente el comportamiento del sistema.

Podrá utilizarse para mostrar sugerencias como.

```
Parece que rindes mejor realizando tareas creativas por la mañana.

¿Quieres mover esta tarea?
```

La decisión siempre pertenecerá al usuario.

---

# 28. Algoritmo de explicación

## Objetivo

Toda decisión tomada por el Cognitive Engine deberá ser explicable.

El usuario nunca debe preguntarse.

```
¿Por qué me recomienda esto?
```

---

## Construcción

La explicación se genera recopilando todas las reglas que han influido en la recomendación.

Ejemplo.

```
Editar vídeo

↓

Es Focus Task.

↓

Hace cuatro días que no avanzas.

↓

Dispones de una sesión libre.

↓

Después de una tarea analítica conviene cambiar de energía.

↓

Sesión recomendada de 45 minutos.
```

---

## Reglas

Las explicaciones siempre deberán ser positivas.

Correcto.

```
Hace varios días que no avanzas.

Hoy sería un buen momento para retomarla.
```

Incorrecto.

```
Llevas demasiado tiempo sin trabajar.

Deberías hacerla.
```

El objetivo consiste en reducir presión.

Nunca aumentarla.

---

# 29. Algoritmo de generación de la Home

## Objetivo

La pantalla principal nunca mostrará una lista completa de tareas.

Mostrará únicamente aquello que el usuario necesita conocer en ese momento.

---

## Orden de construcción

El Cognitive Engine generará la Home siguiendo este orden.

```
Recordatorio prioritario

↓

Recomendación principal

↓

Focus Tasks

↓

Actividad de ocio recomendada

↓

Resumen diario

↓

Progreso
```

Si alguno de estos elementos no existe.

Simplemente se omite.

Nunca se sustituye por información irrelevante.

---

## Reglas

La Home nunca mostrará más de una recomendación principal.

Nunca mostrará tareas bloqueadas.

Nunca mostrará tareas esperando como acción inmediata.

Siempre priorizará claridad frente a cantidad de información.

El objetivo de la Home es responder rápidamente a una única pregunta.

```
¿Qué debería hacer ahora?
```

Todo elemento que no ayude a responder esa pregunta deberá considerarse secundario.

---

# PARTE V · Casos especiales

Esta sección define el comportamiento del sistema cuando varias reglas entran en conflicto.

El objetivo es garantizar que el Cognitive Engine siempre produzca una única decisión coherente.

---

# 30. Jerarquía de decisiones

Cuando dos o más motores produzcan recomendaciones incompatibles, el sistema resolverá el conflicto siguiendo siempre el mismo orden.

La prioridad absoluta será:

```
1. Recordatorios críticos

↓

2. Focus Tasks urgentes

↓

3. Focus Tasks

↓

4. Score

↓

5. Energy Engine

↓

6. Transition Engine

↓

7. Preferencias personales
```

Ningún motor situado en una posición inferior podrá anular la decisión de uno superior.

---

## Ejemplo

Última tarea realizada.

```
Analítica
```

El Transition Engine recomienda cambiar a una tarea Social.

Sin embargo existe una Focus Task con fecha límite hoy.

Resultado.

La Focus Task será recomendada.

No se tendrá en cuenta la transición.

---

# 31. Conflictos entre motores

## Caso 1

Una tarea tiene el mayor Score.

Pero no existe tiempo suficiente para realizar la sesión recomendada.

Resultado.

Se descarta temporalmente.

Se selecciona la siguiente candidata.

Nunca se recomendará comenzar una sesión que el algoritmo sabe que probablemente no pueda terminarse.

---

## Caso 2

Existe una Task Luna muy sencilla.

Pero acaba de finalizar otra Task Luna.

El algoritmo comprobará el orden de pesos.

Si el usuario prefiere agrupar tareas pequeñas.

Continuará recomendando Luna.

Si prefiere alternarlas.

Buscará una Terra o Sol.

---

## Caso 3

Solo existe una tarea disponible.

Aunque rompa completamente el flujo energético.

Será recomendada.

Nunca se bloqueará una recomendación únicamente por mantener las reglas de transición.

---

## Caso 4

Dos tareas poseen exactamente el mismo Score.

El desempate seguirá este orden.

```
Focus Task

↓

Urgencia

↓

Tiempo disponible

↓

Transición energética

↓

Orden de pesos

↓

Mayor antigüedad

↓

Orden alfabético
```

Con ello el algoritmo siempre devolverá el mismo resultado.

---

# 32. Rechazo de recomendaciones

## Objetivo

Permitir que el usuario rechace una sugerencia sin romper el algoritmo.

---

## Acción

Cuando el usuario pulse.

```
No ahora
```

La tarea no desaparece.

Simplemente entra en un estado temporal de enfriamiento.

Durante ese periodo no volverá a ser recomendada salvo que sea imprescindible.

---

## Tiempo de enfriamiento

Valor por defecto.

```
2 horas
```

Configuración avanzada.

El usuario podrá modificarlo.

Ejemplo.

30 minutos.

1 hora.

2 horas.

6 horas.

24 horas.

---

## Aprendizaje

El rechazo también quedará registrado.

No como un error.

Sino como información.

En futuras versiones el Learning Engine podrá detectar patrones como.

```
Las tareas creativas suelen rechazarse después de las 22:00.
```

---

# 33. Recomendaciones de ocio

## Objetivo

La aplicación también gestiona actividades de ocio.

Estas actividades nunca competirán directamente con las tareas productivas.

Su misión es ofrecer alternativas cuando el sistema detecte que no existe una recomendación productiva adecuada.

---

## Cuándo recomendar ocio

El algoritmo podrá recomendar ocio cuando:

- No existan Focus Tasks ejecutables.

- Todas las tareas estén bloqueadas.

- El usuario complete todas sus tareas del día.

- El usuario solicite explícitamente una actividad de tiempo libre.

---

## Funcionamiento

Las actividades de ocio utilizarán un algoritmo mucho más simple.

Se priorizarán según:

• Preferencias del usuario.

• Tiempo disponible.

• Historial reciente.

• Variedad.

Nunca utilizarán Score.

Nunca pertenecerán al conjunto de Focus Tasks.

---

# 34. Recordatorios

Los Recordatorios constituyen una categoría independiente de las tareas.

No representan trabajo.

Representan información que el usuario no debe olvidar.

---

## Diferencias respecto a una Task

Una Task requiere ejecución.

Un Reminder requiere atención.

Una Task puede durar semanas.

Un Reminder suele resolverse en pocos segundos.

---

## Comportamiento

Cuando un Reminder entra en estado activo.

Interrumpe el flujo normal.

La Home mostrará el Reminder antes que cualquier recomendación.

Una vez confirmado o descartado.

El algoritmo volverá inmediatamente al funcionamiento habitual.

---

## Recordatorios futuros

Los Recordatorios futuros no afectan a las recomendaciones.

Únicamente comienzan a influir cuando alcanzan su fecha de activación.

---

# 35. Modo "No sé qué hacer"

## Objetivo

Responder rápidamente cuando el usuario abre la aplicación sin una intención concreta.

Este modo representa uno de los pilares de RubeRemember.

---

## Funcionamiento

Al pulsar el botón.

```
No sé qué hacer
```

El Cognitive Engine ejecutará el algoritmo completo.

El resultado será una única recomendación priorizada.

Nunca se mostrará una lista de veinte tareas.

---

## Contenido mostrado

La pantalla incluirá.

```
Tarea recomendada

↓

Motivo de la recomendación

↓

Duración estimada de la sesión

↓

Botón "Comenzar"

↓

Alternativas
```

El objetivo es eliminar completamente la parálisis por análisis.

---

# 36. Sin tareas disponibles

Puede ocurrir que el usuario no tenga ninguna tarea ejecutable.

En ese caso la aplicación nunca mostrará una pantalla vacía.

Podrá recomendar, por ejemplo:

• Revisar notas.

• Organizar listas.

• Planificar la semana.

• Añadir nuevas ideas.

• Realizar una actividad de ocio.

La aplicación siempre ofrecerá una acción útil, incluso cuando no existan tareas pendientes.

---

# Principios generales del Cognitive Engine

Todas las decisiones del sistema deberán respetar estos principios.

1.

Reducir la carga mental antes que aumentar la productividad.

2.

Explicar siempre por qué se toma una decisión.

3.

Nunca ocultar información al usuario.

4.

El usuario siempre conserva el control.

5.

La inteligencia propone.

El usuario decide.

6.

Las recomendaciones deben adaptarse al contexto actual.

Nunca basarse únicamente en la importancia de una tarea.

7.

Toda decisión del algoritmo debe ser determinista y reproducible.

Ante las mismas condiciones, el resultado siempre será exactamente el mismo.

---

---

# PARTE VI · Ejemplos completos

Esta sección muestra ejemplos reales del funcionamiento del Cognitive Engine.

El objetivo es eliminar cualquier ambigüedad durante la implementación.

---

# Ejemplo 1 · Usuario sin saber qué hacer

Hora actual.

```
18:15
```

Tiempo libre.

```
50 minutos
```

Focus Tasks.

```
Editar vídeo (Terra)

Preparar examen (Sol)

Llamar al banco (Luna)
```

Última tarea realizada.

```
Programar

(Energía Analítica)
```

Orden configurado.

```
Analítica

↓

Administrativa

↓

Creativa

↓

Social
```

El algoritmo ejecuta:

- No existen Recordatorios.
- Calcula el Score.
- Comprueba el tiempo disponible.
- Detecta que una sesión Terra dura 45 minutos.
- Comprueba la transición de energía.

Resultado.

```
Editar vídeo

45 minutos

Objetivo:

Avanzar.

Motivo:

• Es Focus Task.

• Dispones del tiempo suficiente.

• Cambia de una tarea analítica a una creativa.

• Hace tres días que no avanzas.
```

---

# Ejemplo 2 · Recordatorio prioritario

Hora.

```
09:00
```

Existe un Reminder.

```
Llamar al médico

09:00
```

Aunque exista una Focus Task con mayor Score.

El algoritmo interrumpe inmediatamente el flujo.

Resultado.

```
Recomendación principal

Llamar al médico
```

Una vez confirmado.

Se vuelve a ejecutar el algoritmo completo.

---

# Ejemplo 3 · Proyecto Sol

Task.

```
Crear curso completo.
```

Peso.

```
Sol
```

Sesión configurada.

```
90 minutos
```

Antes de comenzar.

La aplicación pregunta.

```
¿Cuál es el siguiente paso?
```

Respuesta.

```
Grabar el capítulo 4.
```

Al finalizar.

```
¿Has avanzado?

↓

Sí
```

La aplicación registra.

- Tiempo invertido.
- Último avance.
- Próximo paso.
- Historial.

La tarea nunca vuelve a mostrarse como simplemente "Pendiente".

Siempre continúa desde el último punto alcanzado.

---

# Ejemplo 4 · Task Astra

Task.

```
Aprender japonés.
```

Peso.

```
Astra
```

La sesión recomendada.

```
20 minutos.
```

El usuario realiza únicamente.

```
8 minutos.
```

Resultado.

La sesión cuenta como válida.

Se mantiene la racha.

No aparece ningún mensaje negativo.

El objetivo es preservar la continuidad.

---

# Ejemplo 5 · Dos tareas con el mismo Score

Task A.

```
Analítica

Score 91
```

Task B.

```
Social

Score 90
```

Última energía.

```
Analítica
```

Orden configurado.

```
Analítica

↓

Social
```

Como la diferencia de Score es mínima.

El algoritmo selecciona la Task Social.

La transición tiene prioridad cuando la diferencia de impacto es pequeña.

---

# Ejemplo 6 · Sin tareas disponibles

Todas las tareas.

```
Bloqueadas.
```

No existen Recordatorios.

El algoritmo responde.

```
Hoy no tienes ninguna tarea ejecutable.

Puedes:

• Revisar tus notas.

• Organizar listas.

• Planificar la semana.

• Disfrutar de una actividad de ocio.
```

La Home nunca queda vacía.

---

# Arquitectura final

El flujo completo del sistema queda resumido en el siguiente esquema.

```
Usuario

↓

Home

↓

"No sé qué hacer"

↓

Cognitive Engine

↓

Context Engine

↓

Reminder Engine

↓

Focus Engine

↓

Score Engine

↓

Energy Engine

↓

Transition Engine

↓

Recommendation Engine

↓

Session Engine

↓

Progress Engine

↓

Respuesta final

↓

Usuario
```

Cada módulo tiene una única responsabilidad.

Ningún Engine conoce la implementación interna de otro.

Toda la comunicación se realiza a través del Cognitive Engine.

---

# Principios de implementación

Durante el desarrollo deberán respetarse siempre los siguientes principios.

### Modularidad

Cada Engine debe ser independiente.

Nunca compartir lógica.

Nunca duplicar responsabilidades.

---

### Determinismo

Las mismas entradas deberán producir siempre el mismo resultado.

Esto facilitará enormemente las pruebas automáticas.

---

### Escalabilidad

Añadir un nuevo Peso.

Una nueva Estrategia.

Un nuevo Tipo de Energía.

O una nueva regla.

Nunca deberá requerir modificar el resto de Engines.

---

### Transparencia

Todas las recomendaciones deberán poder explicarse.

El usuario debe comprender siempre por qué la aplicación propone una tarea determinada.

---

### Flexibilidad

La inteligencia nunca sustituye al usuario.

Siempre propone.

Nunca impone.

Toda recomendación podrá ignorarse, modificarse o reemplazarse manualmente.

---

# Conclusión

Con esta arquitectura, RubeRemember deja de comportarse como un gestor de tareas tradicional.

La tarea deja de ser el elemento principal del sistema y pasa a ser simplemente una fuente de información.

El verdadero núcleo de la aplicación es el **Cognitive Engine**, un motor de decisión que analiza el contexto del usuario, interpreta el estado de sus tareas y genera recomendaciones adaptadas a cada momento.

Cada recomendación tiene en cuenta múltiples dimensiones: prioridad, urgencia, peso, estrategia de ejecución, tipo de energía, tiempo disponible, Focus Tasks, recordatorios y preferencias personales. En lugar de limitarse a ordenar una lista de tareas, el sistema construye una respuesta razonada a una única pregunta:

> **¿Qué debería hacer ahora?**

Toda la arquitectura está diseñada para ser modular, determinista y fácilmente ampliable. Cada Engine posee una responsabilidad única y bien definida, permitiendo evolucionar el sistema sin introducir dependencias innecesarias.

El objetivo final no es ayudar al usuario a almacenar más tareas, sino reducir su carga mental y facilitar la toma de decisiones diarias. Esa diferencia convierte a RubeRemember en un asistente personal centrado en el proceso de decidir, y no únicamente en el de organizar información.

---