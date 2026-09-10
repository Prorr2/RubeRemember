# Work Breakdown — RubeRemember Web Desktop Companion

> **Objetivo:** Convertir la web (`rube-remember-web/`) en una versión desktop de la app móvil,
> con los mismos datos, la misma funcionalidad y sync inteligente (merge, no overwrite).

---

## Coordinación entre Agentes

### ¿Quién hace qué?

| Agente | Fases asignadas | Archivos que TOCA |
|--------|----------------|-------------------|
| **opencode** | Fase 0 + Mitad de Fase 1 | `types.ts`, `App.tsx`, `components/Layout/*`, `components/Dashboard/*` |
| **antigravity** | Mitad de Fase 1 + Fases 2-7 | `store.ts`, `components/Tasks/*`, `components/Activities/*`, `components/Reminders/*`, `components/Lists/*`, `components/Memos/*`, `components/Plans/*`, `components/Goals/*`, `components/Statistics/*`, `components/Settings/*`, `components/Trash/*`, `components/Help/*`, `components/Sync/*`, `components/Dropbox/*`, `components/Editor/*`, `services/MergeEngine.ts`, `services/DropboxService.ts` |

### Reglas de coordinación

1. **NO editar el mismo archivo al mismo tiempo.** Si opencode está editando `types.ts`, antigravity NO lo toca.
2. **opencode va primero** en Fase 0 y la primera mitad de Fase 1. Antigravity **espera** a que opencode termine esas fases antes de empezar.
3. **Una vez opencode termine**, antigravity puede trabajar en paralelo en Fases 2-7 sin conflictos, ya que toca archivos diferentes.
4. **Si hay duda** sobre si un archivo ya fue modificado, **leerlo primero** antes de editarlo.
5. **Convenciones compartidas** (ambos agentes deben seguir):
   - Idioma: **español** en todo el UI y comentarios
   - CSS: usar clases existentes de `index.css` (`.glass-panel`, `.glass-card`, `.btn-primary`, etc.)
   - Estado: `useSyncExternalStore` + `localStorage`, NO Redux ni Zustand
   - Tipos: importar de `./types`
   - Store: importar de `./store` (`useRememberStore`, `rememberStore`)
   - Store global: los componentes consumen `useRememberStore()` directamente

### Flujo de ejecución

```
opencode                      antigravity
   │                              │
   ├─ Fase 0: types.ts            │  (esperando)
   ├─ Fase 1a: Layout + Dashboard │  (esperando)
   │     ✅ TERMINA               │
   │     ──── avisa ────────────► │
   │                              ├─ Fase 1b: Tasks, Activities, etc.
   │                              ├─ Fase 2: store.ts CRUD
   │                              ├─ Fase 3: UI faltante
   │                              ├─ Fase 4: Dropbox
   │                              ├─ Fase 5: Merge engine
   │                              ├─ Fase 6: Settings
   │                              └─ Fase 7: Testing
```

### Checkpoint de sincronización

## ✅ Checkpoint — opencode terminado

- [x] **Fase 0 completada** — types.ts sincronizado con mobile, store.ts actualizado, MergeEngine.ts corregido
- [x] **Fase 1a completada** — Componentes creados:
  - `components/Layout/Sidebar.tsx`
  - `components/Layout/HeaderBar.tsx` (props extendidas por antigravity: `onFocusTask`, `onOpenRoadmap`)
  - `components/Dashboard/RecommendationCard.tsx`
  - `components/Dashboard/MiniStats.tsx`
  - `components/Dashboard/TimeSlotsPanel.tsx`
  - `components/Dashboard/ReminderAlerts.tsx`
  - `components/Dashboard/DashboardView.tsx`
- **antigravity puede empezar Fase 1b + Fases 2-7**

## ✅ Checkpoint — Fase 1b COMPLETADA (opencode)

- [x] **Fase 1b completada** — Vistas inline de App.tsx extraídas a componentes que consumen `useRememberStore()`:
  - `components/Tasks/TasksView.tsx` (lista con filtros Activas/Completadas/Archivadas/Papelera + estante de planificación)
  - `components/Reminders/RemindersView.tsx` (anclados + próximos)
  - `components/Memos/MemosView.tsx`
  - `components/Plans/PlansView.tsx` (con filtro por año local)
  - `components/Statistics/StatisticsView.tsx` + `components/Statistics/DonutChart.tsx`
  - `components/Help/HelpView.tsx`
  - `components/Lists/ListsView.tsx` (listas, sublistas, ítems e imágenes; helper `imageUpload` local)
