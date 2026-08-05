# RubeRemember v2
# Implementation Guide

Versión: 2.0

Este documento describe el proceso completo para implementar la versión 2 de RubeRemember.

No define la filosofía del producto. Esa información se encuentra en `RubeRemember_v2_Specification.md`.

Este documento únicamente explica cómo llevar esa especificación al código.

---

# Objetivo

La implementación debe cumplir los siguientes objetivos:

- Mantener compatibilidad con la aplicación actual.
- Evitar reescrituras innecesarias.
- Realizar cambios incrementales.
- Mantener una versión funcional al finalizar cada fase.
- Minimizar el riesgo de regresiones.

Nunca deben desarrollarse varias fases simultáneamente.

Cada fase deberá finalizar completamente antes de comenzar la siguiente.

---

# Orden de implementación

La implementación seguirá exactamente este orden.

1. Modelos.
2. Persistencia.
3. RememberStore.
4. Migraciones.
5. Home.
6. Creación y edición.
7. Recordatorios.
8. Tareas.
9. Actividades.
10. Algoritmo de sugerencias.
11. Optimización.
12. Limpieza.
13. QA.

Este orden minimiza la cantidad de código que deberá modificarse dos veces.

---

# FASE 1
# Refactorización del modelo

## Objetivo

Eliminar la dependencia conceptual del modelo `Reminder`.

Toda la aplicación debe empezar a trabajar con `Item`.

Todavía no se modificará ninguna pantalla.

---

## Archivos

Crear.

```
src/models/

BaseItem.ts

Task.ts

Reminder.ts

Activity.ts

ItemType.ts
```

---

Modificar.

```
Reminder.ts
```

Únicamente para mantener compatibilidad temporal.

No eliminar todavía.

---

## Resultado esperado

El proyecto debe seguir compilando.

Aunque todavía ninguna pantalla utilice los nuevos modelos.

---

# Checklist

☐ BaseItem creado.

☐ Task creado.

☐ Reminder creado.

☐ Activity creada.

☐ ItemType creado.

☐ Sin errores de TypeScript.

☐ Sin cambios visibles para el usuario.

---

# FASE 2
# Persistencia

## Objetivo

Preparar el almacenamiento para soportar el nuevo modelo.

---

## Archivo

```
RememberStore.ts
```

o el módulo responsable de AsyncStorage.

---

## Cambios

Añadir.

```
databaseVersion
```

Crear.

```
MigrationEngine
```

Crear.

```
DatabaseSchema
```

No modificar todavía la lógica de negocio.

Únicamente preparar la infraestructura.

---

## Checklist

☐ Base de datos versionada.

☐ Migraciones registradas.

☐ Compatibilidad con datos actuales.

☐ Exportación sigue funcionando.

☐ Importación sigue funcionando.

---

# FASE 3
# RememberStore

Esta es la fase más delicada del proyecto.

No continuar hasta completar todas las pruebas.

---

## Objetivo

Toda la aplicación debe dejar de pensar en Reminder.

Debe pensar en Item.

---

## Cambios

Actualmente.

```
Reminder[]
```

↓

Nuevo modelo.

```
Item[]
```

---

## Añadir selectores

Nunca volver a utilizar.

```typescript
items.filter(...)
```

desde una pantalla.

Crear.

```
getTasks()

getActivities()

getTodayReminders()

getSuggestedActivities()

getArchivedItems()

...
```

---

## CRUD

Crear.

```
createTask()

createReminder()

createActivity()
```

Modificar.

```
updateItem()
```

Añadir.

```
convertItem()
```

Añadir.

```
archiveItem()
```

Añadir.

```
restoreItem()
```

---

## Resultado esperado

La aplicación sigue funcionando exactamente igual que antes.

La diferencia es que ahora utiliza la nueva arquitectura.

El usuario todavía no debe percibir cambios importantes.

---

# Checklist

☐ Store refactorizado.

☐ Selectores funcionando.

