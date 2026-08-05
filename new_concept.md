# RubeRemember v2
## Product & Technical Specification
### Versión 2.0

Autor: OpenAI
Estado: Draft
Destinatario: Antigravity (Agente desarrollador)

---

# Capítulo 1
# Filosofía del producto

## 1.1 ¿Qué es realmente RubeRemember?

RubeRemember NO es una aplicación de tareas.

Tampoco es un calendario.

Tampoco es una agenda.

Y tampoco pretende competir con aplicaciones como Todoist, TickTick o Google Tasks.

RubeRemember nace para resolver un problema completamente distinto:

> Liberar la memoria del usuario.

El cerebro humano no está diseñado para almacenar cientos de pequeñas obligaciones, ideas, lugares, actividades, recordatorios y proyectos.

Cada elemento pendiente consume energía mental aunque no estemos pensando activamente en él.

La misión de RubeRemember es convertirse en un segundo cerebro donde el usuario pueda descargar absolutamente todo aquello que no quiere recordar constantemente.

La aplicación existe para reducir carga mental, no para aumentarla.

Este principio debe mantenerse en cualquier decisión futura.

---

## 1.2 El problema del modelo actual

Actualmente la aplicación utiliza un único modelo denominado Reminder.

Aunque técnicamente funciona, conceptualmente mezcla diferentes tipos de información.

Por ejemplo:

- Comprar pan
- Salir en bici
- Aprender React
- Llamar al médico
- Ver Oppenheimer
- Crear un backend
- Renovar el DNI

Todos ellos son Reminder.

Sin embargo representan necesidades completamente distintas.

Para el usuario no significan lo mismo.

Al mezclarlos aparecen varios problemas.

### Problema 1

Todo parece una obligación.

Aunque "Salir en bici" sea simplemente una idea para disfrutar, aparece junto a "Entregar proyecto".

El cerebro interpreta ambas cosas como pendientes.

Esto genera ansiedad.

---

### Problema 2

La cantidad de elementos deja de tener significado.

No es lo mismo tener

2 tareas

que

2 tareas + 40 actividades + 60 ideas + 15 recordatorios.

Sin embargo actualmente la aplicación comunica algo parecido a:

"Tienes 117 cosas pendientes."

Ese mensaje es psicológicamente incorrecto.

---

### Problema 3

La fecha define demasiado comportamiento.

Actualmente existen únicamente dos estados principales.

• Tiene fecha.

• No tiene fecha.

Sin embargo la fecha no define qué representa un elemento.

Una actividad puede tener fecha.

Una tarea puede no tenerla.

Un recordatorio puede desaparecer automáticamente.

Una idea puede permanecer años.

La fecha debe ser una propiedad.

Nunca la identidad del elemento.

---

### Problema 4

La pantalla principal comunica presión.

Cuando un usuario abre la aplicación porque "no sabe qué hacer", encuentra una lista enorme de elementos.

La aplicación está respondiendo a una pregunta distinta de la que el usuario realmente ha formulado.

El usuario pregunta:

"¿Qué podría hacer ahora?"

La aplicación responde:

"Aquí tienes todo lo que aún no has terminado."

Son dos necesidades completamente diferentes.

---

## 1.3 Principio fundamental

El usuario nunca debería sentir que la aplicación le está juzgando.

La aplicación no debe transmitir sensación de deuda.

Debe transmitir sensación de tranquilidad.

Cada decisión de diseño deberá preguntarse siempre:

"¿Esto reduce la carga mental o la aumenta?"

Si la respuesta es que aumenta la carga mental, probablemente la decisión sea incorrecta.

---

# Capítulo 2
# Nuevo modelo mental

La aplicación deja de organizar la información alrededor de tareas.

Empieza a organizarla alrededor de intención.

Es decir:

¿Por qué existe este elemento?

No:

¿Cuándo ocurre?

---

## Existen tres grandes categorías

### Recordatorio

Existe porque el usuario no quiere olvidarlo.

No implica trabajo.

No implica progreso.

No implica productividad.

Simplemente debe aparecer en el momento adecuado.

Ejemplos:

- Comprar pan
- Llamar a mi madre
- Renovar el DNI
- Preguntar algo a un compañero
- Llevar el cargador

---

### Tarea

Existe porque requiere trabajo.

Tiene progreso.

Puede pertenecer a un objetivo.

Puede dividirse.

Puede requerir varias sesiones.

Puede durar semanas.

Ejemplos:

- Crear backend
- Editar vídeo
- Preparar examen
- Aprender Docker
- Diseñar la web

---

### Actividad

Existe porque el usuario quiere disfrutarla.

No debería sentirse como obligación.

No debería producir culpa.

Su objetivo es inspirar cuando el usuario tenga tiempo libre.

Ejemplos:

- Ir al cine
- Salir en bici
- Probar un restaurante
- Hacer una ruta
- Ver una película

---

## Diferencias

Recordatorio

"No quiero olvidarlo."

---

Tarea

"Quiero terminarlo."

---

Actividad

"Me gustaría hacerlo."

---

Estas tres frases resumen toda la filosofía del nuevo sistema.

---

# Capítulo 3
# El principio de no ansiedad

Toda decisión de interfaz debe cumplir una norma.

El usuario nunca debe percibir como obligaciones elementos que realmente no lo son.

Por ejemplo.

Incorrecto.

────────────

145 pendientes

────────────

Correcto.

────────────

Hoy tienes

• 2 recordatorios

• 1 tarea importante

Y además tienes

• 43 actividades para cuando te apetezca

────────────

El usuario experimenta exactamente la misma información.

Pero emocionalmente el efecto es completamente distinto.

---

## Las actividades no son backlog

Una actividad nunca debe aparecer como trabajo pendiente.

Las actividades son inspiración.

No deuda.

---

## Las ideas tampoco son deuda

En futuras versiones existirán Ideas.

Las ideas no son tareas.

Las ideas son simplemente pensamientos capturados.

Nunca deben formar parte de estadísticas de productividad.

---

## Nunca mostrar números agregados

Queda prohibido mostrar frases como:

"Tienes 286 pendientes."

Porque son ambiguas.

Siempre se comunicarán por categorías.

Ejemplo.

Hoy

🔔 2 recordatorios

💼 3 tareas

🌿 18 actividades disponibles

Nunca

23 pendientes.

---

# Capítulo 4
# Principios de UX

## La aplicación nunca regaña

No utilizar colores agresivos.

No utilizar mensajes de culpa.

No utilizar estadísticas negativas.

No utilizar frases como:

"No has terminado..."

"Te quedan..."

"Estás retrasado..."

La aplicación acompaña.

No presiona.

---

## Mostrar únicamente el contexto necesario

Si el usuario entra para buscar una actividad, no necesita ver tareas.

Si entra para revisar tareas, no necesita ver actividades.

Cada pantalla debe mostrar únicamente la información necesaria para la decisión actual.

---

## La aplicación debe responder preguntas

Cada pantalla debe responder una única pregunta.

Home

¿Qué quieres hacer ahora?

Recordatorios

¿Qué no debo olvidar?

Tareas

¿En qué estoy trabajando?

Actividades

¿Qué me apetece hacer?

Objetivos

¿Hacia dónde voy?

Listas

¿Qué información quiero guardar?

Cuando una pantalla intenta responder dos preguntas diferentes, debe dividirse.

---

## Reducir decisiones

Cada vez que el usuario abre la aplicación debería poder actuar en menos de diez segundos.

No debe navegar por listas enormes.

No debe filtrar manualmente.

No debe reorganizar información constantemente.

La aplicación debe presentar primero aquello que probablemente sea relevante.
---

# Capítulo 5
# Arquitectura conceptual

## 5.1 Cambio de paradigma

El modelo actual gira alrededor de un único concepto:

Reminder.

Ese nombre deja de representar correctamente la realidad de la aplicación.

En RubeRemember existen muchos tipos de información.

Todos comparten muchas propiedades comunes.

Por tanto, el nuevo núcleo de la aplicación será un concepto mucho más abstracto:

Item.

Todo aquello que el usuario quiera sacar de su cabeza será un Item.

Después cada Item tendrá un tipo.

Este cambio debe entenderse como un cambio conceptual.

No es únicamente un cambio de nombre.

Es un cambio de arquitectura.

---

## 5.2 El nuevo árbol de entidades

```text
Item
│
├── Task
│
├── Reminder
│
├── Activity
│
├── Idea (v3)
│
├── Reference (v3)
│
├── Habit (v3)
│
└── Event (v3)
```

La versión 2 únicamente implementará:

- Task
- Reminder
- Activity

El resto quedan definidos desde el principio para evitar volver a romper el modelo dentro de unos años.

---

## 5.3 Todo es un Item

Todo Item comparte unas propiedades comunes.

```typescript

interface Item {

    id: string;

    type: ItemType;

    title: string;

    description?: string;

    createdAt: string;

    updatedAt: string;

    archived: boolean;

    favourite: boolean;

    tags: string[];

}

```

Estas propiedades nunca dependen del tipo.

Son universales.

---

## 5.4 ItemType

```typescript

enum ItemType {

    TASK,

    REMINDER,

    ACTIVITY

}

```

No utilizar strings sueltos.

Siempre utilizar enums.