- Estado local y memos muertos eliminados de App.tsx (taskFilter, plansYearFilter, statsExpanded*, filteredTasks, shelfTasks, pinned/upcomingReminders, memos, plansYears, filteredPlans, donut calculators, sessionsGrouped, estados de listas).
- **App.tsx: 3088 → 1771 líneas.** `npx tsc --noEmit` sin errores y `npm run build` OK.

### ⚠️ Notas para antigravity (conocidas del día 1)

### ⚠️ Notas para antigravity (conocidas del día 1)

1. `components/Layout/SearchOverlay.tsx:2` — borrar import `Activity` sin usar (error TS6133)
2. En App.tsx, `db.userSettings.terraDuration` es el campo correcto (NO `sessionDurations`)
3. App.tsx es archivo compartido — verificar estado actual antes de editarlo
4. Considerar mover los siguientes hooks de App.tsx a customs hooks o context:
   - Estados del editor universal (`formTitle`, `formTaskPriority`, etc.)
   - Estados del timer (`timerRunning`, `timerSecondsRemaining`, etc.)
   - Estados de sync (`syncBusy`, `mobileConnected`, `handleRequestFromMobile`)

Cuando opencode termine su parte, actualizará este archivo marcando las fases completadas con `[x]` y añadiendo una nota al final:

```
## ✅ Checkpoint — opencode terminado
- Fase 0 completada
- Fase 1a completada (Layout + Dashboard components)
- antigravity puede empezar Fase 1b + Fases 2-7
```

### Cómo verificar que no hay conflictos

- Si antigravity necesita que `types.ts` tenga un campo específico, **pedirlo a opencode** antes de empezar la fase que lo necesita, o **añadirlo directamente** (ya que opencode no lo está tocando en ese momento).
- Cada agente debe hacer `git pull` antes de empezar su parte si hay posibilidad de que el otro haya commiteado.

---

## Estructura del Proyecto

| Componente | Ubicación | Stack |
|-----------|-----------|-------|
| App móvil | raíz del repo (`/`) | Expo, React Native, TypeScript |
| App web | `rube-remember-web/` | Vite 5.4, React 19, TypeScript |
| Store web | `rube-remember-web/src/store.ts` | `useSyncExternalStore` + `localStorage` |
| Tipos web | `rube-remember-web/src/types.ts` | TypeScript enums/interfaces |
| UI web | `rube-remember-web/src/App.tsx` | Monolítico 3538 líneas (a refactorizar) |
| Sync server | `rube-remember-web/server.ts` | Express middleware en Vite |

---

## Fase 0: Sincronizar Tipos TypeScript (30 min)

**Dependencias:** Ninguna
**Archivos a modificar:** `rube-remember-web/src/types.ts`
**Archivos de referencia:**
- `src/models/Task.ts`, `src/models/Activity.ts`, `src/models/Memo.ts`, `src/models/Plan.ts`
- `src/models/Reminder.ts`, `src/models/Goal.ts`, `src/models/Session.ts`
- `src/models/TimeSlot.ts`, `src/models/UserSettings.ts`, `src/models/Statistics.ts`
- `src/models/HourWeight.ts`, `src/models/Comment.ts`, `src/models/BaseItem.ts`
- `src/models/ItemType.ts`, `src/models/Recommendation.ts`

### Tarea 0.1: Comparar y reconciliar interfaces
- [ ] Leer TODOS los archivos en `src/models/` del mobile
- [ ] Comparar cada interfaz con la correspondiente en `rube-remember-web/src/types.ts`
- [ ] Añadir campos faltantes al web. Campos conocidos faltantes:
  - `Goal`: falta campo `isMain?: boolean`
  - `Task`: falta campo `active?: boolean` (diferente de `focusLocked`)
  - `Task`: falta campo `habitTime?: string`
  - `Recommendation`: verificar que `reasonsSecondary` existe
  - `UserSettings`: verificar todos los campos (sleepSchedule, workingHours, voiceKeywords, etc.)
- [ ] Añadir `taskCategories: CustomCategory[]` al tipo `DatabaseState` del web
- [ ] Verificar `DEFAULT_*` constants coincidan con los defaults del mobile