☐ CRUD funcionando.

☐ Persistencia funcionando.

☐ Migración automática correcta.

☐ Sin pérdida de datos.

---

# Regla importante

A partir de esta fase queda prohibido acceder directamente al array `items`.

Toda lectura deberá realizarse mediante selectores del Store.

Toda modificación deberá realizarse mediante acciones públicas del Store.

Esto garantiza que la lógica de negocio permanezca centralizada.

---

# FASE 4
# Migración automática

## Objetivo

Migrar todos los datos existentes sin intervención del usuario.

---

## Implementar

```
MigrationEngine
```

Responsabilidades.

- Detectar versión.
- Ejecutar migraciones pendientes.
- Validar datos.
- Guardar nueva versión.

---

## Reglas

- Nunca eliminar información.
- Toda migración debe ser idempotente.
- Si falla una migración, restaurar el backup previo.

---

## Checklist

☐ Migración desde v1.

☐ Sin pérdida de datos.

☐ Backup automático.

☐ Actualización de versión.

---

# FASE 5
# Nueva Home

## Objetivo

Sustituir la lista principal por un Centro de Decisiones.

---

## Archivo

```
HomeScreen.tsx
```

---

## Eliminar

- Lista cronológica.
- Scroll infinito.
- Mezcla de tipos.

---

## Crear

Tarjetas.

- Recordatorios.
- Tareas.
- Actividades.
- Objetivos.
- "No sé qué hacer".
- Crear.

---

## Validaciones

La Home nunca debe listar todos los Items.

Debe abrir las pantallas especializadas.

---

## Checklist

☐ Sin lista infinita.

☐ Navegación correcta.

☐ Render <150 ms.

---

# FASE 6
# Crear y editar Items

## Objetivo

Unificar todos los formularios.

---

## Crear

```
ItemEditor
```

---

## Flujo

```
Elegir tipo

↓

Formulario

↓

Guardar
```

---

## Reglas

Cada tipo solo muestra los campos necesarios.

No reutilizar campos irrelevantes.

---

## Checklist

☐ Crear Task.

☐ Crear Reminder.

☐ Crear Activity.

☐ Editar cualquiera.

---

# FASE 7
# Recordatorios

## Objetivo

Separar completamente los recordatorios del trabajo.

---

## Crear

```
ReminderScreen
```

---

## Funciones

- Hoy.
- Mañana.
- Semana.
- Futuro.
- Archivados.

---

## Acciones

- Editar.
- Archivar.
- Restaurar.
- Eliminar.

---

## Notificaciones

Crear.

```
NotificationService
```

Responsabilidades.

- Programar.
- Cancelar.
- Reprogramar.
- Gestionar repetición.

---

## Checklist

☐ Notificaciones correctas.

☐ Swipe actions.

☐ Archivado.

☐ Repetición.

---

# FASE 8
# Tareas

## Objetivo

Refactorizar la pantalla existente.

No crear una nueva.

---

## Mantener

- Goals.
- Phases.
- TimeSlots.
- Comentarios.

---

## Añadir

- Archivado.
- Conversión.
- Papelera.

---

## Revisar

Eliminar cualquier lógica relacionada con Activities.

---

## Checklist

☐ Objetivos compatibles.

☐ Conversión funcionando.

☐ Sin regresiones.

---

# FASE 9
# Actividades

## Objetivo

Crear un módulo independiente.

---

## Crear

```
ActivityScreen

ActivityCard

ActivityCategory

SuggestionCard
```

---

## Funciones

- Categorías.
- Favoritos.
- Historial.
- Sorpréndeme.

---

## Nunca mostrar

- Prioridad.
- Completado.
- Fecha límite.

---

## Checklist

☐ Categorías.

☐ Historial.

☐ Favoritos.

☐ Sugerencias.

---

# FASE 10
# Activity Engine

## Archivo

```
ActivityEngine.ts
```

---

## Responsabilidades