Esto facilita futuras migraciones.

---

## 5.5 La fecha deja de definir el elemento

Actualmente una tarea puede existir únicamente en dos estados.

Tiene fecha.

No tiene fecha.

Este modelo desaparece.

A partir de ahora la fecha es únicamente una propiedad.

Nunca una categoría.

Ejemplo.

Una Activity puede tener fecha.

Una Task puede no tener fecha.

Un Reminder puede tener varias fechas.

Todas estas situaciones son perfectamente válidas.

---

# Capítulo 6
# El nuevo modelo de datos

## 6.1 BaseItem

Todos los modelos heredarán de BaseItem.

```typescript

interface BaseItem {

    id: string;

    type: ItemType;

    title: string;

    description?: string;

    createdAt: string;

    updatedAt: string;

    archived: boolean;

    favourite: boolean;

    tags: string[];

}

```

Nunca añadir propiedades específicas aquí.

BaseItem únicamente contiene aquello que absolutamente todos los elementos comparten.

---

## 6.2 Task

```typescript

interface Task extends BaseItem {

    type: ItemType.TASK;

    completed: boolean;

    startDate?: string;

    dueDate?: string;

    estimatedHours?: number;

    priority: Priority;

    goalId?: string;

    phaseId?: string;

    timeSlotId?: string;

    comments: Comment[];

}

```

Las tareas representan trabajo.

Nunca representan inspiración.

Nunca representan simples recordatorios.

---

## 6.3 Reminder

```typescript

interface Reminder extends BaseItem {

    type: ItemType.REMINDER;

    remindAt: ReminderTrigger;

    autoArchive: boolean;

    completed: boolean;

}

```

Importante.

Un Reminder no tiene progreso.

No pertenece a objetivos.

No pertenece a Roadmaps.

No tiene horas estimadas.

Su única misión es aparecer cuando corresponde.

---

## 6.4 Activity

```typescript

interface Activity extends BaseItem {

    type: ItemType.ACTIVITY;

    category: ActivityCategory;

    suggestedCount: number;

    lastSuggestedAt?: string;

    lastDoneAt?: string;

}

```

Una Activity no tiene completado.

Porque una actividad no se termina.

Simplemente se disfruta.

---

## 6.5 ¿Por qué Activity no tiene completed?

Porque genera el comportamiento incorrecto.

Ejemplo.

Salir en bici.

Si aparece como completado.

¿Qué significa?

¿Ya nunca volveré?

No tiene sentido.

Las actividades son reutilizables.

No tienen principio ni final.

---

## 6.6 Historial

En lugar de completed.

Existe historial.

```text
Salir en bici

Última vez

Hace 8 días
```

Eso permite sugerencias inteligentes.

---

# Capítulo 7
# Sistema de recordatorios

Este capítulo define una diferencia muy importante.

Recordar.

No significa trabajar.

---

## 7.1 Objetivo

Un recordatorio existe únicamente para aparecer en el momento correcto.

Después puede desaparecer.

Ejemplos.

Comprar pan.

Preguntar algo.

Llamar al banco.

Llevar paraguas.

Ninguno requiere planificación.

---

## 7.2 Ciclo de vida

```text
Crear

↓

Esperar

↓

Notificación

↓

Usuario lo ve

↓

Archivado automático
```

No permanece para siempre.

---

## 7.3 Recordatorios permanentes

No todos desaparecen.

Ejemplo.

Recordarme beber agua.

Puede mantenerse.

Por ello existirá.

```typescript

autoArchive: boolean;

```

---

## 7.4 Tipos de activación

No todos los recordatorios funcionan igual.

```typescript

enum ReminderTriggerType {

    DATE,

    DATE_TIME,

    LOCATION,

    MANUAL

}

```

En la versión 2 solamente se implementarán:

DATE

DATE_TIME

LOCATION queda diseñado para futuras versiones.

---

## 7.5 Recordatorios de hoy

La Home únicamente mostrará.

```text
Hoy debes recordar

Comprar pan

Llamar a Juan

Recoger paquete
```

Nunca mostrará.

Todos los recordatorios del próximo año.

---

# Capítulo 8
# Sistema de actividades

Este es probablemente el módulo más importante del rediseño.

---

## 8.1 Filosofía

Las actividades no existen para completarse.

Existen para inspirar.

Cuando el usuario abre esta pantalla probablemente está aburrido.

No quiere una lista enorme.

Quiere una sugerencia.

---

## 8.2 El botón "No sé qué hacer"

La Home incluirá una acción principal.

```text
No sé qué hacer
```

Al pulsarla.

La aplicación genera sugerencias.

No muestra toda la colección.

---

## 8.3 Algoritmo

Descartar.

Actividades realizadas recientemente.

Favorecer.

Favoritas.

Favorecer.

Nunca sugeridas.

Favorecer.

Actividades poco frecuentes.

Aleatorizar ligeramente.

Mostrar entre 5 y 8 resultados.

Nunca más.

---

## 8.4 Categorías

```typescript

enum ActivityCategory {

    SPORT,

    MOVIES,

    GAMES,

    RESTAURANTS,

    TRAVEL,

    LEARNING,

    SOCIAL,

    WALK,

    READING,

    OTHER

}

```

Estas categorías únicamente ayudan a organizar.

No afectan al algoritmo.

---

## 8.5 Registrar una actividad

Cuando el usuario realiza una actividad.

No marca.

Completado.

Marca.

Lo hice.

Eso simplemente actualiza.

```typescript

lastDoneAt

```

Y aumenta.

```typescript

doneCount

```

La actividad sigue existiendo.

Porque probablemente quiera repetirla dentro de un mes.

---

# Capítulo 9
# La nueva Home

La Home deja de ser una lista cronológica.

Pasa a ser un panel de decisión.

---

## Pregunta principal

Toda la pantalla gira alrededor de una única pregunta.

```text
¿Qué quieres hacer ahora?
```

---

## Tarjeta 1

```text
🔔

Recordatorios

2 para hoy

```

---

## Tarjeta 2

```text
💼

Tareas

3 activas

```

---

## Tarjeta 3

```text
🌿

Actividades

46 disponibles

```

---

## Tarjeta 4

```text
🎲

No sé qué hacer

```

Este botón ejecuta el algoritmo de sugerencias.

No abre la lista completa.

---

## Tarjeta 5

```text
🎯

Objetivos

2 en progreso

```

---

## Tarjeta 6

```text
📚

Listas

```

Las listas mantienen su comportamiento actual.

No necesitan rediseño.

---

## Información prohibida

Nunca mostrar.

```text
287 pendientes.
```

Nunca.

Ese dato deja de existir.

---

## Información correcta

```text
Hoy.

2 recordatorios.

1 tarea importante.

Y si tienes tiempo.

46 actividades disponibles.
```

La misma información.

Muchísima menos ansiedad.

---

# Capítulo 10
# Compatibilidad con la arquitectura actual

Uno de los objetivos principales del rediseño es minimizar el trabajo necesario para migrar la aplicación existente.

No se pretende reescribir RubeRemember desde cero.

Se pretende evolucionar su arquitectura.

---

## Reutilización de componentes existentes

Los siguientes módulos pueden mantenerse prácticamente sin modificaciones:

- Sistema de persistencia con AsyncStorage.
- RememberStore como punto central de estado.
- Sistema de comentarios.
- Sistema de Roadmaps.
- Franjas horarias (Time Slots).
- Gestión de listas.
- Exportación e importación de copias de seguridad.
- Sistema de notificaciones.

El cambio principal consiste en que estos módulos dejarán de operar sobre `Reminder` y pasarán a operar sobre `Item`, filtrando por `ItemType` cuando corresponda.

---

## Estrategia de migración

La migración debe ser completamente automática.

Al abrir por primera vez la versión 2:

1. Se detecta la versión del almacenamiento local.
2. Si pertenece a la versión anterior, todos los `Reminder` existentes se convierten en `Task` por defecto.
3. Los recordatorios puramente informativos podrán ser reclasificados manualmente por el usuario mediante una acción rápida ("Convertir en recordatorio").
4. Las tareas sin fecha que representen actividades de ocio podrán convertirse igualmente en `Activity`.

La migración nunca debe eliminar información ni requerir intervención obligatoria del usuario.

---

Fin de la Parte I.

En la siguiente parte se definirá la arquitectura interna de React Native, la nueva organización del `RememberStore`, la estructura de carpetas, los nuevos hooks, los selectores, el flujo de creación y edición de Items, y el diseño detallado (con wireframes) de cada pantalla.

---

# PARTE II
# Arquitectura Técnica
## Capítulo 11
# Nuevo RememberStore

## Objetivo

El RememberStore deja de almacenar una colección de `Reminder`.

A partir de la versión 2 almacenará una colección de `Item`.

Esto convierte al Store en un sistema mucho más flexible.

La lógica específica deja de estar distribuida entre múltiples arrays y pasa a resolverse mediante filtros.

---

## Estado principal

La estructura principal pasa a ser:

```typescript
interface RememberStore {

    items: Item[];

    goals: Goal[];

    timeSlots: TimeSlot[];

    reminderLists: ReminderList[];

    settings: UserSettings;

}
```

El objetivo es que exista **una única fuente de verdad**.

No habrá:

