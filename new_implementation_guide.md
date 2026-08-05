# RubeRemember - Implementation Guide

> Documento de implementación técnica del sistema definido en **RubeRemember - Cognitive Architecture Specification**.
>
> Este documento no explica la filosofía del sistema ni justifica decisiones de diseño. Su único objetivo es servir como guía de implementación para desarrollar todas las funcionalidades de RubeRemember de forma ordenada, modular y mantenible.

---

# 1. Objetivos

Este documento define:

- Qué módulos deben implementarse.
- En qué orden deben desarrollarse.
- Qué responsabilidades tiene cada componente.
- Qué cambios requiere cada pantalla.
- Qué modelos de datos nuevos deben añadirse.
- Qué servicios debe utilizar cada pantalla.
- Qué checklist debe completarse antes de considerar terminada cada fase.

La implementación deberá respetar siempre la arquitectura descrita en **Cognitive Architecture Specification**.

---

# 2. Arquitectura general

La aplicación se dividirá en cinco grandes capas.

```
UI

↓

Screens

↓

Services

↓

Cognitive Engine

↓

Database
```

Cada capa únicamente podrá comunicarse con la inmediatamente inferior.

Ejemplo.

```
HomeScreen

↓

RecommendationService

↓

Cognitive Engine

↓

Repositories

↓

SQLite
```

La interfaz nunca accederá directamente a la base de datos.

Todo deberá pasar por los servicios correspondientes.

---

# 3. Organización del proyecto

Se recomienda reorganizar el proyecto para separar claramente la lógica de negocio de la interfaz.

```
src/

    components/

    screens/

    navigation/

    database/

    repositories/

    services/

    engines/

    models/

    hooks/

    utils/

    notifications/

    settings/
```

---

## components/

Componentes reutilizables.

Ejemplos.

```
RecommendationCard

TaskCard

ReminderCard

FocusCard

EnergyBadge

WeightBadge

ExecutionStrategyBadge

SessionProgress

SessionTimer

ProgressWidget
```

Los componentes nunca contendrán lógica de negocio.

Únicamente mostrarán información.

---

## screens/

Pantallas completas.

Ejemplos.

```
HomeScreen

TasksScreen

ReminderScreen

TaskDetailScreen

SessionScreen

SettingsScreen

FocusSettingsScreen
```

Cada pantalla únicamente solicitará información a los servicios.

Nunca realizará cálculos.

---

## services/

Toda la lógica utilizada por la interfaz.

Ejemplos.

```
RecommendationService

ReminderService

FocusService

TaskService

SessionService

SettingsService
```

Los servicios podrán combinar varios Engines cuando sea necesario.

---

## engines/

Aquí vivirá todo el Cognitive Engine.

Cada Engine ocupará un archivo independiente.

```
ScoreEngine

FocusEngine

EnergyEngine

TransitionEngine

RecommendationEngine

ProgressEngine

SessionEngine

NotificationEngine

CognitiveEngine
```

Ningún Engine podrá depender directamente de otro.

El único autorizado para coordinarlos será el Cognitive Engine.

---

## repositories/

Responsables del acceso a datos.

Ejemplos.

```
TaskRepository

ReminderRepository

SessionRepository

SettingsRepository

StatisticsRepository
```

Toda consulta SQL deberá encontrarse aquí.

Nunca en los servicios.

Nunca en las pantallas.

---

# 4. Flujo general de una recomendación

Cuando el usuario pulse.

```
No sé qué hacer
```

La aplicación ejecutará exactamente el siguiente flujo.

```
HomeScreen

↓

RecommendationService

↓

CognitiveEngine

↓

ContextEngine

↓

ReminderEngine

↓

FocusEngine

↓

ScoreEngine

↓

EnergyEngine

↓

TransitionEngine

↓

RecommendationEngine

↓

SessionEngine

↓

Recommendation

↓

HomeScreen
```

La Home únicamente recibe el resultado final.

Nunca participa en los cálculos.

---

# 5. Modelos nuevos

Además del modelo actual de Task deberán añadirse nuevos modelos.

```
Reminder

Session

Recommendation

FocusTask

UserSettings

Statistics
```

Cada modelo tendrá una única responsabilidad.

No deberán reutilizarse estructuras para representar conceptos diferentes.

---

# 6. Evolución del modelo Task

El modelo Task deberá ampliarse.

Campos existentes.

```
Título

Descripción

Fecha

Franja horaria

Prioridad

Peso

Etiquetas
```

Nuevos campos.

```
ExecutionStrategy

EnergyType

TaskState

Progress

NextStep

LastProgress

WorkedTime

SessionsCount

LastSession

FocusLocked

RecommendationCooldown
```

No todos estos campos serán visibles para el usuario.

Muchos existirán únicamente para alimentar el Cognitive Engine.

---

# 7. Principios de implementación

Durante todo el desarrollo deberán respetarse estas normas.