- Calcular puntuaciones.
- Evitar repeticiones.
- Ordenar sugerencias.
- Filtrar archivadas.

---

## Entrada

```
Activities

Historial

Fecha

Hora
```

---

## Salida

```
Activity[]
```

Ordenadas por relevancia.

---

## El motor nunca

- Modifica datos.
- Guarda información.
- Accede a la UI.

Solo calcula.

---

## Checklist

☐ Determinista.

☐ Fácil de testear.

☐ Sin dependencias de React.

---

# FASE 11
# Papelera

## Crear

```
TrashScreen
```

---

## Funciones

- Restaurar.
- Vaciar.
- Eliminar definitivamente.

---

## Reglas

Los Items permanecen 30 días.

Configuración futura permitirá modificar este periodo.

---

## Checklist

☐ Restauración.

☐ Eliminación.

☐ Limpieza automática.

---

# FASE 12
# Búsqueda

## Objetivo

Crear un único buscador para toda la aplicación.

---

## Buscar por

- Título.
- Descripción.
- Etiquetas.

---

## Filtrar por

- Tipo.
- Archivado.
- Favoritos.

---

## Nunca

Duplicar lógica de búsqueda en distintas pantallas.

---

# FASE 13
# Optimización

## Revisar

- React.memo
- useMemo
- useCallback
- FlatList
- Selectores

---

## Eliminar

- Renderizados innecesarios.
- Estado duplicado.
- Código muerto.

---

## Objetivo

Mantener una experiencia fluida con más de 10.000 Items.

---

# FASE 14
# Testing

## Validar

Modelo.

Store.

Persistencia.

Migraciones.

Pantallas.

Conversión.

Notificaciones.

Papelera.

---

## Casos críticos

- Actualizar desde v1.
- Backup.
- Restaurar.
- Convertir tipos.
- Cambiar Goals.
- Eliminar Phases.
- Sin conexión.

---

# FASE 15
# Limpieza final

Eliminar.

- Código antiguo.
- Componentes sin uso.
- Selectores obsoletos.
- Imports innecesarios.
- Comentarios desactualizados.

---

## Verificar

- Sin warnings.
- Sin TODO pendientes.
- Sin código comentado.
- Sin archivos huérfanos.

---

# Checklist final

## Arquitectura

☐ Nuevo modelo implementado.

☐ Migraciones completas.

☐ Store refactorizado.

☐ Persistencia estable.

---

## UI

☐ Nueva Home.

☐ Recordatorios.

☐ Tareas.

☐ Actividades.

☐ Papelera.

☐ Editor unificado.

---

## Motores

☐ Activity Engine.

☐ Notification Service.

☐ Migration Engine.

---

## Calidad

☐ Sin regresiones.

☐ Rendimiento correcto.

☐ Tests superados.

☐ Especificación respetada.

---

# Criterio de finalización

La implementación se considerará terminada únicamente cuando:

- Toda la especificación funcional esté implementada.
- No existan funcionalidades de la versión anterior rotas.
- La aplicación reduzca la carga mental del usuario respecto a la versión anterior.
- El código sea consistente, reutilizable y fácilmente extensible.
- La documentación continúe siendo la fuente de verdad del proyecto.

A partir de este punto, cualquier nueva funcionalidad deberá desarrollarse siguiendo este mismo proceso: especificación primero, implementación después.

---

# FASE 16
# Componentes reutilizables

## Objetivo

Reducir la duplicidad de código.

Todo componente reutilizable deberá crearse una única vez.

---

## Componentes

```
ItemCard

TaskCard

ReminderCard

ActivityCard

SectionHeader

SearchBar

FilterBar

FloatingButton

EmptyState

LoadingView

ConfirmationDialog

BottomSheet

TagChip
```

---

## Reglas

- Un componente = una responsabilidad.
- Sin lógica de negocio.
- Toda la información llega mediante props.

---

# FASE 17
# Navegación

## Objetivo