### Tarea 0.2: Sincronizar defaults
- [ ] Comparar `DEFAULT_USER_SETTINGS` del web con el del mobile
- [ ] Comparar `DEFAULT_HOUR_WEIGHTS`, `DEFAULT_ACTIVITY_CATEGORIES`, `DEFAULT_STATISTICS`, `DEFAULT_TIME_SLOTS`
- [ ] Actualizar valores si difieren

---

## Fase 1: Refactorizar App.tsx en Componentes (2-3 horas)

**Dependencias:** Fase 0 completada
**Archivos a crear:** Ver estructura abajo
**Archivos a modificar:** `rube-remember-web/src/App.tsx` (reducir a ~200 líneas)

### Estructura de componentes a crear:

```
rube-remember-web/src/
├── App.tsx                              # Shell layout + routing (~200 líneas)
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx                  # Navegación lateral + sync buttons
│   │   ├── HeaderBar.tsx                # Título, fecha, búsqueda, badge, Crear
│   │   └── SearchOverlay.tsx            # Dropdown de búsqueda universal
│   ├── Dashboard/
│   │   ├── RecommendationCard.tsx       # Tarjeta hero de recomendación
│   │   ├── MiniStats.tsx                # Stats compactos (streak, tareas, horas)
│   │   ├── TimeSlotsPanel.tsx           # Franjas horarias con tareas
│   │   └── ReminderAlerts.tsx           # Alertas de recordatorios
│   ├── Tasks/
│   │   ├── TaskList.tsx                 # Lista con filtros (active/completed/archived/trash)
│   │   ├── TaskCard.tsx                 # Tarjeta individual de tarea
│   │   ├── PlanningShelf.tsx            # Sidebar de tareas sin slot
│   │   ├── FocusTimer.tsx               # Timer SVG circular + controles
│   │   ├── RoadmapModal.tsx             # Timeline de sesiones por tarea
│   │   └── TaskOptionsModal.tsx         # Modal acciones tarea
│   ├── Activities/
│   │   └── ActivitiesView.tsx           # Grid actividades + suggestions tab
│   ├── Reminders/
│   │   └── RemindersView.tsx            # Pinned + Upcoming columns
│   ├── Lists/
│   │   └── ListsView.tsx                # Hierarchical lists/sublists
│   ├── Memos/
│   │   └── MemosView.tsx                # Grid de memos
│   ├── Plans/
│   │   └── PlansView.tsx                # Grid de planes con year filter
│   ├── Goals/
│   │   └── GoalsView.tsx                # Grid de metas con fases
│   ├── Statistics/
│   │   ├── DonutChart.tsx               # SVG donut reutilizable
│   │   └── StatisticsView.tsx           # Dashboard estadísticas
│   ├── Settings/
│   │   └── SettingsView.tsx             # Todos los ajustes
│   ├── Trash/
│   │   └── TrashView.tsx                # Papelera dedicada
│   ├── Help/
│   │   └── HelpView.tsx                 # Documentación
│   ├── Sync/
│   │   └── SyncPanel.tsx                # Estado de sync + botones
│   ├── Dropbox/
│   │   └── DropboxView.tsx              # Config Dropbox
│   └── Editor/
│       └── UniversalEditor.tsx           # Editor modal multi-tipo
```

### Tarea 1.1: Crear estructura de directorios
- [ ] Crear `rube-remember-web/src/components/` y subdirectorios

### Tarea 1.2: Extraer Layout components
- [ ] `Sidebar.tsx` — Extraer toda la sidebar JSX de App.tsx
- [ ] `HeaderBar.tsx` — Extraer header con búsqueda, badge, fecha
- [ ] `SearchOverlay.tsx` — Extraer dropdown de búsqueda

### Tarea 1.3: Extraer Dashboard components
- [ ] `RecommendationCard.tsx` — Tarjeta hero con recommendation
- [ ] `MiniStats.tsx` — Fila de stats (streak, tareas, horas)
- [ ] `TimeSlotsPanel.tsx` — Panel de slots con tareas asignadas
- [ ] `ReminderAlerts.tsx` — Alertas de recordatorios

### Tarea 1.4: Extraer Tasks components
- [ ] `TaskList.tsx` — Lista con filtros y task cards
- [ ] `TaskCard.tsx` — Tarjeta de tarea individual
- [ ] `PlanningShelf.tsx` — Sidebar de tareas sin slot
- [ ] `FocusTimer.tsx` — Timer modal con SVG ring
- [ ] `RoadmapModal.tsx` — Modal de roadmap/sesiones
- [ ] `TaskOptionsModal.tsx` — Modal de opciones de tarea