- Ninguna pantalla contendrá lógica de negocio.
- Ningún componente accederá a SQLite.
- Todo cálculo pasará por un Engine o un Service.
- Toda decisión deberá poder explicarse.
- Los Engines serán completamente independientes.
- El Cognitive Engine será el único orquestador.
- Las reglas de negocio nunca estarán duplicadas.

Estas normas deberán mantenerse incluso aunque impliquen escribir algo más de código, ya que facilitarán enormemente el mantenimiento futuro.

---
---

# PARTE II · Modelos de datos

El objetivo de esta sección es definir todas las entidades que deberán existir dentro de RubeRemember.

Cada modelo representa un concepto independiente.

No deberán mezclarse responsabilidades entre modelos.

---

# 8. Modelo Task

La entidad Task continúa siendo el núcleo de la aplicación, pero deja de ser un simple contenedor de información.

Ahora almacena tanto la descripción de una tarea como el estado necesario para que el Cognitive Engine pueda tomar decisiones.

---

## Información básica

Campos ya existentes.

```
id

title

description

startDate

endDate

timeSlot

priority

weight

tags
```

---

## Nuevos campos

```
executionStrategy

energyType

taskState

focusLocked

progress

nextStep

lastProgress

workedTime

sessionsCount

lastSession

recommendationCooldown

createdAt

updatedAt
```

---

## Responsabilidad

Una Task únicamente almacena información.

Nunca contiene lógica.

Todos los cálculos deberán realizarse desde los Engines.

---

# 9. Modelo Reminder

Los Recordatorios dejan de ser tareas especiales.

Se convierten en una entidad independiente.

Esto simplifica enormemente la lógica del algoritmo.

---

## Campos

```
id

title

description

date

time

repeatRule

priority

state

notificationEnabled

createdAt

updatedAt
```

---

## Estados

```
Programado

Activo

Completado

Cancelado
```

Los Recordatorios nunca tendrán Peso.

Nunca tendrán Estrategia.

Nunca tendrán Tipo de Energía.

Su única función es recordar información.

---

# 10. Modelo Session

Toda interacción real con una tarea genera una Session.

Las sesiones serán la base para medir progreso y generar estadísticas.

---

## Campos

```
id

taskId

startTime

endTime

plannedDuration

realDuration

completed

notes

createdAt
```

---

## Información registrada

Cada sesión deberá guardar.

- Hora de inicio.
- Hora de finalización.
- Tiempo realmente invertido.
- Si hubo avance.
- Notas opcionales del usuario.

Nunca modificará directamente la tarea.

El Progress Engine será quien procese posteriormente esta información.

---

# 11. Modelo Recommendation

Las recomendaciones no se calcularán continuamente desde cero por la interfaz.

Se representarán mediante un modelo propio.

---

## Campos

```
taskId

score

reason

recommendedDuration

generatedAt

priorityLevel

energyAdjustment

transitionAdjustment
```

---

## Objetivo

La Home únicamente necesita saber.

```
Qué tarea.

↓

Por qué.

↓

Durante cuánto tiempo.
```

Toda la complejidad del cálculo ya habrá ocurrido previamente.

---

# 12. Modelo UserSettings

Toda configuración relacionada con el Cognitive Engine deberá almacenarse de forma centralizada.

Nunca repartida entre distintos módulos.

---

## Configuración general

```
maxFocusTasks

defaultCooldown

notificationsEnabled

sleepSchedule

workingHours

preferredOrderEnergy

preferredOrderWeight
```

---

## Configuración de sesiones

Cada Peso tendrá su propia duración configurable.

```
LunaDuration

TerraDuration

SolDuration

AstraDuration
```

Ejemplo.

```
Luna

30 minutos
```

```
Terra

45 minutos
```

```
Sol

90 minutos
```

```
Astra

20 minutos
```

El Session Engine utilizará siempre estos valores.

Nunca estarán codificados dentro del algoritmo.

---

# 13. Modelo Statistics

El sistema necesitará información agregada para mostrar estadísticas sin recalcular continuamente todas las sesiones.

---

## Campos

```
totalSessions

totalWorkedTime

completedTasks

focusTasksCompleted

currentStreak

longestStreak

averageSessionTime

averageDailyWork

lastActivity
```

---

## Responsabilidad

Las estadísticas nunca participarán en las recomendaciones.

Su única finalidad será mostrar información al usuario.

El Cognitive Engine únicamente consultará datos históricos cuando el Future Engine esté disponible.

---

# 14. Relaciones entre entidades

La relación entre modelos queda definida de la siguiente forma.

```
Task

↓

1 → N

↓

Session
```

---

```
Task

↓

1 → 0..1

↓

Recommendation
```

---

```
UserSettings

↓

1

↓

Cognitive Engine
```

---

```
Reminder

↓

Independiente
```

Los Recordatorios nunca dependerán de una Task.

Las Tasks nunca dependerán de un Reminder.

Ambos conceptos deberán evolucionar por separado.

---

# 15. Migración de la base de datos

La evolución del modelo requerirá una migración de datos.

El objetivo es mantener toda la información existente del usuario.

---

## Nuevas columnas

Añadir los nuevos campos de Task.

