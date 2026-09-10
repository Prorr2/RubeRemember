# Plan — Orden editable en "⚡ TRABAJANDO EN ESTE MOMENTO" (Móvil + Web)

> Estado: **EJECUTADO por opencode (botones ▲/▼ en lugar de drag & drop, según decisión del usuario)**.
> Locks tomados: `src/app/tasks.tsx`, `rube-remember-web/src/components/Tasks/TasksView.tsx`,
> `rube-remember-web/src/App.tsx`, `rube-remember-web/src/index.css`. Verificación tsc web+móvil y build web OK.

---

## 1. Modelo de datos

Cada tarea activa (trabajando en este momento) llevará un **orden de preferencia**:

- Campo: `activeOrder?: number` en `Task`.
- **Semántica: número MÁS BAJO = más arriba** (primera de la sección).
- **Nuevas tareas activas reciben el orden MENOR** (min actual − 1). Así, al activar una tarea ésta salta al inicio de la sección.
- Tareas sin `activeOrder` (datos previos/importados): van al **final** (usar `updatedAt` desc como tiebreak).
- Propiedad exclusiva de la sección "Trabajando en este momento": NO afecta a ninguna otra ordenación.

### Ficheros de tipos
- Web: `rube-remember-web/src/types.ts` → añadir `activeOrder?: number;` a `interface Task`.
- Móvil: `src/models/Task.ts` → añadir `activeOrder?: number;`.

### Store — NO requieren cambios
`updateItem(id, { activeOrder })` ya existe en ambos stores:
- Web: `rube-remember-web/src/store.ts` (`updateItem`).
- Móvil: `src/hooks/use-remember-store.tsx` (`updateItem`).

---

## 2. Web Desktop

### 2.1 Asignación de orden al activar
`rube-remember-web/src/App.tsx` — `onToggleActive` (líneas ~720):
```tsx
onToggleActive={(id) => {
  const t = db.items.find(i => i.id === id) as Task | undefined;
  if (!t) return;
  if (!t.active) {
    // activando: nueva = min(activeOrder existentes) - 1
    const orders = (db.items as Task[])
      .filter(i => (i as Task).active && (i as Task).activeOrder !== undefined)
      .map(i => (i as Task).activeOrder as number);
    const min = orders.length > 0 ? Math.min(...orders) : 1;
    rememberStore.updateItem(id, { active: true, activeOrder: min - 1 });
  } else {
    rememberStore.updateItem(id, { active: false });
  }
}}
```

### 2.2 Ordenación de la sección activa
`TasksView.tsx` — `activeTasks` (líneas ~93):
```tsx
const activeTasks = useMemo(
  () =>
    tasks
      .filter(t => !t.completed && !t.archived && !t.trash && t.active && matchesSearch(t))
      .sort((a, b) =>
        (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      ),
  [tasks, searchQuery]
);
```

### 2.3 Botones ▲/▼ (web) — en lugar de drag & drop
- `TasksView.tsx`: prop `onReorderActiveTasks?: (orderedIds: string[]) => void` + handler `handleMoveActive(id, dir)`.
- En el rail izquierdo (`task-card-left-rail`), SOLO para tareas con `active`: dos botones `.task-active-arrow` (▲ y ▼) centrados en vertical (`.task-active-arrows` con `margin-top/bottom: auto`).
- Al pulsar: reordenar array actual de activas, y `onReorderActiveTasks(orderedIds)` → en `App.tsx` persiste rangos `0..n-1` con `rememberStore.updateItem(id, { activeOrder: index })`.
- Activación: `onToggleActive` en `App.tsx` asigna `activeOrder: min-1` al activar (nueva tarea arriba).

### 2.4 CSS (`index.css`)
- `.task-card.dragging` (borde violeta/glow al arrastrar, `opacity: 0.5`).
- `.task-card.drop-target` (borde resaltado).
- Cursor `grab` / `grabbing` en las tarjetas activas (indicador `⠿` opcional a la derecha).

---

## 3. App Móvil

### 3.1 Asignación de orden al activar
`src/app/tasks.tsx` — `handleToggleActive` (líneas ~1185):
```tsx
const handleToggleActive = async (task: Task) => {
  if (!task.active) {
    const activeList = (store.items as Task[]).filter(i => i.type === ItemType.TASK && i.active);
    const orders = activeList
      .filter(t => t.activeOrder !== undefined)
      .map(t => t.activeOrder as number);
    const min = orders.length > 0 ? Math.min(...orders) : 1;
    await store.updateItem(task.id, { active: true, activeOrder: min - 1 });
  } else {
    await store.updateItem(task.id, { active: false });
  }
};
```

### 3.2 Ordenación de la sección activa
`tasks.tsx` — `activeTasks` (líneas ~837): añadir el mismo `.sort(...)` que en web.

### 3.3 Botones ▲/▼ (móvil) — en lugar de drag & drop
- `src/app/tasks.tsx`: `handleToggleActive` asigna `activeOrder: min-1` al activar.
- `handleMoveActive(id, dir)`: reordena `activeTasks` y persiste rangos `0..n-1` con `store.updateItem`.
- En el `leftRail` de la tarjeta, SOLO con `latestItem.active` y centrado en vertical (`marginTop/Bottom: 'auto'`): dos `Pressable` `activeArrowBtn` con `Ionicons chevron-up/chevron-down` (verde #34C759 igual que web).

---

## 4. Verificación

1. `cd rube-remember-web && npx tsc --noEmit` → 0 errores.
2. `cd rube-remember-web && npm run build` → bundle OK.
3. Móvil: `npx tsc --noEmit` en la raíz → 0 errores.
4. Manual web: activar 3 tareas → quedan ordenadas nuevas-arriba; botón ▼/▲ mueve una posición; persiste orden tras recargar; desactivar/reactivar → nueva arriba.
5. Manual móvil: mismo flujo con las flechas del rail izquierdo.
6. Las demás ordenaciones (lista pendientes, filtrar por objetivo, score) NO deben cambiar.

> **Observado en ejecución:** ambas verificaciones tsc (web y móvil) y el build web pasan con 0 errores.

---

## 5. Coordinación

- Tomar LOCK en `ACTIVE_FILES.md` sobre: `src/app/tasks.tsx`, `rube-remember-web/src/components/Tasks/TasksView.tsx`, `rube-remember-web/src/App.tsx`, `rube-remember-web/src/index.css` (+ opcional `package.json` si se opta por Opción A del móvil).
- NO se necesita `src/app/editor.tsx`.