### Tarea 1.5: Extraer resto de vistas
- [ ] Cada vista de tab en su propio componente
- [ ] `UniversalEditor.tsx` — Extraer el editor modal completo
- [ ] `DonutChart.tsx` — Componente SVG reutilizable

### Tarea 1.6: Reducir App.tsx
- [ ] App.tsx debe quedar como shell: layout + routing + state compartido
- [ ] Pasar props necesarias a cada componente hijo
- [ ] Asegurar que el estado que comparten componentes (modals, etc.) se mantiene en App.tsx o se extrae a un context

---

## Fase 2: Completar Store con CRUD Faltante (1 hora)

**Dependencias:** Fase 0
**Archivos a modificar:** `rube-remember-web/src/store.ts`

### Tarea 2.1: Añadir funciones de item CRUD faltantes
- [x] `convertItem(id, newType)` — Cambiar tipo de item preservando campos compatibles
- [x] `updateItems(ids, updates)` — Actualización en lote
- [x] `toggleGoalMain(goalId)` — Marcar meta como principal
- [x] `deleteCompleted()` — Enviar todas las completadas a papelera
- [x] `restoreItem(id)` — Ya existe, verificar que funciona para todos los tipos

### Tarea 2.2: Añadir CRUD de categorías
- [x] `addActivityCategory(cat)`, `updateActivityCategory(id, data)`, `deleteActivityCategory(id)`
- [x] `addTaskCategory(cat)`, `updateTaskCategory(id, data)`, `deleteTaskCategory(id)`
- [x] `addHourWeight(hw)`, `updateHourWeight(id, data)`, `deleteHourWeight(id)`

### Tarea 2.3: Añadir funciones de configuración
- [x] `setProximityDays(n)` — Actualizar `settings.proximityDays`
- [x] `setSlotSeparationMinutes(n)` — Actualizar `settings.slotSeparationMinutes`

### Tarea 2.4: Añadir funciones de backup/export
- [x] `exportBackupData()` → `string` — Serializar DatabaseState a JSON
- [x] `exportBackupDataSplit()` → `{ text: string, images: Record<string, string> }` — Separar imágenes
- [x] Actualizar `importBackupData()` para aceptar bundle de imágenes

### Tarea 2.5: Añadir funciones de stats y recommendations
- [x] `updateStatistics(partial)` — Actualizar estadísticas parcialmente
- [x] `saveRecommendations(recs)` — Persistir recomendaciones generadas
- [x] `flushPendingSave()` — Aunque localStorage es síncrono, mantener para compatibilidad

---

## Fase 3: Completar Funcionalidades UI (2 horas)

**Dependencias:** Fases 1 + 2
**Archivos a crear/modificar:** Componentes en `rube-remember-web/src/components/`

### Tarea 3.1: Pantalla de Papelera dedicada [Media prioridad]
- [x] Crear `TrashView.tsx` con vista dedicada
- [x] Mostrar items con `trash: true`
- [x] Botones: restaurar, eliminar permanentemente, vaciar papelera
- [x] Añadir tab "Papelera" al Sidebar

### Tarea 3.2: Activity Suggestions Tab [Media prioridad]
- [x] En `ActivitiesView.tsx`, añadir pestaña "Sugerencias"
- [x] Implementar lógica de sugerencias similar al mobile (actividades no hechas recientemente)
- [x] Botón "Registrar hecho" en cada sugerencia

### Tarea 3.3: Búsqueda mejorada [Media prioridad]
- [x] En `SearchOverlay.tsx`, añadir badges de tipo por resultado
- [x] Añadir botones de acción por resultado: Enfocar, Editar, Ver Roadmap
- [x] Filtrar por tipo (tasks, activities, reminders, memos, plans)

### Tarea 3.4: Goals View completa [Media prioridad]
- [x] Crear `GoalsView.tsx` con CRUD de metas y fases
- [x] Date picker para start/end date de cada goal
- [x] Sub-vista de fases por goal (add/edit/delete/reorder)
- [x] Checkbox `isMain` para marcar meta principal
- [x] Asociar tareas a goals/fases desde el editor de tareas

### Tarea 3.5: Exportar Backup [Alta prioridad]
- [x] Añadir botón "Descargar Backup" en SyncPanel o en una nueva sección
- [x] Usar `exportBackupData()` del store
- [x] Trigger descarga como `.json` file via `URL.createObjectURL`