Crear las tablas.

```
Sessions

Recommendations

Statistics
```

Crear los índices necesarios para optimizar las consultas frecuentes.

Especialmente.

- Focus Tasks.
- Prioridad.
- Fecha límite.
- Estado.
- Recordatorios activos.

La migración nunca deberá eliminar datos existentes.

Los nuevos campos recibirán valores por defecto compatibles con el sistema anterior.

---

---

# PARTE III · Servicios

Los Services constituyen la capa de comunicación entre la interfaz y el Cognitive Engine.

Las pantallas nunca accederán directamente a un Engine.

Siempre utilizarán un Service.

Cada Service tendrá una responsabilidad única.

---

# 16. RecommendationService

## Objetivo

Es el punto de entrada para cualquier petición relacionada con recomendaciones.

Toda la Home dependerá de este servicio.

---

## Responsabilidades

- Solicitar una recomendación principal.
- Solicitar recomendaciones secundarias.
- Solicitar una actividad de ocio.
- Generar la explicación de una recomendación.
- Invalidar recomendaciones antiguas.
- Solicitar un nuevo cálculo cuando cambie el contexto.

---

## Entradas

El servicio recibirá.

```
Usuario

↓

Contexto actual

↓

Configuración

↓

Estado de tareas
```

---

## Salida

Siempre devolverá un único objeto Recommendation.

Nunca devolverá una lista de tareas sin procesar.

---

## Dependencias

```
CognitiveEngine

TaskRepository

SettingsRepository

ReminderService
```

---

# 17. TaskService

## Objetivo

Centralizar todas las operaciones relacionadas con tareas.

---

## Responsabilidades

- Crear Task.
- Editar Task.
- Eliminar Task.
- Actualizar progreso.
- Cambiar estado.
- Actualizar Focus.
- Gestionar etiquetas.
- Gestionar Peso.
- Gestionar Estrategia.
- Gestionar Tipo de Energía.

---

## Regla importante

Modificar una Task nunca actualizará directamente el Cognitive Engine.

Siempre notificará al RecommendationService para que decida si es necesario recalcular.

---

# 18. SessionService

## Objetivo

Gestionar todas las sesiones de trabajo.

El resto del sistema nunca manipulará sesiones directamente.

---

## Responsabilidades

- Crear sesión.
- Iniciar sesión.
- Finalizar sesión.
- Cancelar sesión.
- Registrar avance.
- Registrar tiempo trabajado.
- Actualizar estadísticas.

---

## Flujo

```
Usuario

↓

Comenzar sesión

↓

SessionService

↓

Crear Session

↓

Temporizador

↓

Finalizar

↓

ProgressEngine

↓

Actualizar Task
```

---

## Regla

Nunca modificar el progreso directamente.

Siempre utilizar el Progress Engine.

---

# 19. ReminderService

## Objetivo

Gestionar completamente el sistema de recordatorios.

---

## Responsabilidades

- Crear Recordatorio.
- Editar Recordatorio.
- Eliminar Recordatorio.
- Activar Recordatorio.
- Confirmar Recordatorio.
- Reprogramar.
- Gestionar repeticiones.

---

## Integración

Cuando un Reminder pasa a estado Activo.

El ReminderService notificará inmediatamente al RecommendationService.

La Home deberá actualizarse automáticamente.

---

# 20. FocusService

## Objetivo

Gestionar las Focus Tasks.

---

## Responsabilidades

- Calcular Focus.
- Promocionar nuevas tareas.
- Actualizar Focus al completar una Task.
- Respetar el máximo configurado.
- Permitir fijar o liberar manualmente una Focus Task.

---

## Regla

El cálculo siempre será realizado por el Focus Engine.

El Service únicamente coordina el proceso.

---

# 21. SettingsService

## Objetivo

Gestionar toda la configuración del usuario.

---

## Responsabilidades

- Leer configuración.
- Guardar configuración.
- Restaurar valores por defecto.
- Actualizar duración de bloques.
- Actualizar número máximo de Focus Tasks.
- Actualizar orden de Energías.
- Actualizar orden de Pesos.
- Actualizar horarios protegidos.
- Actualizar preferencias generales.

---

## Eventos

Cuando una configuración afecte al Cognitive Engine.

El SettingsService solicitará automáticamente un recálculo de recomendaciones.

Ejemplos.

- Cambia la duración Terra.
- Cambia el orden de Energías.
- Cambia el máximo de Focus.
- Cambia el horario laboral.

---

# 22. StatisticsService

## Objetivo

Proporcionar estadísticas a la interfaz.

Nunca generar recomendaciones.

---

## Responsabilidades

- Tiempo trabajado.
- Sesiones realizadas.
- Rachas.
- Distribución por Peso.
- Distribución por Energía.
- Historial semanal.
- Historial mensual.

---

## Fuente

Toda la información procederá de:

```
Sessions

↓

Statistics

↓

Task
```

Nunca recalculará datos directamente desde la interfaz.

---

# 23. NotificationService

## Objetivo

Centralizar completamente las notificaciones.