```typescript
tasks[]

activities[]

reminders[]
```

Eso provocaría duplicidad de lógica.

Todo vive dentro de `items`.

---

# 11.1 Selectores

Toda pantalla accederá mediante selectores.

Nunca filtrará directamente.

Incorrecto

```typescript
items.filter(...)
```

Correcto

```typescript
store.getTasks()

store.getActivities()

store.getReminders()

store.getTodayTasks()

store.getPinnedTasks()

store.getTodayReminders()

store.getSuggestedActivities()
```

El Store debe encapsular completamente la lógica.

La UI nunca debe conocer cómo se almacenan los datos.

---

# 11.2 Nuevos Selectores

## Tareas

```typescript
getTasks()

getCompletedTasks()

getPendingTasks()

getTasksByGoal()

getTasksWithoutDate()

getTasksForToday()

getOverdueTasks()

getPinnedTasks()

getUpcomingTasks()
```

---

## Recordatorios

```typescript
getTodayReminders()

getTomorrowReminders()

getUpcomingReminders()

getArchivedReminders()

getReminderHistory()
```

---

## Actividades

```typescript
getActivities()

getFavouriteActivities()

getSuggestedActivities()

getActivitiesByCategory()

getRecentlyDoneActivities()

getNeverDoneActivities()
```

---

# 11.3 Acciones

```typescript
createTask()

createReminder()

createActivity()
```

No existirá.

```typescript
createItem()
```

Porque desde la interfaz el usuario siempre sabe qué quiere crear.

Internamente todas terminarán llamando al mismo motor.

---

# 11.4 Conversión

Una característica muy importante.

Todo Item puede cambiar de tipo.

Ejemplo.

El usuario creó.

```
Aprender Blender
```

Como Activity.

Pero finalmente decide convertirlo en proyecto.

Simplemente pulsa.

```
Convertir en tarea
```

La aplicación mantiene.

Título.

Comentarios.

Etiquetas.

Descripción.

Y únicamente transforma el tipo.

---

# Capítulo 12
# Sistema de creación

La creación debe ser extremadamente rápida.

Nunca más de dos pantallas.

---

## Crear desde Home

La Home tendrá un botón flotante.

```
+
```

Al pulsarlo.

No aparece directamente un formulario.

Primero aparece.

```
¿Qué quieres crear?

🔔 Recordatorio

💼 Tarea

🌿 Actividad
```

Esta decisión es fundamental.

El usuario piensa primero en intención.

No en propiedades.

---

## Crear Recordatorio

Formulario.

```
Título

Descripción (opcional)

Fecha

Hora (opcional)

Notificación

Autoarchivar

Guardar
```

Nada más.

No mostrar.

Objetivos.

Roadmaps.

Horas estimadas.

Porque no pertenecen a un recordatorio.

---

## Crear Tarea

Formulario.

```
Título

Descripción

Objetivo

Fase

Fecha

Hora

Prioridad

Horas estimadas

Comentarios

Guardar
```

---

## Crear Actividad

Formulario.

```
Nombre

Categoría

Descripción

Etiquetas

Favorita

Guardar
```

No hay.

Fecha límite.

Prioridad.

Completado.

Porque no existen para Activities.

---

# Capítulo 13
# Pantalla Home

La Home es la pantalla más importante.

Debe poder entenderse en menos de cinco segundos.

---

# Diseño

```
Buenos días.

¿Qué quieres hacer ahora?

────────────────────

🔔

Recordatorios

2 para hoy

──────────────

💼

Tareas

3 activas

──────────────

🌿

Actividades

42 disponibles

──────────────

🎲

No sé qué hacer

──────────────

🎯

Objetivos

2 activos

──────────────

📚

Listas

```

---

## No utilizar listas infinitas

La Home nunca mostrará.

100 tareas.

40 actividades.

20 recordatorios.

Para eso existen las pantallas específicas.

---

## Información contextual

Por la mañana.

Priorizar.

Recordatorios.

Durante el horario laboral.

Priorizar.

Tareas.

Por la noche.

Dar más protagonismo.

Actividades.

Esto no significa ocultar información.

Significa reorganizar el orden.

---

# Capítulo 14
# Pantalla Recordatorios

Pregunta que responde.

```
¿Qué no debo olvidar?
```

Nunca.

```
¿Qué tengo pendiente?
```

---

## Estructura

```
Hoy

────────────

Comprar pan

Llamar al banco

Preguntar a Juan

────────────────

Mañana

────────────

Renovar seguro

────────────────

Esta semana

────────────

...

────────────────

Archivados

```

---

## Acciones

Cada recordatorio únicamente permite.

```
Editar

Archivar

Duplicar

Eliminar
```

No existe.

Completar subtareas.

Mover a Roadmap.

Horas estimadas.

---

## Notificaciones

Cada Reminder debe indicar claramente.

```
🔔

Notificación

Activada

```

o.

```
Notificación

Desactivada
```

---

# Capítulo 15
# Pantalla Tareas

Pregunta.

```
¿En qué estoy trabajando?
```

---

## Secciones

```
Hoy

Próximas

Sin fecha

Objetivos

Completadas

Archivadas
```

---

## Tarjeta

```
Editar vídeo

Objetivo

Canal YouTube

Fase

Edición

3 horas

Alta prioridad

```

---

## Acciones

```
Completar

Editar

Mover

Duplicar

Archivar

Eliminar
```

---

## Comentarios

Se mantienen exactamente igual que en la versión actual.

No modificar.

---

# Capítulo 16
# Pantalla Actividades

Pregunta.

```
¿Qué me apetece hacer?
```

Esta pantalla debe sentirse completamente distinta.

No transmite productividad.

Transmite inspiración.

---

## Cabecera

```
¿Qué te apetece hoy?
```

Debajo.

```
🎲

Sorpréndeme
```

Este botón ejecuta el algoritmo de sugerencias.

---

## Categorías

```
🚴 Deporte

🎬 Cine

📚 Libros

🍔 Restaurantes

🎮 Juegos

🌍 Viajes

☕

Planes tranquilos

👥 Social
```

---

## Tarjeta

```
Salir en bici

Hace 12 días

★★★★★

```

---

## Acciones

```
Lo hice

Editar

Favorito

Eliminar
```

Nunca.

```
Completar
```

---

# Capítulo 17
# El algoritmo "No sé qué hacer"

Este algoritmo representa uno de los mayores valores diferenciales de RubeRemember.

No pretende recomendar la mejor actividad.

Pretende evitar la parálisis por elección.

---

## Entrada

Colección completa de Activities.

---

## Paso 1

Eliminar.

Actividades realizadas recientemente.

Configuración.

```
Últimos 3 días
```

Por defecto.

---

## Paso 2

Aumentar puntuación.

Favoritas.

---

## Paso 3

Aumentar puntuación.

Nunca realizadas.

---

## Paso 4

Aumentar puntuación.

Llevan meses sin hacerse.

---

## Paso 5

Aleatorización.

Nunca devolver siempre el mismo orden.

---

## Paso 6

Mostrar.

Entre cinco y ocho resultados.

Nunca más.

---

## Justificación

El usuario no quiere elegir entre 80 opciones.

Quiere inspiración.

Cinco opciones reducen drásticamente la carga cognitiva.

---

# Capítulo 18
# Búsqueda Global

La búsqueda deja de buscar únicamente tareas.

Busca cualquier Item.

---

## Resultados agrupados

```
Tareas

Editar vídeo

Crear backend

────────────────

Recordatorios

Comprar pan

────────────────

Actividades

Ir al cine

Ruta en bici

────────────────

Listas

Compra IKEA
```

---

## Filtros

```
Todo

Tareas

Recordatorios

Actividades

Objetivos

Listas
```

---

# Capítulo 19
# Sistema de Archivado

Actualmente eliminar implica perder información.

La mayoría de las veces eso no es deseable.

---

## Todo Item puede archivarse.

Archivar significa.

```
No aparece.

No participa.

No molesta.

Pero sigue existiendo.
```

---

## Ejemplos

Un Reminder pasado.

↓

Archivado.

Una tarea terminada hace meses.

↓

Archivada.

Una actividad que ya no interesa.

↓

Archivada.

---

## Ventajas

Se mantiene el historial.

Se reducen las listas.

No se pierde información.

---

# Capítulo 20
# Decisiones explícitas

Este capítulo recoge decisiones que NO deben modificarse sin una razón muy justificada.

## Decisión 1

Las actividades nunca generan ansiedad.

Si una funcionalidad hace que las Activities se perciban como obligaciones, debe rechazarse.

---

## Decisión 2

Los recordatorios nunca pertenecen a objetivos.

Son conceptos diferentes.

---

## Decisión 3

Las tareas son el único elemento que representa trabajo.

Toda métrica de productividad debe calcularse únicamente sobre Tasks.

Nunca sobre Activities.

Nunca sobre Reminders.

---

## Decisión 4

La Home nunca será una lista cronológica.

Debe seguir siendo un centro de decisión.

---

## Decisión 5

La aplicación siempre priorizará reducir la carga mental frente a mostrar más información.

Cuando exista conflicto entre ambas opciones, se elegirá siempre la que reduzca la ansiedad del usuario.

---

**Fin de la Parte II.**