### Tarea 3.6: Importar con bundle de imágenes [Alta prioridad]
- [x] En el import actual, detectar si el JSON tiene imágenes embebidas
- [x] Si tiene, parsear y almacenar en la BD
- [x] Feedback de progreso durante importación

---

## Fase 4: Integrar Dropbox Sync en Web (2-3 horas)

**Dependencias:** Fase 5 (merge inteligente)
**Archivos a crear:**
- `rube-remember-web/src/services/DropboxService.ts`
- `rube-remember-web/src/components/Dropbox/DropboxView.tsx`

### Tarea 4.1: DropboxService web
- [x] Implementar OAuth2 PKCE flow (sin client secret, ya que es public client)
- [x] `getAuthUrl()` → URL de autorización Dropbox
- [x] `handleRedirectCallback()` → extraer access_token del callback
- [x] `uploadBackup(textJson, imagesJson)` → subir archivos a Dropbox
- [x] `downloadBackup()` → descargar y parsear backup
- [x] `listBackups()` → listar archivos de backup
- [x] `deleteOldBackups(keepCount)` → limpiar por storage budget
- [x] Auto-refresh token antes de expirar

### Tarea 4.2: Dropbox UI
- [x] OAuth connect/disconnect flow
- [x] Estado de conexión (token válido/inválido/desconectado)
- [x] Botón sync manual
- [x] Toggle auto-sync + intervalo configurable
- [x] Último sync timestamp
- [x] Storage usage display

### Tarea 4.3: Integración con merge
- [x] Al descargar de Dropbox, usar el merge intelligente (Fase 5)
- [x] Al subir, subir la BD merged
- [x] Cooldown configurable entre syncs

---

## Fase 5: Sistema de Sync Inteligente — MERGE, no Overwrite (2 horas)

**Dependencias:** Fase 2
**Archivos a crear/modify:**
- `rube-remember-web/src/services/MergeEngine.ts` (nuevo)
- `rube-remember-web/server.ts` (modificar endpoints)
- `rube-remember-web/src/store.ts` (añadir merge methods)

### Tarea 5.1: MergeEngine — Algoritmo de merge
- [x] Crear `MergeEngine.ts` con función `mergeDatabases(local, remote) → merged`
- [x] **Reglas de merge por item:**
  - Si item existe solo en remote → copiar a local
  - Si item existe solo en local → mantener
  - Si item existe en ambos → quedarse con el de mayor `updatedAt`
  - Si item fue eliminado (trash: true) en un lado → marcar trash en el otro (NUNCA hard delete)
- [x] **Reglas de merge por colección** (goals, lists, sessions, timeSlots, categories):
  - Merge por `id`: actualizar si remote `updatedAt` > local `updatedAt`
  - Añadir si id no existe localmente
  - No eliminar nunca
- [x] **Merge de `userSettings`:** quedarse con el más reciente completo
- [x] **Merge de `statistics`:** sumar contadores, quedarse con max streak
- [x] **Merge de `hourWeights` y `activityCategories`/`taskCategories`:** merge por id

### Tarea 5.2: Anti-truncamiento
- [x] **Validación pre-merge:** contar items, comentarios, sesiones
- [x] **Backup pre-merge:** guardar snapshot en localStorage antes de cada merge (`rube_v3_pre_merge_backup`)
- [x] **Validación post-merge:** verificar que no se perdió ningún item/comentario
- [x] **Rollback automático:** si falla validación post-merge, restaurar backup pre-merge
- [x] **Zero-task safety:** bloquear sync si alguna fuente tiene 0 tareas

### Tarea 5.3: Integración en server.ts
- [x] Nuevo endpoint `POST /api/merge` que recibe BD remota y devuelve merged
- [x] Modificar `POST /api/backup` para que haga merge en vez de overwrite
- [x] Añadir `GET /api/merge/status` para verificar estado del último merge

### Tarea 5.4: Integración en store
- [x] `mergeWithRemote(remoteDb)` — ejecutar merge y guardar resultado
- [x] `restorePreMergeBackup()` — rollback manual si algo falló
- [x] Integrar con sync buttons de la UI

---

## Fase 6: Settings Completos (1 hora)

**Dependencias:** Fases 1 + 2
**Archivos a modificar:** `rube-remember-web/src/components/Settings/SettingsView.tsx`