Simplificar la navegación.

Nunca más de tres niveles de profundidad.

---

## Flujo

```
Home

↓

Listado

↓

Detalle

↓

Editar
```

Nunca crear pantallas intermedias innecesarias.

---

## Reglas

Cada pantalla debe poder abrirse mediante Deep Link.

Toda pantalla debe soportar volver atrás correctamente.

---

# FASE 18
# Sistema de filtros

## Objetivo

Todos los listados utilizan el mismo sistema.

---

## Filtros disponibles

- Favoritos
- Archivados
- Etiquetas
- Categorías
- Fecha
- Orden

---

## Reglas

Guardar automáticamente el último filtro utilizado.

No reiniciarlo al cerrar la aplicación.

---

# FASE 19
# Ordenación

## Orden por defecto

### Tasks

1. Prioridad
2. Fecha
3. Creación

---

### Reminders

1. Fecha
2. Hora
3. Creación

---

### Activities

1. Score del Activity Engine
2. Favoritos
3. Última realización

Nunca ordenar Activities por prioridad.

---

# FASE 20
# Notificaciones

## Objetivo

Crear un servicio independiente.

---

## NotificationService

Responsabilidades.

- Crear.
- Cancelar.
- Actualizar.
- Repetir.
- Comprobar permisos.

---

## Nunca

Programar notificaciones desde la UI.

Toda la lógica pertenece al servicio.

---

## Casos

Editar fecha.

↓

Reprogramar.

Eliminar Reminder.

↓

Cancelar notificación.

Duplicar Reminder.

↓

Nueva notificación.

---

# FASE 21
# Backup

## Objetivo

Garantizar que el usuario nunca pierda información.

---

## Exportación

Debe incluir.

- Items.
- Goals.
- Lists.
- Settings.
- Historial.
- Version.

---

## Importación

Validar.

- Versión.
- Integridad.
- IDs duplicados.
- Datos corruptos.

---

## Si falla

Cancelar importación.

Nunca mezclar datos parcialmente importados.

---

# FASE 22
# Logs

## Crear

```
Logger.ts
```

---

## Registrar

- Errores.
- Migraciones.
- Conversión.
- Importaciones.
- Exportaciones.

---

## No registrar

Información privada.

Contenido de notas.

Datos personales.

---

# FASE 23
# Configuración

## Organizar

```
General

Notificaciones

Actividades

Tareas

Apariencia

Datos
```

---

## Mantener separada

La configuración nunca debe mezclarse con RememberStore.

Crear.

```
SettingsStore
```

---

# FASE 24
# Accesibilidad

Validar.

- Tamaños mínimos.
- Screen Reader.
- Contraste.
- Navegación por teclado.
- Etiquetas.

---

Nunca depender únicamente del color.

---

# FASE 25
# Rendimiento

## Revisar

Cada pantalla.

Responder.

¿Hay renders innecesarios?

¿Hay cálculos repetidos?

¿Hay filtros ejecutándose cada render?

---

Mover toda lógica costosa al Store o a Engines.

---

# FASE 26
# Refactor final

Eliminar.

- Componentes duplicados.
- Helpers sin uso.
- Hooks innecesarios.
- Estados duplicados.
- Código muerto.

---

## Revisar

Todos los nombres.

Mantener consistencia.

Nunca mezclar.

ReminderItem

ReminderModel

ReminderData

Elegir una única nomenclatura.

---

# FASE 27
# Validación manual

Antes de considerar terminada la implementación comprobar.

## Recordatorios

☐ Crear

☐ Editar

☐ Repetición

☐ Notificación

☐ Archivar

☐ Papelera

☐ Restaurar

---

## Tareas

☐ Crear

☐ Completar

☐ Objetivos

☐ Conversión

☐ Comentarios

☐ Archivado

---

## Actividades

☐ Crear

☐ Realizar

☐ Historial

☐ Favoritos

☐ Categorías

☐ Sugerencias