---

## Responsabilidades

- Programar notificaciones.
- Cancelarlas.
- Actualizarlas.
- Agrupar recordatorios.
- Respetar horarios protegidos.
- Lanzar recordatorios de sesiones cuando corresponda.

---

## Importante

El NotificationService nunca decidirá qué notificación crear.

Solo ejecutará las órdenes recibidas.

Las decisiones pertenecen al Cognitive Engine.

---

# 24. Comunicación entre servicios

La comunicación seguirá siempre esta dirección.

```
Screens

↓

Services

↓

Engines

↓

Repositories

↓

Database
```

Nunca al revés.

Los Services no deberán comunicarse directamente entre ellos salvo cuando sea estrictamente necesario.

Siempre que sea posible, la coordinación deberá realizarla el Cognitive Engine o el RecommendationService.

Esto evita dependencias circulares y facilita el mantenimiento del proyecto.

---

---

# PARTE IV · Pantallas

Cada pantalla deberá tener una única responsabilidad.

La interfaz nunca implementará lógica de negocio.

Toda decisión será delegada a los Services correspondientes.

---

# 25. HomeScreen

La Home deja de ser un simple resumen de tareas.

Pasa a convertirse en el centro del Cognitive Engine.

Su objetivo es responder inmediatamente a una única pregunta.

> ¿Qué debería hacer ahora?

---

## Secciones

La Home deberá construirse siempre en este orden.

```
Resumen

↓

Recomendación principal

↓

Focus Tasks

↓

Recordatorios de hoy

↓

Actividad de ocio

↓

Progreso diario
```

Si alguna sección no tiene contenido.

Simplemente no se mostrará.

Nunca se rellenará con información innecesaria.

---

## Resumen superior

Continuará mostrando.

```
Número de tareas

↓

Número de recordatorios

↓

Número de actividades de ocio
```

Estos valores deberán actualizarse automáticamente.

---

## Recomendación principal

Sustituye completamente el concepto actual de "Mi enfoque actual".

Mostrará.

```
Título

↓

Explicación

↓

Tiempo recomendado

↓

Peso

↓

Estrategia

↓

Tipo de energía

↓

Botón "Comenzar sesión"

↓

Botón "No ahora"
```

Toda esta información procederá directamente del RecommendationService.

---

## Focus Tasks

Debajo de la recomendación aparecerán todas las Focus Tasks.

Cada tarjeta mostrará únicamente.

```
Título

Prioridad

Peso

Estado

Último avance
```

Nunca mostrar descripciones largas.

El objetivo es visualizar rápidamente el foco semanal.

---

## Recordatorios

Solo aparecerán Recordatorios activos para el día actual.

Cada uno incluirá.

```
Título

Hora

Confirmar

Posponer
```

No se mezclarán con las tareas.

---

## Actividad de ocio

Si existe una actividad recomendada.

Se mostrará al final de la Home.

```
Actividad

↓

Tiempo estimado

↓

Botón "Realizar"
```

Nunca ocupará espacio reservado para una Task.

---

## Progreso diario

Nueva sección.

Mostrará.

```
Tiempo trabajado

↓

Sesiones realizadas

↓

Focus completadas

↓

Racha actual
```

Toda la información procederá del StatisticsService.

---

# 26. Task List Screen

La pantalla de tareas seguirá siendo el lugar donde el usuario administra todas sus tareas.

No será el lugar donde decide qué hacer.

---

## Filtros

Además de los filtros actuales.

Añadir.

```
Estrategia

↓

Tipo de Energía

↓

Estado

↓

Focus

↓

Con sesiones

↓

Sin sesiones
```

Todos los filtros podrán combinarse.

---

## Ordenaciones

Permitir ordenar por.

```
Fecha

Prioridad

Peso

Score

Última sesión

Tiempo invertido

Número de sesiones
```

---

## Acciones rápidas

Cada tarjeta permitirá.

```
Editar

Duplicar

Archivar

Completar

Iniciar sesión

Añadir a Focus

Eliminar
```

---

# 27. Task Detail Screen

Esta pantalla será la más completa de la aplicación.

Aquí se editará toda la información relacionada con una tarea.

---

## Sección básica

```
Título

Descripción

Fechas

Franja horaria
```

---

## Sección cognitiva

Nueva sección.

```
Peso

↓

Prioridad

↓

Estrategia

↓

Tipo de Energía

↓

Estado
```

Todos estos valores podrán modificarse desde aquí.

---

## Sección de progreso

Dependiendo del Peso.

La interfaz cambiará automáticamente.

---

### Luna

Mostrar.

```
Tiempo invertido

↓

Estado
```

---

### Terra

Mostrar.

```
Porcentaje

↓

Sesiones

↓

Último avance
```

---

### Sol

Mostrar.

```
Próximo paso

↓

Último paso

↓

Tiempo total
```

---

### Astra

Mostrar.

```
Racha

↓

Frecuencia

↓

Última sesión
```

Cada Peso tendrá una interfaz específica.

---

## Historial

Nueva sección.