La Parte III se centrará exclusivamente en la implementación técnica para React Native: nueva estructura de carpetas, refactorización del `RememberStore`, migraciones de `AsyncStorage`, cambios en Expo Router, nuevos componentes reutilizables, arquitectura de navegación, pseudocódigo de todos los hooks y plan de implementación incremental para que Antigravity pueda desarrollar la versión 2 sin romper compatibilidad con la aplicación actual.

---

# PARTE III
# Arquitectura React Native
## Capítulo 21
# Principios de implementación

Este documento no pretende únicamente definir cómo será la aplicación.

También define cómo deberá desarrollarse.

La arquitectura debe cumplir cinco principios fundamentales.

---

# Principio 1

Toda pantalla debe tener una única responsabilidad.

Incorrecto

```
Pantalla que muestra:

Recordatorios

Tareas

Objetivos

Listas

Actividad reciente

Calendario

```

Correcto

```
Pantalla de Tareas

↓

Solo responde

"¿En qué estoy trabajando?"
```

---

# Principio 2

Toda lógica de negocio vive en el Store.

Nunca dentro de componentes React.

Incorrecto

```typescript

const todayTasks = items
.filter(...)
.sort(...)
.map(...)

```

Correcto

```typescript

const todayTasks =
store.getTodayTasks()

```

---

# Principio 3

Los componentes únicamente renderizan.

Nunca toman decisiones.

La UI debe ser completamente tonta.

Toda decisión pertenece al Store.

---

# Principio 4

Todo cálculo debe ser reutilizable.

Ejemplo.

El algoritmo de sugerencias.

Nunca debe existir dentro de una pantalla.

Debe vivir aquí.

```
services

↓

activity-engine.ts
```

---

# Principio 5

Ninguna pantalla conoce AsyncStorage.

La persistencia únicamente pertenece al Store.

---

# Capítulo 22
# Nueva estructura del proyecto

La estructura actual funciona correctamente.

No obstante, con el crecimiento previsto será conveniente separar responsabilidades.

Propuesta.

```
src/

app/

components/

hooks/

store/

models/

services/

screens/

navigation/

constants/

utils/

```

---

## models/

Toda definición TypeScript.

```
models

↓

item.ts

task.ts

activity.ts

reminder.ts

goal.ts

list.ts

comment.ts
```

Nunca mezclar modelos.

---

## services/

Toda lógica.

Nunca UI.

Ejemplo.

```
activity-engine.ts

reminder-engine.ts

migration-engine.ts

statistics-engine.ts

notification-engine.ts
```

---

## utils/

Funciones pequeñas.

```
date.ts

format.ts

sort.ts

id.ts

```

Nunca colocar aquí lógica de negocio.

---

## hooks/

Hooks React.

Ejemplo.

```
useActivities()

useTasks()

useToday()

useSuggestions()

```

Estos hooks únicamente consumirán el Store.

---

# Capítulo 23
# Activity Engine

Este módulo será completamente independiente.

No conocerá React.

No conocerá Zustand.

No conocerá Expo.

Únicamente recibirá datos.

---

## Entrada

```
Activity[]
```

---

## Salida

```
SuggestedActivity[]
```

---

## Firma

```typescript

suggestActivities(

activities,

settings,

history

)

```

---

## Responsabilidad

Únicamente calcular.

Nunca renderizar.

Nunca navegar.

Nunca modificar estado.

---

# Capítulo 24
# Reminder Engine

Este módulo centralizará toda la lógica relacionada con recordatorios.

Actualmente parte de esta lógica está repartida.

Debe unificarse.

---

## Responsabilidades

Calcular.

```
Recordatorios de hoy
```

Calcular.

```
Próximos
```

Calcular.

```
Vencidos
```

Calcular.

```
Archivables
```

Generar.

```
Notificaciones
```

---

## Nunca

No debe conocer.

React.

Pantallas.

Componentes.

---

# Capítulo 25
# Statistics Engine

Toda estadística debe calcularse aquí.

Nunca dentro de la UI.

---

## Ejemplos

```
Tareas terminadas.

Horas invertidas.

Actividad favorita.

Recordatorios archivados.

Objetivos activos.
```

---

## Importante

Las estadísticas nunca mezclarán categorías.

Incorrecto.

```
Items completados.
```

Correcto.

```
12 tareas terminadas.

45 actividades realizadas.

18 recordatorios archivados.
```

---

# Capítulo 26
# Notification Engine

Actualmente las notificaciones ya funcionan.

El objetivo no es reescribirlas.

El objetivo es especializarlas.

---

## Tareas

Notificación opcional.

---

## Recordatorios

Notificación recomendada.

---

## Actividades

Nunca generan notificaciones.

Una actividad no debe decir.

```
Hace tres semanas que no vas al cine.
```

Eso contradice completamente la filosofía del producto.

---

# Capítulo 27
# Sistema de navegación

La navegación también cambia.

Actualmente gira alrededor del chat.

En la versión 2 gira alrededor de decisiones.

---

## Bottom Tabs

```
🏠

Inicio

↓

🔔

Recordatorios

↓

💼

Tareas

↓

🌿

Actividades

↓

🎯

Objetivos

↓

📚

Listas
```

---

## Eliminar navegación innecesaria

Nunca obligar al usuario.

Inicio

↓

Recordatorios

↓

Filtro

↓

Categoría

↓

Detalle

Cuando puede ser.

Inicio

↓

Recordatorios

↓

Detalle

---

# Capítulo 28
# Pantalla de detalle

Todas las entidades compartirán el mismo patrón visual.

---

## Cabecera

Título.

Fecha creación.

Etiquetas.

Favorito.

---

## Contenido

Dependerá del tipo.

---

## Footer

Acciones.

Editar.

Duplicar.

Archivar.

Eliminar.

---

## Beneficio

El usuario aprende una única interfaz.

---

# Capítulo 29
# Edición

La edición reutiliza exactamente la misma pantalla de creación.

No existirán dos formularios distintos.

---

## Modo creación

```
Nuevo

Guardar
```

---

## Modo edición

```
Editar

Guardar cambios
```

---

Toda la lógica será compartida.

---

# Capítulo 30
# Sistema de filtros

Toda pantalla utilizará exactamente el mismo componente.

```
All

↓

Today

↓

Upcoming

↓

Archived

↓

Favorites
```

No crear filtros diferentes para cada pantalla.

La experiencia debe sentirse consistente.

---

# Capítulo 31
# Búsqueda

La búsqueda utilizará un índice único.

No buscará.

Tareas.

Actividades.

Recordatorios.

Por separado.

Buscará.

Items.

Después agrupará.

---

## Orden

Coincidencia exacta.

↓

Favoritos.

↓

Recientes.

↓

Resto.

---

# Capítulo 32
# Sistema de etiquetas

Actualmente las etiquetas son opcionales.

En la versión 2 se convierten en una herramienta importante.

Ejemplos.

```
Casa

Trabajo

Universidad

Salud

Viajes

Compras
```

No sustituyen categorías.

Las complementan.

---

Ejemplo.

```
Activity

↓

Ir al cine

Categoría

Películas

Etiqueta

Pareja
```

---

Otro.

```
Reminder

↓

Comprar tornillos

Etiqueta

Bricolaje
```

---

# Capítulo 33
# Favoritos

Todos los Items pueden marcarse como favoritos.

No significa prioridad.

Significa.

```
Lo utilizo mucho.
```

Ejemplo.

Actividad.

```
Salir en bici.
```

Favorita.

Aparecerá antes en las sugerencias.

---

# Capítulo 34
# Historial

Todo Item genera historial.

No únicamente tareas.

---

Task

```
Creada

↓

Editada

↓

Terminada

↓

Archivada
```

---

Reminder

```
Creado

↓

Notificado

↓

Archivado
```

---

Activity

```
Creada

↓

Realizada

↓

Realizada

↓

Realizada
```

---

Esto permitirá futuras estadísticas.

---

# Capítulo 35
# Eventos

Todo cambio importante genera un evento.

Ejemplo.

```
ItemCreated

ItemEdited

ItemArchived

TaskCompleted

ReminderTriggered

ActivityDone
```

No se implementarán inmediatamente.

Pero la arquitectura deberá permitirlo.

Esto facilitará futuras funcionalidades como:

- Timeline personal.
- Estadísticas.
- Sincronización.
- IA.
- Deshacer acciones.

---

# Capítulo 36
# Principio de extensibilidad

La aplicación debe poder crecer durante años.

Por ello cualquier nueva funcionalidad deberá responder primero a esta pregunta.

```
¿Esto es un nuevo Item?

o

¿Es una propiedad de un Item existente?
```

Antes de crear nuevos modelos debe comprobarse si realmente son necesarios.

El objetivo es evitar que dentro de dos años existan.

```
Reminder

Task

Activity

QuickTask

SimpleTask

MiniReminder

FutureReminder

...

```

La arquitectura debe permanecer pequeña.

Muy pocas entidades.

Muy potentes.

---

# Capítulo 37
# Regla de oro

Si en cualquier momento un desarrollador duda sobre una decisión de implementación, deberá aplicar la siguiente prioridad.

1. Reducir carga mental del usuario.

2. Mantener la simplicidad del modelo.

3. Reutilizar componentes existentes.