---

## Sistema

☐ Backup

☐ Restauración

☐ Migración

☐ Rendimiento

☐ Offline

☐ Búsqueda

---

# FASE 28
# Revisión de arquitectura

Antes de fusionar la rama principal responder.

¿Existe lógica duplicada?

↓

Eliminar.

---

¿Hay componentes demasiado grandes?

↓

Dividir.

---

¿La lógica pertenece al Store?

↓

Mover.

---

¿El componente solo pinta información?

↓

Correcto.

---

¿La implementación respeta la Specification?

↓

Continuar.

↓

No.

↓

Revisar antes de hacer merge.

---

# Reglas para Antigravity

Durante toda la implementación seguir estas prioridades.

## Prioridad 1

No romper funcionalidades existentes.

---

## Prioridad 2

No romper la filosofía del producto.

---

## Prioridad 3

Reutilizar antes que crear.

---

## Prioridad 4

Mantener el código simple.

---

## Prioridad 5

Documentar cualquier decisión arquitectónica nueva.

---

# Definición de éxito

La implementación será un éxito si:

- El usuario necesita pensar menos que en la versión anterior.
- La Home ayuda a decidir en lugar de listar.
- Recordatorios, Tareas y Actividades son conceptos claramente diferenciados.
- El código resulta fácil de ampliar sin grandes refactorizaciones.
- La aplicación mantiene una experiencia fluida incluso con grandes volúmenes de información.

---

# Nota final para Antigravity

Este documento describe **cómo implementar** RubeRemember v2.

Si durante el desarrollo surge una decisión que no aparece aquí, consultar primero `RubeRemember_v2_Specification.md`.

La Specification siempre prevalece sobre este documento.

Este documento indica el camino de implementación.

La Specification define el producto.

Nunca modificar uno sin revisar el otro.

---

# Fin de la guía de implementación

# ANEXO B
# Instrucciones para Antigravity

Este documento no forma parte de la especificación funcional.

Su único objetivo es definir la forma correcta de colaborar durante el desarrollo de RubeRemember v2.

Estas normas tienen prioridad durante toda la implementación.

---

# Rol de Antigravity

Antigravity actúa como ingeniero de software.

No como Product Owner.

No como diseñador UX.

No como arquitecto del producto.

Las decisiones de producto ya están definidas en la Specification.

Su responsabilidad consiste en implementarlas de la forma más limpia posible.

---

# Antes de escribir código

Antes de comenzar cualquier tarea responder internamente.

1.

¿Qué problema resuelve este cambio?

2.

¿Qué capítulo de la Specification lo define?

3.

¿Qué archivos se modificarán?

4.

¿Qué funcionalidades podrían verse afectadas?

5.

¿Cómo comprobaré que no he roto nada?

Si alguna respuesta no está clara, detener la implementación.

---

# Durante la implementación

Nunca modificar varias partes críticas simultáneamente.

Siempre seguir este orden.

```
Entender

↓

Diseñar

↓

Implementar

↓

Probar

↓

Refactorizar

↓

Commit
```

Nunca escribir código sin comprender primero el comportamiento esperado.

---

# Gestión de cambios

Cada Pull Request deberá resolver un único objetivo.

Incorrecto.

```
Refactor Store

+

Nueva Home

+

Nuevo algoritmo

+

Optimización
```

Correcto.

```
Refactor Store
```

o

```
Nueva Home
```

Cambios pequeños.

Fáciles de revisar.

Fáciles de revertir.

---

# Commits

Todos los commits deberán seguir un formato consistente.

Ejemplos.

```
feat(store): migrate to Item model

fix(reminders): preserve notifications after edit

refactor(home): replace dashboard with decision center

test(activity): add suggestion engine tests

docs(spec): update architecture
```

Nunca utilizar.

```
changes

update

fix

test

...
```

Como mensaje único.

---

# Gestión del código

Siempre priorizar.

Legibilidad.

↓