Listado completo de sesiones realizadas.

Cada sesión mostrará.

```
Fecha

Duración

Resultado

Notas
```

---

# 28. Reminder Screen

Pantalla completamente independiente.

No compartirá componentes con Task.

---

## Información

Cada Reminder incluirá.

```
Título

Descripción

Fecha

Hora

Repetición

Estado
```

---

## Acciones

```
Editar

↓

Completar

↓

Posponer

↓

Eliminar
```

---

# 29. Session Screen

Nueva pantalla.

Aparecerá al comenzar una sesión.

---

## Contenido

```
Nombre de la tarea

↓

Objetivo

↓

Tiempo recomendado

↓

Temporizador

↓

Finalizar sesión
```

---

## Al finalizar

Mostrar automáticamente.

```
¿Has avanzado?

↓

Sí

↓

No
```

Si responde.

```
Sí
```

Solicitar opcionalmente.

```
¿Qué has conseguido?
```

Esta información actualizará el historial de la tarea.

---

# 30. Focus Screen

Nueva pantalla opcional.

Permitirá visualizar todas las Focus Tasks.

---

## Contenido

```
Focus actuales

↓

Score

↓

Último avance

↓

Tiempo invertido

↓

Progreso
```

---

## Acciones

```
Eliminar del foco

↓

Fijar manualmente

↓

Abrir tarea
```

---

# 31. Settings Screen

La configuración crecerá considerablemente.

Será recomendable dividirla en varias categorías.

---

## General

```
Número máximo Focus

↓

Duración bloques

↓

Cooldown

↓

Horario laboral

↓

Horario descanso
```

---

## Cognitive Engine

```
Orden Energías

↓

Orden Pesos

↓

Duraciones

↓

Comportamiento recomendaciones
```

---

## Notificaciones

```
Recordatorios

↓

Sesiones

↓

Silencio

↓

Agrupación
```

---

## Estadísticas

```
Reiniciar estadísticas

↓

Exportar datos

↓

Importar configuración
```

La pantalla de configuración será la única responsable de modificar el comportamiento general del algoritmo.

---

---

# PARTE V · Orden de implementación

El desarrollo deberá realizarse por fases.

Cada fase deberá quedar completamente funcional antes de comenzar la siguiente.

No se recomienda desarrollar varios Engines simultáneamente.

---

# Fase 1 · Evolución del modelo de datos

## Objetivo

Preparar la base de datos para soportar el nuevo Cognitive Engine.

---

## Implementar

Ampliar el modelo Task.

Crear.

```
Session

Reminder

Recommendation

Statistics
```

Añadir todos los nuevos campos.

```
ExecutionStrategy

EnergyType

TaskState

FocusLocked

WorkedTime

SessionsCount

LastProgress

NextStep

RecommendationCooldown
```

---

## Migraciones

Crear migraciones compatibles con versiones anteriores.

Todos los nuevos campos deberán tener valores por defecto.

Ningún usuario deberá perder información.

---

## Validación

Antes de continuar.

Comprobar.

```
✓ Crear Task

✓ Editar Task

✓ Eliminar Task

✓ Crear Reminder

✓ Crear Session
```

Todo debe funcionar antes de escribir una sola línea del Cognitive Engine.

---

# Fase 2 · Repositories

## Objetivo

Centralizar completamente el acceso a datos.

---

## Implementar

```
TaskRepository

ReminderRepository

SessionRepository

SettingsRepository

StatisticsRepository
```

---

## Regla

Toda operación CRUD deberá realizarse desde un Repository.

Eliminar cualquier acceso directo a SQLite desde pantallas o componentes.

---

## Validación

Comprobar que la aplicación continúa funcionando exactamente igual que antes.

En esta fase todavía no debe cambiar el comportamiento del usuario.

---

# Fase 3 · Services

## Objetivo

Introducir la nueva capa de servicios.

---

## Implementar

```
TaskService

ReminderService

SessionService

FocusService

RecommendationService

SettingsService

NotificationService

StatisticsService
```

---

## Regla

Las pantallas dejarán de comunicarse con los Repositories.

Toda petición pasará por el Service correspondiente.

---

## Validación

Revisar que ninguna Screen importe directamente un Repository.

Toda comunicación deberá seguir este flujo.

```
Screen

↓

Service

↓

Repository
```

---

# Fase 4 · Cognitive Engine

Esta fase representa el mayor cambio del proyecto.

El Engine deberá desarrollarse de forma incremental.

Nunca implementar todos los módulos a la vez.

---

## Orden recomendado

```
Context Engine

↓

Score Engine

↓

Focus Engine

↓

Recommendation Engine

↓

Session Engine

↓

Progress Engine

↓

Energy Engine

↓

Transition Engine

↓

Notification Engine

↓

Cognitive Engine
```

Este orden reduce al mínimo las dependencias entre módulos.

---

## Validación

Después de implementar cada Engine.

Crear pruebas unitarias independientes.

Cada Engine deberá poder ejecutarse de forma aislada.

---

# Fase 5 · Home