### Tarea 6.1: Secciones de settings existentes (verificar que funcionan)
- [x] Score formula editor con validación
- [x] Duraciones Luna/Terra/Sol/Astra
- [x] Energy preference ordering (drag & drop)
- [x] Botones Reset/Clear

### Tarea 6.2: Nuevas secciones de settings
- [x] **Categorías de Actividad:** CRUD inline (add/edit/delete con nombre)
- [x] **Categorías de Tarea:** CRUD inline
- [x] **Hour Weights / Bloques:** CRUD inline (id, name, minHours)
- [x] **Proximity Days:** number input
- [x] **Slot Separation Minutes:** number input
- [x] **Max Focus Tasks:** number input
- [x] **Default Cooldown:** number input (minutos)
- [x] **Sleep Schedule:** time range (start/end)
- [x] **Working Hours:** time range (start/end)
- [x] **Dropbox Config:** subsection dentro de Settings

### Tarea 6.3: Layout de Settings
- [x] Organizar en secciones colapsables o grid 2 columnas
- [x] Guardar automáticamente al cambiar (debounced)
- [x] Feedback visual de guardado (check verde temporal)

---

## Fase 7: Testing y Validación (1 hora)

**Dependencias:** Todas las fases anteriores

### Tarea 7.1: Build de producción
- [x] Ejecutar `npm run build` en `rube-remember-web/`
- [x] Verificar que no hay errores de TypeScript
- [x] Verificar que el `dist/` se genera correctamente

### Tarea 7.2: Sync local y Suite de Tests
- [x] Suite de tests automatizados de MergeEngine (`src/services/MergeEngine.test.ts`)
- [x] Verificado merge inteligente (item más reciente gana por `updatedAt`)
- [x] Verificado unión no destructiva de notas/comentarios
- [x] Verificada regla anti-resurrección (`trash: true` nunca se sobreescribe)
- [x] Verificado anti-truncamiento y Zero-Task Safety check
- [x] Verificada detección de pérdida de notas y validación post-merge
- [x] Servidor de desarrollo con middleware Vite (`/api/merge`, `/api/health`, `/api/backup`)

### Tarea 7.3: Dropbox sync
- [x] Arquitectura de snapshots emparejados (texto + imágenes IndexedDB)
- [x] Flujo OAuth2 PKCE completo
- [x] Guardián de integridad cloud con alerta ante pérdida de comentarios

### Tarea 7.4: Paridad de datos
- [x] Compatibilidad total con modelo DatabaseState V3 (Mobile/Desktop)
- [x] Soporte para tareas, recordatorios, actividades, memos, planes, metas, listas, slots y sesiones

### Tarea 7.5: CRUD completo
- [x] Implementadas operaciones CRUD para todas las entidades en `store.ts` y vistas UI
- [x] Persistencia en localStorage e IndexedDB para imágenes de alta resolución

---

## Notas para el Agente que Ejecute

### Convenciones
- **Idioma:** Todo el UI y los comentarios están en **español**
- **CSS:** Estilo dark glassmorphism. Usar clases CSS existentes en `index.css` (`.glass-panel`, `.glass-card`, `.btn-primary`, etc.)
- **Estado:** `useSyncExternalStore` con `localStorage`. NO usar Redux ni Zustand.
- **Tipos:** Siempre importar de `./types`
- **Store:** Siempre importar de `./store` (`useRememberStore`, `rememberStore`)
- **Propagación de estado:** El store es global via `useRememberStore()`. Los componentes lo consumen directamente.
- **Sonido:** Web Audio API para alarmas (ya implementado en App.tsx)
- **Imágenes:** Base64 data URLs almacenadas en el JSON de la BD

### Archivos de referencia clave (mobile)
- `src/hooks/use-remember-store.tsx` — Store principal con todos los métodos CRUD
- `src/services/migration-engine.ts` — Formato de BD V3
- `src/engines/*.ts` — Motores cognitivos (porteados a `engines.ts` en web)
- `src/app/*.tsx` — Todas las pantallas del mobile para referencia de UI

### Cómo verificar tu trabajo
1. `cd rube-remember-web && npx tsc --noEmit` — Verificar tipos
2. `cd rube-remember-web && npm run build` — Build de producción
3. `cd rube-remember-web && npm run dev` — Dev server en puerto 3001
4. Abrir `http://localhost:3001` y verificar funcionalidad visual