Mantenibilidad.

↓

Rendimiento.

Nunca al revés.

---

Si existen dos soluciones equivalentes.

Elegir siempre la más sencilla.

---

# Componentes

Antes de crear un componente nuevo comprobar.

¿Ya existe uno similar?

↓

Sí.

↓

Reutilizar.

↓

No.

↓

Crear.

Nunca duplicar componentes únicamente por diferencias visuales pequeñas.

---

# Estado

No almacenar estado derivado.

Ejemplo.

Incorrecto.

```typescript
const completedTasks = useState(...)
```

Correcto.

```typescript
const completedTasks = getCompletedTasks()
```

mediante selector.

---

# Store

Toda lógica pertenece al Store o a los Engines.

Nunca al componente.

Los componentes únicamente muestran información y lanzan acciones.

---

# Engines

Los Engines nunca deben conocer React.

Nunca accederán a Hooks.

Nunca accederán a componentes.

Nunca accederán a navegación.

Reciben datos.

Devuelven resultados.

Nada más.

---

# Refactorización

Si durante una fase aparece código claramente mejorable.

Preguntar.

¿Es necesario modificarlo para completar esta fase?

↓

No.

↓

No tocarlo.

Evitar refactorizaciones oportunistas.

---

# Gestión de deuda técnica

Registrar.

No solucionar inmediatamente.

La deuda técnica deberá agruparse en una fase específica.

Nunca mezclarla con nuevas funcionalidades.

---

# Manejo de errores

Toda operación susceptible de fallar deberá devolver un resultado controlado.

Nunca permitir errores silenciosos.

Toda excepción deberá registrarse.

Siempre que sea posible, ofrecer recuperación.

---

# Rendimiento

No optimizar prematuramente.

Primero.

Código correcto.

Después.

Código limpio.

Finalmente.

Optimización.

---

# Testing

Cada funcionalidad nueva deberá probarse antes de continuar.

Nunca acumular decenas de cambios sin validación.

---

# Si aparece una duda

No improvisar.

Buscar primero.

1.

Specification.

2.

Implementation Guide.

3.

Código existente.

Si continúa sin respuesta.

Documentar la duda.

No inventar comportamiento.

---

# Si detectas un problema en la Specification

No modificar directamente la implementación.

Primero documentar.

```
Problema detectado

↓

Alternativas

↓

Consecuencias

↓

Propuesta
```

La Specification siempre debe actualizarse antes que el código.

---

# Qué NO hacer

Nunca cambiar nombres importantes.

Nunca cambiar la arquitectura.

Nunca introducir nuevas entidades.

Nunca mover responsabilidades entre módulos sin justificarlo.

Nunca crear soluciones específicas para un único caso.

Nunca romper compatibilidad si existe una alternativa razonable.

Nunca sacrificar simplicidad por "elegancia".

---

# Criterio para aceptar una solución

Toda implementación debe responder afirmativamente.

□ ¿Cumple la Specification?

□ ¿Es fácil de entender?

□ ¿Es fácil de mantener?

□ ¿Evita duplicidad?

□ ¿Mantiene compatibilidad?

□ ¿Es consistente con el resto del proyecto?

Si alguna respuesta es "No", revisar antes de continuar.

---

# Filosofía de desarrollo

RubeRemember no busca ser la aplicación con más funciones.

Busca ser la aplicación más fácil de utilizar.

Cada línea de código deberá contribuir a ese objetivo.

Toda complejidad innecesaria deberá eliminarse.

Toda duplicidad deberá reducirse.

Toda decisión deberá favorecer al usuario final.

---

# Objetivo final

Cuando la implementación termine, el usuario no debería percibir una aplicación más compleja.

Debería sentir exactamente lo contrario.

Menos decisiones.

Menos estrés.

Más claridad.

Más confianza.

Si la implementación consigue eso, entonces la migración a RubeRemember v2 habrá sido un éxito.

---

# Fin del Anexo