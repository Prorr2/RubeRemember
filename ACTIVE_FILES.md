# Coordinación — Archivos en Uso

> **Regla estricta:** Antes de editar cualquier archivo, regístralo aquí en la sección **"🔴 Archivos en uso activo"**.
> Si un archivo está listado ahí por el otro agente, **NO lo toques** hasta que desaparezca de la lista.
> Al terminar de editar y verificar el archivo, **bórralo inmediatamente** para liberarlo.

---

## 🔴 Archivos en uso activo (LOCKS)

| Agente | Archivo(s) en edición en este momento |
|---|---|
| **opencode** | `src/app/tasks.tsx`, `rube-remember-web/src/components/Tasks/TasksView.tsx`, `rube-remember-web/src/App.tsx`, `rube-remember-web/src/index.css` (subtareas colapsables + orden "Trabajando en este momento") |
| **antigravity** | *(parado según usuario)* |

---

## ⚠️ Precauciones importantes

- **`App.tsx` es un archivo COMPARTIDO.** Ahora mismo está en LOCK por opencode (orden de tareas activas), debe registrarse aquí mientras se edite.
- No quedan vistas inline de tab en App.tsx: Tasks, Reminders, Memos, Plans, Statistics, Help y Lists ya son componentes.

---

## 🔄 Fase 1b — COMPLETADA por opencode

Vistas inline de App.tsx extraídas a componentes (consumen `useRememberStore()` directamente):

- [x] `components/Tasks/TasksView.tsx` (lista + filtros + estante de planificación)
- [x] `components/Reminders/RemindersView.tsx`
- [x] `components/Lists/ListsView.tsx` (listas, sublistas e ítems con imágenes)
- [x] `components/Memos/MemosView.tsx`
- [x] `components/Plans/PlansView.tsx`
- [x] `components/Statistics/StatisticsView.tsx` + `DonutChart.tsx`
- [x] `components/Help/HelpView.tsx`

`App.tsx`: 3088 → 1771 líneas. `npx tsc --noEmit` y `npm run build` OK.

Pendiente (opcional): `components/Editor/UniversalEditor.tsx` (los modales de editor/roadmap/slot siguen en App.tsx).

---

## Estado del Proyecto y Fases Completadas

### ✅ Fase 0 COMPLETADA (opencode + antigravity)
- `rube-remember-web/src/types.ts` — Sincronizado totalmente con `src/models/` del mobile.

### ✅ Fase 1a COMPLETADA (opencode) — Layout + Dashboard
- Creados: `Sidebar.tsx`, `HeaderBar.tsx`, `RecommendationCard.tsx`, `MiniStats.tsx`, `TimeSlotsPanel.tsx`, `ReminderAlerts.tsx`, `DashboardView.tsx`.

### ✅ Fase 1b COMPLETADA (opencode) — Vistas de tabs restantes
- Tasks, Reminders, Memos, Plans, Statistics (+DonutChart), Help y Lists extraídos de `App.tsx`.

### ✅ Fases 2, 3, 4, 5, 6, 7 COMPLETADAS (antigravity)
- **Fase 2 (Store & CRUD):**
  - `rube-remember-web/src/store.ts` con todos los métodos CRUD de items, categorías, hourWeights, settings, backup y sync.
  - `rube-remember-web/src/services/ImageStore.ts` con IndexedDB para almacenamiento de imágenes grandes.
- **Fase 3 & 6 (Vistas UI Desktop):**
  - `rube-remember-web/src/components/Trash/TrashView.tsx` (papelera dedicada).
  - `rube-remember-web/src/components/Goals/GoalsView.tsx` (metas y fases).
  - `rube-remember-web/src/components/Settings/SettingsView.tsx` (todos los ajustes).
  - `rube-remember-web/src/components/Activities/ActivitiesView.tsx` (todas las actividades y sugerencias inteligentes con `ActivityEngine`).
  - `rube-remember-web/src/components/Layout/SearchOverlay.tsx` (búsqueda universal con filtros y acciones directas: Enfocar, Roadmap, Editar, Hecho).
- **Fase 4 (Dropbox Sync):**
  - `rube-remember-web/src/services/DropboxService.ts` (OAuth2 PKCE, snapshots emparejados texto + IndexedDB).
  - `rube-remember-web/src/components/Dropbox/DropboxView.tsx` (UI de conexión y sync).
- **Fase 5 (Merge Inteligente):**
  - `rube-remember-web/src/services/MergeEngine.ts` (resolución de conflictos por `updatedAt`, anti-truncamiento, Zero-Task Safety, anti-resurrección de trash y validación post-merge).
  - `rube-remember-web/server.ts` con endpoints `/api/merge` y `/api/merge/status`.
  - `rube-remember-web/src/components/Sync/SyncPanel.tsx` (panel Wi-Fi local).
- **Fase 7 (Tests y Build):**
  - Suite de pruebas `src/services/MergeEngine.test.ts` (14/14 tests pasando al 100%).
  - `npx tsc --noEmit` sin ningún error.
  - `npm run build` genera `dist/` limpiamente.

---

## Archivos LIBRES para siguiente fase

Cualquiera de los siguientes archivos/componentes puede ser tomado por el agente que inicie turno:
- `rube-remember-web/src/components/Editor/UniversalEditor.tsx` (extraer el editor + roadmap + slot modals de App.tsx)