4. Evitar duplicidad.

5. Optimizar rendimiento.

Nunca al revés.

---

## Nota para Antigravity

Si durante la implementación encuentras una decisión técnica que contradiga la filosofía descrita en los capítulos 1–10, **la filosofía tiene prioridad sobre la implementación existente**.

La arquitectura actual de RubeRemember es el punto de partida, pero no debe limitar la evolución del producto. Cualquier refactorización es aceptable siempre que:

- Mantenga la compatibilidad con los datos existentes.
- No aumente la complejidad innecesariamente.
- Refuerce el objetivo principal de la aplicación: **ser un segundo cerebro que reduzca la carga mental del usuario**.

---

**Fin de la Parte III.**

La siguiente parte (Parte IV) debería centrarse en un nivel todavía más práctico: un documento de implementación donde Antigravity encuentre el pseudocódigo de cada pantalla, los componentes React Native que deben crearse, los cambios exactos en `RememberStore`, el plan de migración paso a paso y una checklist de desarrollo para implementar la versión 2 sin romper ninguna funcionalidad existente.

---

# PARTE III
# Arquitectura React Native
## Capítulo 21
# Principios de implementación

Este documento no pretende únicamente definir cómo será la aplicación.

También define cómo deberá desarrollarse.

La arquitectura debe cumplir cinco principios fundamentales.

---

# Principio 1

Toda pantalla debe tener una única responsabilidad.

Incorrecto

```
Pantalla que muestra:

Recordatorios

Tareas

Objetivos

Listas

Actividad reciente

Calendario

```

Correcto

```
Pantalla de Tareas

↓

Solo responde

"¿En qué estoy trabajando?"
```

---

# Principio 2

Toda lógica de negocio vive en el Store.

Nunca dentro de componentes React.

Incorrecto

```typescript

const todayTasks = items
.filter(...)
.sort(...)
.map(...)

```

Correcto

```typescript

const todayTasks =
store.getTodayTasks()

```

---

# Principio 3

Los componentes únicamente renderizan.

Nunca toman decisiones.

La UI debe ser completamente tonta.

Toda decisión pertenece al Store.

---

# Principio 4

Todo cálculo debe ser reutilizable.

Ejemplo.

El algoritmo de sugerencias.

Nunca debe existir dentro de una pantalla.

Debe vivir aquí.

```
services

↓

activity-engine.ts
```

---

# Principio 5

Ninguna pantalla conoce AsyncStorage.

La persistencia únicamente pertenece al Store.

---

# Capítulo 22
# Nueva estructura del proyecto

La estructura actual funciona correctamente.

No obstante, con el crecimiento previsto será conveniente separar responsabilidades.

Propuesta.

```
src/

app/

components/

hooks/

store/

models/

services/

screens/

navigation/

constants/

utils/

```

---

## models/

Toda definición TypeScript.

```
models

↓

item.ts

task.ts

activity.ts

reminder.ts

goal.ts

list.ts

comment.ts
```

Nunca mezclar modelos.

---

## services/

Toda lógica.

Nunca UI.

Ejemplo.

```
activity-engine.ts

reminder-engine.ts

migration-engine.ts

statistics-engine.ts

notification-engine.ts
```

---

## utils/

Funciones pequeñas.

```
date.ts

format.ts

sort.ts

id.ts

```

Nunca colocar aquí lógica de negocio.

---

## hooks/

Hooks React.

Ejemplo.

```
useActivities()

useTasks()

useToday()

useSuggestions()

```

Estos hooks únicamente consumirán el Store.

---

# Capítulo 23
# Activity Engine

Este módulo será completamente independiente.

No conocerá React.

No conocerá Zustand.

No conocerá Expo.

Únicamente recibirá datos.

---

## Entrada

```
Activity[]
```

---

## Salida

```
SuggestedActivity[]
```

---

## Firma

```typescript

suggestActivities(

activities,

settings,

history

)

```

---

## Responsabilidad

Únicamente calcular.

Nunca renderizar.

Nunca navegar.

Nunca modificar estado.

---

# Capítulo 24
# Reminder Engine

Este módulo centralizará toda la lógica relacionada con recordatorios.

Actualmente parte de esta lógica está repartida.

Debe unificarse.

---

## Responsabilidades

Calcular.

```
Recordatorios de hoy
```

Calcular.

```
Próximos
```

Calcular.

```
Vencidos
```

Calcular.

```
Archivables
```

Generar.

```
Notificaciones
```

---

## Nunca

No debe conocer.

React.

Pantallas.

Componentes.

---

# Capítulo 25
# Statistics Engine

Toda estadística debe calcularse aquí.

Nunca dentro de la UI.

---

## Ejemplos

```
Tareas terminadas.

Horas invertidas.

Actividad favorita.

Recordatorios archivados.

Objetivos activos.
```

---

## Importante

Las estadísticas nunca mezclarán categorías.

Incorrecto.

```
Items completados.
```

Correcto.

```
12 tareas terminadas.

45 actividades realizadas.

18 recordatorios archivados.
```

---

# Capítulo 26
# Notification Engine

Actualmente las notificaciones ya funcionan.

El objetivo no es reescribirlas.

El objetivo es especializarlas.

---

## Tareas

Notificación opcional.

---

## Recordatorios

Notificación recomendada.

---

## Actividades

Nunca generan notificaciones.

Una actividad no debe decir.

```
Hace tres semanas que no vas al cine.
```

Eso contradice completamente la filosofía del producto.

---

# Capítulo 27
# Sistema de navegación

La navegación también cambia.

Actualmente gira alrededor del chat.

En la versión 2 gira alrededor de decisiones.

---

## Bottom Tabs

```
🏠

Inicio

↓

🔔

Recordatorios

↓

💼

Tareas

↓

🌿

Actividades

↓

🎯

Objetivos

↓

📚

Listas
```

---

## Eliminar navegación innecesaria

Nunca obligar al usuario.

Inicio

↓

Recordatorios

↓

Filtro

↓

Categoría

↓

Detalle

Cuando puede ser.

Inicio

↓

Recordatorios

↓

Detalle

---

# Capítulo 28
# Pantalla de detalle

Todas las entidades compartirán el mismo patrón visual.

---

## Cabecera

Título.

Fecha creación.

Etiquetas.

Favorito.

---

## Contenido

Dependerá del tipo.

---

## Footer

Acciones.

Editar.

Duplicar.

Archivar.

Eliminar.

---

## Beneficio

El usuario aprende una única interfaz.

---

# Capítulo 29
# Edición

La edición reutiliza exactamente la misma pantalla de creación.

No existirán dos formularios distintos.

---

## Modo creación

```
Nuevo

Guardar
```

---

## Modo edición

```
Editar

Guardar cambios
```

---

Toda la lógica será compartida.

---

# Capítulo 30
# Sistema de filtros

Toda pantalla utilizará exactamente el mismo componente.

```
All

↓

Today

↓

Upcoming

↓

Archived

↓

Favorites
```

No crear filtros diferentes para cada pantalla.

La experiencia debe sentirse consistente.

---

# Capítulo 31
# Búsqueda

La búsqueda utilizará un índice único.

No buscará.

Tareas.

Actividades.

Recordatorios.

Por separado.

Buscará.

Items.

Después agrupará.

---

## Orden

Coincidencia exacta.

↓

Favoritos.

↓

Recientes.

↓

Resto.

---

# Capítulo 32
# Sistema de etiquetas

Actualmente las etiquetas son opcionales.

En la versión 2 se convierten en una herramienta importante.

Ejemplos.

```
Casa

Trabajo

Universidad

Salud

Viajes

Compras
```

No sustituyen categorías.

Las complementan.

---

Ejemplo.

```
Activity

↓

Ir al cine

Categoría

Películas

Etiqueta

Pareja
```

---

Otro.

```
Reminder

↓

Comprar tornillos

Etiqueta

Bricolaje
```

---

# Capítulo 33
# Favoritos

Todos los Items pueden marcarse como favoritos.

No significa prioridad.

Significa.

```
Lo utilizo mucho.
```

Ejemplo.

Actividad.

```
Salir en bici.
```

Favorita.

Aparecerá antes en las sugerencias.

---

# Capítulo 34
# Historial

Todo Item genera historial.

No únicamente tareas.

---

Task

```
Creada

↓

Editada

↓

Terminada

↓

Archivada
```

---

Reminder

```
Creado

↓

Notificado

↓

Archivado
```

---

Activity

```
Creada

↓

Realizada

↓

Realizada

↓

Realizada
```

---

Esto permitirá futuras estadísticas.

---

# Capítulo 35
# Eventos

Todo cambio importante genera un evento.

Ejemplo.

```
ItemCreated

ItemEdited

ItemArchived

TaskCompleted

ReminderTriggered

ActivityDone
```

No se implementarán inmediatamente.

Pero la arquitectura deberá permitirlo.

Esto facilitará futuras funcionalidades como:

- Timeline personal.
- Estadísticas.
- Sincronización.
- IA.
- Deshacer acciones.

---

# Capítulo 36
# Principio de extensibilidad

La aplicación debe poder crecer durante años.

Por ello cualquier nueva funcionalidad deberá responder primero a esta pregunta.