Una vez finalizado el Cognitive Engine.

Actualizar completamente la Home.

---

## Sustituir

Eliminar.

```
Mi enfoque actual
```

Sustituir por.

```
Recomendación principal
```

Añadir.

```
Focus Tasks

↓

Explicación

↓

Duración recomendada

↓

Botón Comenzar

↓

Botón No ahora
```

---

## Integración

La Home únicamente llamará a.

```
RecommendationService
```

Nunca accederá al Cognitive Engine directamente.

---

# Fase 6 · Sistema de sesiones

## Objetivo

Implementar la experiencia completa de trabajo.

---

## Añadir

Pantalla Session.

Temporizador opcional.

Registro automático.

Actualización del progreso.

Historial.

Pregunta final.

```
¿Has avanzado?
```

---

## Validación

Cada sesión deberá generar automáticamente un registro en la base de datos.

No se permitirá cerrar una sesión sin actualizar su estado.

---

# Fase 7 · Recordatorios

Separar completamente Recordatorios y Tasks.

---

## Implementar

Nueva pantalla.

Nuevo Service.

Integración con NotificationService.

Interrupción del Cognitive Engine cuando exista un Reminder crítico.

---

## Validación

Crear un Reminder para el momento actual.

Comprobar que aparece automáticamente como recomendación principal.

---

# Fase 8 · Configuración avanzada

Implementar toda la configuración del algoritmo.

---

## Añadir

Duración de bloques.

Máximo Focus.

Orden Energías.

Orden Pesos.

Cooldown.

Horarios protegidos.

Configuración de notificaciones.

---

## Drag & Drop

Implementar listas reordenables para.

```
Orden Energías
```

y

```
Orden Pesos
```

Cada modificación deberá recalcular inmediatamente las recomendaciones.

---

# Fase 9 · Estadísticas

Cuando toda la funcionalidad anterior esté estable.

Implementar estadísticas.

---

## Añadir

Tiempo trabajado.

Distribución por Pesos.

Distribución por Energías.

Rachas.

Sesiones.

Focus completadas.

Actividad semanal.

Actividad mensual.

---

## Importante

Las estadísticas deberán construirse utilizando únicamente las Sessions registradas.

Nunca calcular información directamente desde las Tasks.

---

# Fase 10 · Optimización

Última fase.

---

## Revisar

Consultas lentas.

Consumo de memoria.

Duplicidad de lógica.

Código muerto.

Motores sin utilizar.

Dependencias circulares.

---

## Objetivo

Dejar el proyecto preparado para futuras ampliaciones sin necesidad de modificar la arquitectura principal.

---

---

# PARTE VI · Checklist de implementación

Esta checklist deberá utilizarse durante el desarrollo para verificar que cada funcionalidad ha sido implementada correctamente.

No se recomienda avanzar a la siguiente fase mientras existan elementos pendientes.

---

# Base de datos

## Modelo Task

```
☐ Añadir ExecutionStrategy

☐ Añadir EnergyType

☐ Añadir TaskState

☐ Añadir FocusLocked

☐ Añadir WorkedTime

☐ Añadir SessionsCount

☐ Añadir LastProgress

☐ Añadir NextStep

☐ Añadir RecommendationCooldown

☐ Añadir CreatedAt

☐ Añadir UpdatedAt
```

---

## Nuevas tablas

```
☐ Session

☐ Reminder

☐ Recommendation

☐ Statistics
```

---

## Migraciones

```
☐ Crear migración compatible

☐ Mantener datos existentes

☐ Inicializar nuevos campos

☐ Crear índices
```

---

# Repositories

```
☐ TaskRepository

☐ ReminderRepository

☐ SessionRepository

☐ SettingsRepository

☐ StatisticsRepository
```

Verificar.

```
☐ Ninguna Screen accede directamente a SQLite

☐ Ningún Service contiene SQL
```

---

# Services

```
☐ RecommendationService

☐ TaskService

☐ SessionService

☐ ReminderService

☐ FocusService

☐ SettingsService

☐ NotificationService

☐ StatisticsService
```

Comprobar.

```
☐ Todos los Services tienen responsabilidad única

☐ Ningún Service duplica lógica

☐ Comunicación correcta entre capas
```

---

# Engines

```
☐ Context Engine

☐ Score Engine

☐ Focus Engine

☐ Recommendation Engine

☐ Session Engine

☐ Progress Engine

☐ Energy Engine

☐ Transition Engine

☐ Notification Engine

☐ Cognitive Engine
```

Validar.

```
☐ Cada Engine funciona de forma independiente

☐ Existen pruebas unitarias

☐ Ningún Engine depende directamente de otro
```

---

# Home

```
☐ Resumen superior

☐ Recomendación principal

☐ Explicación

☐ Focus Tasks

☐ Recordatorios

☐ Actividad de ocio

☐ Progreso diario
```

Comprobar.

```
☐ Solo existe una recomendación principal

☐ El botón "No sé qué hacer" funciona

☐ El botón "No ahora" funciona

☐ Las recomendaciones se actualizan automáticamente
```