```
¿Esto es un nuevo Item?

o

¿Es una propiedad de un Item existente?
```

Antes de crear nuevos modelos debe comprobarse si realmente son necesarios.

El objetivo es evitar que dentro de dos años existan.

```
Reminder

Task

Activity

QuickTask

SimpleTask

MiniReminder

FutureReminder

...

```

La arquitectura debe permanecer pequeña.

Muy pocas entidades.

Muy potentes.

---

# Capítulo 37
# Regla de oro

Si en cualquier momento un desarrollador duda sobre una decisión de implementación, deberá aplicar la siguiente prioridad.

1. Reducir carga mental del usuario.

2. Mantener la simplicidad del modelo.

3. Reutilizar componentes existentes.

4. Evitar duplicidad.

5. Optimizar rendimiento.

Nunca al revés.

---

## Nota para Antigravity

Si durante la implementación encuentras una decisión técnica que contradiga la filosofía descrita en los capítulos 1–10, **la filosofía tiene prioridad sobre la implementación existente**.

La arquitectura actual de RubeRemember es el punto de partida, pero no debe limitar la evolución del producto. Cualquier refactorización es aceptable siempre que:

- Mantenga la compatibilidad con los datos existentes.
- No aumente la complejidad innecesariamente.
- Refuerce el objetivo principal de la aplicación: **ser un segundo cerebro que reduzca la carga mental del usuario**.

---

**Fin de la Parte III.**

La siguiente parte (Parte IV) debería centrarse en un nivel todavía más práctico: un documento de implementación donde Antigravity encuentre el pseudocódigo de cada pantalla, los componentes React Native que deben crearse, los cambios exactos en `RememberStore`, el plan de migración paso a paso y una checklist de desarrollo para implementar la versión 2 sin romper ninguna funcionalidad existente.

---

# PARTE V
# Plan de implementación

## Capítulo 57
# Estrategia de desarrollo

El objetivo es evolucionar RubeRemember sin romper la aplicación existente.

La implementación deberá realizarse mediante pequeñas iteraciones, manteniendo la aplicación funcional en todo momento.

Cada fase deberá finalizar con una versión estable antes de comenzar la siguiente.

---

# Fase 1
## Refactorización del modelo

### Objetivos

- Crear `BaseItem`.
- Crear `Task`.
- Crear `Reminder`.
- Crear `Activity`.
- Crear `ItemType`.
- Mantener compatibilidad con el modelo actual.

### No hacer todavía

- Cambios en la UI.
- Nuevas pantallas.
- Cambios visuales.

---

# Fase 2
## Refactorización del Store

### Objetivos

Migrar:

```typescript
Reminder[]
```

a

```typescript
Item[]
```

Añadir:

- Selectores.
- Conversores.
- Nuevas acciones.
- Compatibilidad con AsyncStorage.

---

# Fase 3
## Migración automática

Al iniciar la aplicación.

```
¿Versión antigua?

↓

Sí

↓

Migrar automáticamente

↓

Guardar nueva estructura

↓

Continuar
```

El usuario no debe notar este proceso.

---

# Fase 4
## Nueva Home

Sustituir el Dashboard actual por el nuevo Centro de Decisiones.

No modificar todavía:

- Objetivos.
- Listas.
- Roadmaps.

---

# Fase 5
## Pantalla de Recordatorios

Implementar:

- Vista por fechas.
- Archivado.
- Notificaciones.
- Swipe actions.

---

# Fase 6
## Pantalla de Tareas

Adaptar la pantalla existente.

Mantener:

- Comentarios.
- Roadmaps.
- TimeSlots.
- Objetivos.

Eliminar lógica relacionada con actividades.

---

# Fase 7
## Pantalla de Actividades

Nueva implementación.

Debe incluir:

- Categorías.
- Favoritos.
- Historial.
- Sugerencias.
- Botón "Sorpréndeme".

---

# Fase 8
## Motor de sugerencias

Crear:

```
activity-engine.ts
```

Debe ser completamente independiente de React.

---

# Fase 9
## Limpieza

Eliminar:

- Código duplicado.
- Selectores antiguos.
- Componentes obsoletos.
- Modelos no utilizados.

---

# Capítulo 58
# Checklist de implementación

## Modelo

- [ ] BaseItem
- [ ] Task
- [ ] Reminder
- [ ] Activity
- [ ] ItemType
- [ ] Migración

---

## Store

- [ ] Nuevo estado
- [ ] Selectores
- [ ] CRUD
- [ ] Conversión entre tipos
- [ ] Archivado

---

## UI

- [ ] Nueva Home
- [ ] Recordatorios
- [ ] Tareas
- [ ] Actividades
- [ ] Crear Item
- [ ] Editar Item

---

## Motores

- [ ] Reminder Engine
- [ ] Activity Engine
- [ ] Statistics Engine

---

## QA

- [ ] Migración correcta
- [ ] Sin pérdida de datos
- [ ] Rendimiento correcto
- [ ] Notificaciones
- [ ] Backup compatible

---

# Capítulo 59
# Compatibilidad

La actualización NO debe romper:

- Objetivos.
- Fases.
- Time Slots.
- Comentarios.
- Listas.
- Backups.
- Notificaciones.

Toda funcionalidad existente deberá seguir funcionando tras la migración.

---

# Capítulo 60
# Funcionalidades futuras

Estas funcionalidades NO forman parte de la versión 2, pero la arquitectura debe facilitar su incorporación.

## IA

- Sugerir la siguiente tarea.
- Reorganizar prioridades.
- Detectar tareas abandonadas.
- Recomendar actividades.

---

## Contexto

- Clima.
- Ubicación.
- Hora del día.
- Tiempo disponible.

---

## Sincronización

- Cloud.
- Multi-dispositivo.
- Compartir listas.

---

## Widgets

- Recordatorios de hoy.
- Tareas importantes.
- Actividad sugerida.

---

## Estadísticas

- Tiempo invertido.
- Actividades favoritas.
- Objetivos completados.
- Historial anual.

---

# Capítulo 61
# Criterios de aceptación

La versión 2 se considerará finalizada cuando:

- El usuario distinga claramente entre Recordatorios, Tareas y Actividades.
- La Home deje de generar sensación de "lista infinita".
- Todas las funcionalidades actuales sigan funcionando.
- La migración sea transparente.
- El tiempo para crear cualquier elemento sea inferior a 15 segundos.
- El algoritmo "No sé qué hacer" genere sugerencias útiles.
- No exista duplicidad de lógica en el Store.

---

# Documento vivo

Este documento es la fuente de verdad del proyecto.

Toda nueva funcionalidad deberá modificar este documento antes de implementarse.

El código siempre deberá seguir a la especificación, nunca al contrario.

Si en algún momento el código y este documento entran en conflicto, deberá revisarse la decisión arquitectónica antes de realizar cambios.

---

# PARTE VI
# Especificación técnica de implementación

## Capítulo 62
# Modelo de dominio

## Objetivo

El modelo de dominio representa la fuente de verdad de toda la aplicación.

Toda nueva funcionalidad deberá implementarse respetando este modelo.

No está permitido crear modelos paralelos que representen el mismo concepto.

---

# Dominio

```text
                    Item
                     │
     ┌───────────────┼───────────────┐
     │               │               │
   Task         Reminder       Activity
```

Todo Item pertenece exactamente a uno de estos tipos.

Nunca a varios simultáneamente.

---

## Relaciones

Task

↓

Puede pertenecer a

Goal

↓

Puede pertenecer a

Phase

↓

Puede pertenecer a

TimeSlot

---

Reminder

↓

Nunca pertenece a Goal.

Nunca pertenece a Phase.

Nunca pertenece a TimeSlot.

---

Activity

↓

Nunca pertenece a Goal.

Nunca pertenece a Phase.

Nunca pertenece a TimeSlot.

---

Esta restricción debe implementarse tanto en la UI como en el Store.

No únicamente en el formulario.

---

# Capítulo 63
# BaseItem

Toda entidad debe heredar de BaseItem.

No duplicar propiedades.

```typescript
interface BaseItem {

    id: string;

    type: ItemType;

    title: string;

    description?: string;

    createdAt: ISODate;

    updatedAt: ISODate;

    archived: boolean;

    favourite: boolean;

    tags: string[];

}
```

---

## Reglas

id

Nunca cambia.

---

createdAt

Nunca cambia.

---

updatedAt

Debe actualizarse automáticamente.

Nunca desde la UI.

---

archived

Nunca eliminar un Item directamente desde la lista principal.

Siempre archivar primero.

---

# Capítulo 64
# Identificadores

Todos los IDs utilizarán UUID v4.

Nunca índices.

Nunca timestamps.

Nunca IDs incrementales.

Razones.

- Compatibilidad futura con sincronización.

- Evitar colisiones.

- Facilitar importación.

---

# Capítulo 65
# Sistema de persistencia

Actualmente la aplicación utiliza AsyncStorage.

Esta decisión se mantiene.

No introducir SQLite.

No introducir Realm.

No introducir bases de datos adicionales.

La complejidad actual no lo justifica.

---

## Claves

Se recomienda sustituir múltiples claves por un único objeto.

Ejemplo.

```text
rube_v2_database
```

Contenido.

```typescript
{

version,

items,

goals,

lists,

timeSlots,

settings

}
```

Ventajas.

- Exportación sencilla.

- Importación sencilla.

- Migraciones sencillas.

---

# Capítulo 66
# Versionado

Toda base de datos tendrá versión.

Ejemplo.

```typescript
{

version:2,

...

}
```

Nunca asumir que el usuario utiliza la última versión.

---

## Migraciones

Crear.

```
migration-engine.ts
```

Con una estructura similar.

```typescript

migrations = [

v1ToV2,

v2ToV3,

v3ToV4

]

```

Nunca modificar migraciones antiguas.

Una vez publicadas.

Son inmutables.

---

# Capítulo 67
# Eventos internos

Toda modificación genera un evento.

Ejemplo.

```text
ITEM_CREATED

ITEM_UPDATED

ITEM_ARCHIVED

TASK_COMPLETED

ACTIVITY_DONE

REMINDER_TRIGGERED
```

No es necesario implementar Event Sourcing.

Pero sí centralizar las acciones.

Esto facilitará futuras estadísticas.

---

# Capítulo 68
# Validaciones

Toda validación pertenece al Store.

Nunca al componente.

Ejemplo.

Incorrecto.

```tsx

if(title===""){

...

}

```

Correcto.

```typescript

store.createTask(...)

↓

validateTask()

↓

guardar

```

---

## Validaciones mínimas

Task.

- Título obligatorio.

Reminder.

- Fecha obligatoria.

Activity.

- Nombre obligatorio.

---

# Capítulo 69
# Conversión entre Items

La conversión forma parte del producto.

No es una utilidad.

---

Task

↓

Reminder

Debe eliminar.

Goal.

Phase.

EstimatedHours.

Priority.

---

Reminder

↓

Task

Debe solicitar.

Prioridad.

Opcionalmente.

Objetivo.

---

Activity

↓

Task

Debe mantener.

Título.

Descripción.

Etiquetas.

Comentarios.

Eliminar.

Historial de actividad.

---

Toda conversión debe pedir confirmación.

---

# Capítulo 70
# Eliminación

Eliminar un Item no debe borrar inmediatamente.

Flujo.

```
Eliminar

↓

Mover a papelera

↓

30 días

↓

Eliminar definitivamente
```

Configuración.

El usuario podrá vaciar manualmente la papelera.

---

# Capítulo 71
# Papelera

Nueva pantalla.

```
Papelera

↓

Tasks

↓

Activities

↓

Reminders
```

Acciones.

- Restaurar.

- Eliminar definitivamente.

Nunca editar desde la papelera.

---

# Capítulo 72
# Auditoría

Toda acción importante deberá registrarse internamente.

Ejemplo.

```
2026-08-05

Task creada.

```

```
2026-08-07

Task convertida a Reminder.
```

No mostrar todavía al usuario.

Servirá para futuras funciones.

---

# Capítulo 73
# Regla de simplicidad

Si una implementación requiere:

más de una pantalla,

más de un diálogo,

más de tres pasos,

para crear un Item,

la implementación deberá reconsiderarse.

El flujo ideal siempre será:

Crear.

↓

Guardar.

Fin.

---

Fin del bloque de Dominio.

---

# Capítulo 74
# Anti-patrones

Este capítulo define implementaciones que quedan explícitamente prohibidas.

El objetivo es evitar que futuras refactorizaciones degraden la experiencia de usuario.

---

## Anti-patrón 1

No convertir Activities en tareas.

Incorrecto.

```
☑ Salir en bici

☑ Ir al cine

☑ Pasear
```

Esto convierte el ocio en trabajo.

La aplicación deja de reducir ansiedad.

Empieza a generarla.

Queda prohibido.

---

## Anti-patrón 2

No utilizar listas infinitas.

Incorrecto.

```
Home

↓

127 elementos
```

La Home nunca debe utilizar FlatList para mostrar todos los Items.

La Home es un panel de decisión.

No un explorador de datos.

---

## Anti-patrón 3

No mostrar estadísticas negativas.

Incorrecto.

```
Has dejado sin terminar

34 tareas.
```

Correcto.

```
Hoy tienes

2 tareas activas.
```

La aplicación nunca debe generar culpa.

---

## Anti-patrón 4

No utilizar fechas como categorías.

Incorrecto.

```
Con fecha.

Sin fecha.
```

Correcto.

```
Task

Reminder

Activity
```

La fecha es una propiedad.

Nunca una identidad.

---

## Anti-patrón 5

No crear nuevos tipos de Item sin actualizar esta especificación.

Toda nueva categoría deberá justificarse.

Antes de implementarla responder.

¿Realmente es un nuevo tipo?

o

¿Es simplemente una propiedad?

La mayoría de nuevas ideas deberían resolverse mediante propiedades.

No mediante nuevos modelos.

---

## Anti-patrón 6

Nunca mostrar más información de la necesaria.

Ejemplo.

Si el usuario está creando un Recordatorio.

No mostrar.

Objetivos.

Roadmaps.

Horas estimadas.

Prioridad.

Comentarios.

Porque no pertenecen a ese flujo.

Cada pantalla debe contener únicamente aquello necesario para completar la acción.

---

## Anti-patrón 7

No preguntar demasiado al usuario.

Cada decisión adicional aumenta la fricción.

El formulario ideal contiene únicamente:

Lo imprescindible.

Todo lo demás deberá inferirse o configurarse automáticamente.

---

## Anti-patrón 8

No obligar al usuario a organizar constantemente la aplicación.

Si una funcionalidad requiere mantenimiento frecuente.

Probablemente está mal diseñada.

La aplicación debe organizar automáticamente la mayor parte de la información.

---

# Capítulo 75
# Invariantes del sistema

Los siguientes principios siempre deben cumplirse.

Una Task puede pertenecer a un Goal.

Un Reminder nunca puede pertenecer a un Goal.

Una Activity nunca puede pertenecer a un Goal.

---

Una Activity nunca puede completarse.

Solo puede registrarse como realizada.

---

Todo Item tiene un ID único.

---

Todo Item puede archivarse.

---

Todo Item puede etiquetarse.

---

Todo Item tiene fecha de creación.

---

Todo cambio actualiza updatedAt.

---

Toda acción importante genera historial.

---

Todo formulario puede cancelarse sin perder información ya guardada.

---

La Home nunca muestra todos los Items.

---

El botón "No sé qué hacer" nunca devuelve más de ocho resultados.

---

Toda pantalla responde exactamente a una pregunta.

Si una pantalla responde dos preguntas distintas.

Debe dividirse.

---

# Capítulo 76
# Principios de evolución

Este documento está diseñado para durar varios años.

Por tanto, cualquier nueva funcionalidad deberá cumplir las siguientes normas.

1. No romper migraciones anteriores.

2. No modificar el modelo mental del usuario.

3. No introducir nuevos conceptos si los existentes ya resuelven el problema.

4. Favorecer la reutilización antes que la especialización.

5. Reducir el número de decisiones que el usuario debe tomar.

6. Reducir el número de decisiones que el desarrollador debe tomar.

7. Documentar cualquier excepción a estas reglas antes de implementarla.
---

# Capítulo 77
# Reglas del negocio

Este capítulo define el comportamiento exacto de la aplicación.

No describe la implementación.

Describe cómo debe comportarse el producto.

Estas reglas tienen prioridad sobre cualquier decisión técnica.

---

# 77.1 Creación de Items

Todo Item debe pertenecer exactamente a un tipo.

Nunca podrá existir un Item sin tipo.

Tipos válidos.

- Task
- Reminder
- Activity

Si en futuras versiones aparecen nuevos tipos, deberán añadirse explícitamente al enum `ItemType`.

---

# 77.2 Título

Todo Item debe tener un título.

No se permite guardar:

```
""
```

ni

```
"      "
```

El Store deberá eliminar espacios sobrantes automáticamente.

---

# 77.3 Descripción

La descripción siempre es opcional.

Nunca bloquear la creación de un Item por no tener descripción.

---

# 77.4 Archivado

Todo Item puede archivarse.

Archivar significa.

- deja de aparecer en las listas principales.
- sigue existiendo.
- sigue formando parte del historial.
- puede restaurarse.

Nunca eliminar automáticamente un Item recién archivado.

---

# 77.5 Eliminación

Eliminar significa eliminar definitivamente.

Antes deberá pasar por la Papelera.

Flujo.

```
Activo

↓

Archivado

↓

Papelera

↓

Eliminado
```

Esto minimiza pérdidas accidentales.

---

# 77.6 Conversión

Todo Item puede convertirse.

Las conversiones permitidas.

Task

↓

Reminder

Task

↓

Activity

Reminder

↓

Task

Reminder

↓

Activity

Activity

↓

Task

Activity

↓

Reminder

No existen restricciones.

Pero cada conversión deberá adaptar únicamente los campos compatibles.

---

# 77.7 Favoritos

Todo Item puede marcarse como favorito.

Nunca utilizar favoritos como prioridad.

Son conceptos distintos.

---

# 77.8 Etiquetas

Las etiquetas nunca modifican el comportamiento.

Únicamente ayudan a organizar.

Ningún algoritmo debe depender exclusivamente de ellas.

---

# Capítulo 78
# Casos límite

Este capítulo define situaciones excepcionales.