---

# Gestión de tareas

```
☐ Nuevos filtros

☐ Nuevos estados

☐ Nuevas estrategias

☐ Nuevos tipos de energía

☐ Nuevos pesos

☐ Historial

☐ Sesiones
```

---

# Sistema de sesiones

```
☐ Crear sesión

☐ Iniciar sesión

☐ Finalizar sesión

☐ Temporizador opcional

☐ Registrar avance

☐ Registrar tiempo

☐ Actualizar progreso

☐ Crear historial
```

Validar.

```
☐ Cada sesión queda almacenada

☐ Se actualizan estadísticas

☐ Se actualiza la Task
```

---

# Recordatorios

```
☐ Crear

☐ Editar

☐ Eliminar

☐ Repeticiones

☐ Posponer

☐ Confirmar

☐ Notificaciones
```

Validar.

```
☐ Interrumpen correctamente el Cognitive Engine

☐ Aparecen en Home

☐ Se eliminan tras confirmarse
```

---

# Focus

```
☐ Calcular automáticamente

☐ Promoción automática

☐ Máximo configurable

☐ Fijar manualmente

☐ Eliminar manualmente
```

---

# Configuración

```
☐ Duración Luna

☐ Duración Terra

☐ Duración Sol

☐ Duración Astra

☐ Máximo Focus

☐ Cooldown

☐ Orden Energías

☐ Orden Pesos

☐ Horario laboral

☐ Horario descanso

☐ Notificaciones
```

Comprobar.

```
☐ Todo cambio recalcula recomendaciones

☐ Configuración persistente
```

---

# Estadísticas

```
☐ Tiempo trabajado

☐ Sesiones

☐ Rachas

☐ Focus completadas

☐ Distribución por Pesos

☐ Distribución por Energías

☐ Actividad semanal

☐ Actividad mensual
```

---

# Notificaciones

```
☐ Recordatorios

☐ Agrupación

☐ Horarios protegidos

☐ Repeticiones

☐ Cancelación automática

☐ Actualización automática
```

---

# Rendimiento

```
☐ Consultas optimizadas

☐ Índices creados

☐ Sin consultas duplicadas

☐ Sin renders innecesarios

☐ Caché donde sea necesario
```

---

# Arquitectura

Verificar antes de finalizar el proyecto.

```
☐ Ninguna Screen contiene lógica

☐ Ningún Component conoce SQLite

☐ Todo pasa por Services

☐ Todo cálculo pasa por Engines

☐ El Cognitive Engine coordina el sistema

☐ Sin dependencias circulares

☐ Sin lógica duplicada

☐ Código modular

☐ Código documentado
```

---

# Pruebas funcionales

Realizar las siguientes pruebas manuales.

```
☐ Crear Task

☐ Editar Task

☐ Eliminar Task

☐ Completar Task

☐ Crear Reminder

☐ Posponer Reminder

☐ Completar Reminder

☐ Iniciar sesión

☐ Finalizar sesión

☐ Cambiar configuración

☐ Reordenar Energías

☐ Reordenar Pesos

☐ Cambiar duración de bloques

☐ Recalcular Focus

☐ Obtener recomendación

☐ Rechazar recomendación

☐ Comprobar actualización de Home
```

---

# Criterios para considerar el proyecto terminado

La migración al nuevo Cognitive Engine podrá darse por finalizada cuando se cumplan todas las condiciones siguientes.

```
☐ Todos los Engines implementados

☐ Todas las pantallas migradas

☐ Toda la configuración funcional

☐ Todos los modelos creados

☐ Todos los Services implementados

☐ Todas las pruebas superadas

☐ Sin errores conocidos críticos

☐ Arquitectura respetada

☐ Rendimiento aceptable
```

Solo cuando todos estos puntos estén marcados podrá considerarse completada la implementación del nuevo sistema de decisión de RubeRemember.

---

---

# PARTE VII · Roadmap de desarrollo

El siguiente roadmap no es obligatorio, pero representa el orden recomendado para desarrollar RubeRemember minimizando deuda técnica.

Cada fase debe finalizar completamente antes de comenzar la siguiente.

---

# Fase 1 · Infraestructura

## Objetivo

Preparar el proyecto para soportar el nuevo Cognitive Engine.

### Implementar

- Nuevos modelos.
- Migraciones.
- Repositories.
- Services.
- Configuración básica.

### Resultado esperado

La aplicación sigue funcionando igual que antes, pero dispone de la nueva arquitectura.

---

# Fase 2 · Cognitive Engine

## Objetivo

Implementar el sistema de decisión.

### Implementar

- Context Engine.
- Score Engine.
- Focus Engine.
- Recommendation Engine.

### Resultado esperado

La aplicación ya puede recomendar tareas de forma inteligente.

---

# Fase 3 · Sistema de sesiones

## Objetivo

Cambiar la forma de trabajar con las tareas.

### Implementar

- Session Screen.
- Session Engine.
- Progress Engine.
- Historial de sesiones.
- Bloques de trabajo.

### Resultado esperado

Las tareas dejan de marcarse simplemente como hechas y comienzan a registrar trabajo real.

---

# Fase 4 · Personalización

## Objetivo

Adaptar el algoritmo al usuario.

### Implementar

- Orden de Energías.
- Orden de Pesos.
- Duración de bloques.
- Focus configurable.
- Cooldown.
- Horarios protegidos.

### Resultado esperado

Cada usuario obtiene recomendaciones adaptadas a su forma de trabajar.

---

# Fase 5 · Estadísticas

## Objetivo

Mostrar el trabajo realizado.

### Implementar

- Tiempo trabajado.
- Distribución por pesos.
- Distribución por energías.
- Rachas.
- Historial semanal.
- Historial mensual.

### Resultado esperado

Las estadísticas representan el trabajo real y no únicamente el número de tareas completadas.

---

# Fase 6 · Optimización

## Objetivo

Preparar la aplicación para crecer.

### Revisar

- Rendimiento.
- Consultas.
- Caché.
- Renderizados.
- Modularidad.
- Cobertura de pruebas.

---

# Complejidad estimada

| Módulo | Complejidad |
|---------|-------------|
| Base de datos | Baja |
| Repositories | Baja |
| Services | Media |
| Score Engine | Media |
| Focus Engine | Media |
| Recommendation Engine | Alta |
| Progress Engine | Media |
| Session Engine | Media |
| Energy Engine | Alta |
| Transition Engine | Alta |
| Notification Engine | Media |
| Home | Media |
| Configuración | Media |
| Estadísticas | Baja |

---

# Recomendaciones de desarrollo

## Mantener los Engines pequeños

Cada Engine debe tener una única responsabilidad.

Si un Engine comienza a crecer demasiado, debe dividirse en motores más pequeños.

---

## Evitar lógica en la interfaz

Las pantallas nunca deben decidir.

Solo deben representar información.

Toda decisión pertenece al Cognitive Engine.

---

## No optimizar antes de tiempo

Primero debe existir un algoritmo correcto.

Después podrá optimizarse.

Nunca sacrificar claridad por rendimiento prematuro.

---

## Priorizar mantenibilidad

Es preferible escribir más código si eso permite mantener responsabilidades bien separadas.

La claridad tiene prioridad sobre la brevedad.

---

# Futuras ampliaciones

La arquitectura ha sido diseñada para crecer sin modificaciones importantes.

Algunas funcionalidades que podrán añadirse en futuras versiones son.

---

## Learning Engine

Aprender automáticamente los hábitos del usuario.

Ejemplos.

- Horas de mayor productividad.
- Energías preferidas.
- Duración real de las sesiones.
- Patrones de rechazo de recomendaciones.

Siempre proponiendo cambios, nunca aplicándolos automáticamente.

---

## Sincronización

Añadir sincronización entre dispositivos.

El Cognitive Engine no deberá modificarse.

Solo cambiará la capa de persistencia.

---

## Inteligencia Artificial

El modelo actual ya está preparado para incorporar IA.

Posibles usos.

- Generar automáticamente el siguiente paso de una tarea.
- Resumir el progreso de proyectos largos.
- Detectar tareas mal definidas.
- Sugerir divisiones de tareas complejas.
- Recomendar mejores estrategias de ejecución.

La IA deberá actuar como un asistente adicional.

Nunca sustituirá al Cognitive Engine.

---

## Widgets

Mostrar en la pantalla principal del dispositivo.

- Recomendación actual.
- Focus Tasks.
- Recordatorios.
- Tiempo restante de la sesión.

---

## Integraciones

Posibles integraciones futuras.

- Calendario.
- Google Tasks.
- Apple Reminders.
- Outlook.
- Wearables.

Estas integraciones deberán traducirse internamente al modelo de RubeRemember.

Nunca modificar el Cognitive Engine.

---

# Filosofía de desarrollo

Durante toda la vida del proyecto deberá respetarse el siguiente principio.

La inteligencia de RubeRemember no reside en sus pantallas.

No reside en su base de datos.

No reside en sus notificaciones.

Reside exclusivamente en el **Cognitive Engine**.

Todo el resto de módulos existen para proporcionarle información o representar sus decisiones.

Mientras esa arquitectura se mantenga, el proyecto podrá evolucionar durante años sin necesidad de ser rediseñado.

---

# Conclusión

Este documento constituye la guía de implementación oficial de la evolución de RubeRemember.

Junto con el documento **RubeRemember - Cognitive Architecture Specification**, define tanto el comportamiento como la implementación del nuevo sistema de decisión.

A partir de este punto, cualquier desarrollo deberá apoyarse en ambos documentos:

- **Cognitive Architecture Specification** define **qué hace el sistema y por qué**.
- **Implementation Guide** define **cómo construirlo**.

Con ambos documentos como referencia, el desarrollo puede abordarse de forma modular, incremental y mantenible, reduciendo al mínimo las decisiones improvisadas durante la implementación y asegurando que toda la aplicación evolucione siguiendo una única arquitectura coherente.

---