---

## Caso

Eliminar un Goal.

Si contiene tareas.

Mostrar.

```
Este objetivo contiene 12 tareas.

¿Qué quieres hacer?

•

Mantener tareas.

•

Archivar tareas.

•

Eliminar tareas.
```

Nunca eliminar automáticamente.

---

## Caso

Eliminar una Phase.

Las tareas pasan al Goal principal.

Nunca eliminarlas.

---

## Caso

Eliminar un TimeSlot.

Las tareas conservan la fecha.

Pierden únicamente la referencia al TimeSlot.

---

## Caso

Convertir una Activity en Task.

Conservar.

Título.

Descripción.

Etiquetas.

Favorito.

Eliminar.

Historial de actividad.

Añadir.

completed = false

priority = medium

por defecto.

---

## Caso

Convertir una Task en Activity.

Eliminar.

Prioridad.

Goal.

Phase.

TimeSlot.

Horas estimadas.

Conservar.

Título.

Comentarios.

Descripción.

---

## Caso

Eliminar una categoría de Activity.

Las Activities pasan automáticamente a.

```
OTHER
```

Nunca eliminarlas.

---

## Caso

Importar un backup antiguo.

Ejecutar automáticamente todas las migraciones pendientes.

Nunca intentar leer directamente datos antiguos.

---

## Caso

ID duplicado.

Generar automáticamente uno nuevo.

Registrar advertencia.

Nunca sobrescribir información.

---

# Capítulo 79
# Estados de una pantalla

Toda pantalla puede encontrarse únicamente en uno de estos estados.

---

## Loading

```
Cargando...
```

---

## Empty

```
No hay información.
```

Siempre acompañado de una acción.

Ejemplo.

```
Crear tarea
```

---

## Success

Lista normal.

---

## Error

Nunca mostrar únicamente.

```
Ha ocurrido un error.
```

Siempre ofrecer.

Reintentar.

---

## Offline

Mostrar indicador discreto.

Nunca bloquear el uso.

---

# Capítulo 80
# Estados de un Item

Todo Item atraviesa un ciclo de vida.

```
Creado

↓

Editado

↓

Archivado

↓

Papelera

↓

Eliminado
```

Las Tasks además pueden pasar por.

```
Completado
```

Las Activities por.

```
Realizado
```

Los Reminders por.

```
Notificado
```

---

# Capítulo 81
# Reglas para la interfaz

Nunca utilizar.

Más de un Floating Action Button.

---

Nunca mostrar.

Dos botones primarios.

---

Nunca ocultar acciones importantes dentro de menús.

---

Toda acción destructiva requiere confirmación.

Excepto.

Archivar.

---

Toda pantalla debe ser usable únicamente con una mano.

---

Todo botón importante debe estar situado en la parte inferior o fácilmente alcanzable.

---

# Capítulo 82
# Errores recuperables

Toda operación debe poder recuperarse.

Ejemplo.

```
Eliminar

↓

Snackbar

↓

Deshacer
```

Duración.

5 segundos.

---

Archivar.

↓

Deshacer.

---

Conversión.

↓

Deshacer.

---

Nunca perder información inmediatamente.

---

# Capítulo 83
# Objetivos de rendimiento

Tiempo máximo para abrir la Home.

<150 ms

---

Cambio entre pestañas.

<100 ms

---

Guardar un Item.

<50 ms

---

Búsqueda.

Resultados iniciales.

<100 ms

---

Sugerencias.

<200 ms

---

Estos tiempos deben cumplirse con aproximadamente.

1000 Items.

---

# Capítulo 84
# Escalabilidad

La arquitectura deberá soportar sin modificaciones importantes.

- 10.000 Items.
- 100 Goals.
- 500 Lists.
- Miles de comentarios.

No asumir que el usuario tendrá pocos datos.

---

# Capítulo 85
# Regla final

Antes de implementar cualquier funcionalidad responder.

1.

¿Reduce carga mental?

2.

¿Es consistente con el modelo mental?

3.

¿Existe ya una solución similar en la aplicación?

4.

¿Puede resolverse reutilizando un componente?

5.

¿Esta funcionalidad seguirá teniendo sentido dentro de cinco años?

Si alguna respuesta es negativa, detener la implementación y revisar el diseño.

---

Fin del bloque de reglas del negocio.

---

# Capítulo 86
# Filosofía operacional

Este capítulo define cómo "piensa" RubeRemember.

No describe interfaces.

No describe código.

Describe los criterios que deberá seguir la aplicación cuando existan varias opciones igualmente válidas.

---

## Regla 1

La aplicación siempre intentará reducir el número de decisiones del usuario.

Si una decisión puede automatizarse con seguridad, deberá automatizarse.

---

## Regla 2

La aplicación mostrará únicamente aquello que sea relevante en ese momento.

No porque el resto no exista.

Sino porque mostrar demasiada información genera ruido.

---

## Regla 3

La aplicación nunca interrumpirá al usuario sin una razón importante.

Las notificaciones son una herramienta.

Nunca un mecanismo de presión.

---

## Regla 4

Siempre que sea posible, la aplicación propondrá antes que preguntar.

Ejemplo.

En lugar de:

```
¿Qué prioridad quieres?
```

Asignar.

```
Media
```

Y permitir modificarla después.

---

## Regla 5

Todo comportamiento automático deberá poder entenderse fácilmente.

El usuario nunca debe preguntarse.

"¿Por qué ha ocurrido esto?"

---

# Capítulo 87
# Convenciones de desarrollo

Todo el código nuevo deberá seguir las siguientes normas.

---

## Naming

Utilizar nombres explícitos.

Correcto.

```typescript
getTodayReminders()
```

Incorrecto.

```typescript
getData()
```

---

## Componentes

Un componente debe resolver un único problema.

Si supera aproximadamente 300 líneas de código, considerar dividirlo.

---

## Store

Toda modificación del estado deberá pasar por acciones públicas.

Nunca modificar el estado directamente.

---

## Comentarios

Comentar únicamente el "por qué".

Nunca comentar el "qué".

Incorrecto.

```typescript
// Incrementa el contador

count++
```

Correcto.

```typescript
// Se incrementa aquí para evitar repetir
// sugerencias recientes.
```

---

# Capítulo 88
# Criterios de calidad

Una funcionalidad se considera terminada únicamente cuando cumple todos estos puntos.

- Funciona.
- No rompe migraciones.
- Respeta la filosofía del producto.
- Mantiene el rendimiento esperado.
- Incluye manejo de errores.
- Está documentada.
- Es reutilizable.

Si falta cualquiera de estos puntos, la funcionalidad no debe considerarse finalizada.

---

# Capítulo 89
# Definición de "hecho"

Una tarea de desarrollo solo podrá marcarse como completada cuando:

- El código compile sin errores.
- Existan pruebas manuales satisfactorias.
- La interfaz sea consistente con el resto de la aplicación.
- No existan regresiones conocidas.
- Se haya actualizado esta especificación si el comportamiento ha cambiado.

---

# Capítulo 90
# Evolución del producto

RubeRemember debe crecer lentamente.

Es preferible añadir pocas funcionalidades muy bien integradas que muchas funcionalidades desconectadas.

Antes de añadir cualquier característica nueva deberá responderse:

- ¿Qué problema real resuelve?
- ¿Puede resolverse con el modelo actual?
- ¿Aumenta o reduce la carga mental?
- ¿Complica la interfaz?
- ¿Seguirá siendo útil dentro de cinco años?

Si la respuesta no está clara, la funcionalidad deberá posponerse.

---

# Capítulo 91
# Visión a largo plazo

RubeRemember aspira a convertirse en un segundo cerebro personal.

No pretende gestionar únicamente tareas.

Pretende ayudar al usuario a recordar, organizar, decidir y actuar con la menor carga mental posible.

Toda evolución futura deberá reforzar esta idea.

Nunca alejarse de ella.

---

# Conclusión

La versión 2 de RubeRemember no representa únicamente una actualización técnica.

Representa una redefinición completa del producto.

El objetivo deja de ser almacenar tareas y pasa a ser organizar la mente del usuario.

Esta especificación constituye la fuente de verdad del proyecto.

Cualquier implementación deberá seguir los principios aquí definidos.

Cuando exista conflicto entre una decisión técnica y la filosofía del producto, deberá prevalecer siempre la filosofía.

El éxito de RubeRemember no se medirá por el número de funcionalidades implementadas, sino por la capacidad de reducir la carga mental del usuario y ofrecer una experiencia sencilla, coherente y agradable.

---

# Anexo A
## Resumen para Antigravity

Antes de comenzar cualquier implementación:

1. Leer este documento completo.
2. Comprender la diferencia entre Task, Reminder y Activity.
3. No modificar la arquitectura sin actualizar esta especificación.
4. Priorizar siempre la simplicidad frente a la complejidad.
5. Evitar duplicidad de lógica y componentes.
6. Mantener compatibilidad con versiones anteriores.
7. Implementar por fases y validar cada una antes de continuar.

Si una decisión no está documentada, elegir siempre la alternativa que:

- reduzca la carga mental del usuario,
- mantenga la coherencia del modelo,
- reutilice la arquitectura existente,
- y simplifique el mantenimiento futuro.

---

# Fin del documento