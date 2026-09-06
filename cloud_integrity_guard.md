# 🛡️ Protección de Integridad de `Task.comments` (Guard Anticorrupción)

Documento técnico de la protección implementada para evitar que los **comentarios/notas de tareas** (`Task.comments`) se vacíen por completo en la base de datos local y/o se sobrescriba la copia en la nube de **RubeRemember** con una base de datos corrupta.

---

## 1. Problemática

Se detectó un escenario en el que, sin aviso, la base de datos perdía **todos los `Task.comments`** de todas las tareas (campo `comments: []`). Si ese estado corrupto llegaba a subirse al **sistema de respaldos en la nube** (Dropbox), la copia buena quedaba sobrescrita y toda la información se perdía.

La pérdida masiva de un campo dentro de un solo guardado no era detectada por mecanismos previos porque:

- `exportBackupData()` serializa `items` tal cual (los comments viajan intactos, pero también viajan intactos si están vacíos).
- La única protección existente en la nube era `zero_tasks` (cancelar subida con 0 tareas activas), que NO cubre el caso "las tareas existen pero perdieron sus comments".
- `saveDatabase()` persistía cualquier estado, incluido uno con comments vacíos.

---

## 2. Arquitectura de la Protección (Doble Capa)

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: Guard de Persistencia Local                        │
│  (MigrationEngine.saveDatabase)                             │
│                                                             │
│  Bloquea ESCRIBIR a AsyncStorage una BD donde el mismo      │
│  conjunto de tareas activas perdió sus comments.            │
└──────────────────────────────▲──────────────────────────────┘
                               │ solo datos corruptos
┌──────────────────────────────┴──────────────────────────────┐
│  CAPA 2: Guard de Subida a la Nube                          │
│  (DropboxService.performAutoSync)                           │
│                                                             │
│  Compara el recuento de comments local contra el ÚLTIMO      │
│  subido a la nube. Si hubo pérdida masiva, CANCELA la       │
│  subida (no sobrescribe la copia buena).                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Capa 1 — Guard de Persistencia Local

### Función: `MigrationEngine.persistDatabaseWithIntegrityGuard(db)`

`src/services/migration-engine.ts`

Cada vez que se intenta guardar la base de datos (`saveDatabase()`), antes de escribir a AsyncStorage se ejecuta la función:

1. Se cuentan las **tareas activas** (tipo `TASK`, no en papelera) y sus **comments totales** en la BD entrante.
2. Se lee el estado **previo ya persistido** en disco (AsyncStorage, clave `rube_v3_database`) y se cuentan las mismas métricas.
3. Se considera **pérdida sospechosa** (`suspiciousLoss`) cuando se cumplen TODAS estas condiciones:
   - No es la primera escritura.
   - **El número de tareas activas es idéntico** entre disco y nuevo estado (`sameTaskPopulation`).
   - El disco previo tenía comments (`prevComments > 0`).
   - El nuevo estado tiene **0 comments** o **menos de la mitad** de los previos.
4. Si es pérdida sospechosa, **se bloquea la escritura**: la BD corrupta **no se persiste**, y se registra un error en consola. El disco conserva la última copia íntegra.
5. En caso contrario, se escribe normalmente.

**Racionalidad del filtro `sameTaskPopulation`:**
- Permite operaciones legítimas como **borrar una tarea** (disminuye el nº de tareas activas), **borrar una nota puntual** (no llega a caer al 50%), o **crear tareas nuevas** (aumenta el nº de tareas).
- Solo bloquea el patrón sospechoso: **las mismas tareas siguen ahí, pero a todas se les vaciaron sus notas**.

### Excepción explícita (Restauración)
`MigrationEngine.saveDatabase(db, { skipIntegrityGuard: true })`:
- Se usa **únicamente** en `importBackupData()`, es decir, cuando el usuario **explícitamente** restaura un respaldo (desde Dropbox, archivo o sync).
- La restauración es una decisión deliberada del usuario: puede sobrescribir la BD local con menos comments, y el guard NO debe bloquearla.

---

## 4. Capa 2 — Guard de Subida a la Nube

### Función: `DropboxService.hasSuspiciousCommentLoss(...)`

`src/services/DropboxService.ts`

Antes de subir el respaldo a Dropbox, `performAutoSync()` ejecuta:

1. `countActiveComments(items)` — cuenta el total de comments de tareas activas (no papelera).
2. Se comparan los **comments actuales** contra `userSettings.lastDropboxCommentCount` (el recuento de la **última subida exitosa**).
3. Se cancela la subida (`reason: 'comments_lost'`) cuando:
   - Existe una subida previa (`lastDropboxUploadTimestamp > 0`), y
   - La subida previa registró comments (`lastDropboxCommentCount > 0`) y la actual tiene `0`, **o** la anterior tenía `>= 10` comments y la actual cayó por debajo de la mitad.
4. Al cancelar, se mantiene `hasLocalChanges = true` y se guarda el estado en `lastDropboxUploadStatus` (el usuario lo verá en la pantalla de Dropbox como **"Subida CANCELADA por integridad: se detectó pérdida de comentarios..."**).

### Casos que NO bloquean:
- Primera subida (no existe recuento previo).
- La subida previa también tenía 0 comments y la actual también (nada que perder).
- Subida **manual forzada** (`forceManual: true`) o con `skipCommentIntegrityCheck: true`: decisión explícita de emergencia del usuario.

### Registro del recuento tras subida exitosa
Después de cada subida exitosa, se actualiza:

```ts
await updateUserSettings({
  lastDropboxUploadTimestamp: timestamp,
  lastDropboxUploadStatus: statusMsg,
  hasLocalChanges: false,
  lastDropboxSnapshotFiles: [targetTextFile, targetImagesFile],
  lastDropboxCommentCount: commentCount, // Nuevo
});
```

---

## 5. Campos Nuevos en `UserSettings`

`src/models/UserSettings.ts`

| Campo | Tipo | Descripción |
|---|---|---|
| `lastDropboxCommentCount` | `number` | Recuento total de comments en tareas activas de la **última subida exitosa** a la nube. Basal para detectar pérdidas futuras. |
| `lastDropboxSessionCount` | `number` | Reservado/telemetría: recuento de sesiones de la última subida (sin lógica activa por ahora). |

Ambos valores se conservan al importar respaldos (merge en `importBackupData`) y por defecto valen `0`.

---

## 6. Archivos Modificados

| Archivo | Cambio |
|---|---|
| `src/models/UserSettings.ts` | Nuevos campos `lastDropboxCommentCount`, `lastDropboxSessionCount` en `UserSettings` y en `DEFAULT_USER_SETTINGS`. |
| `src/services/DropboxService.ts` | `countActiveComments()`, `hasSuspiciousCommentLoss()`, integridad pre-subida en `performAutoSync()`, registro de `lastDropboxCommentCount` tras éxito (las subidas ahora usan **snapshots pareados por timestamp** `rube_remember_backup_<TS>.json` + `rube_remember_images_<TS>.json`; ver `dropbox_cloud_infrastructure.md`). |
| `src/services/migration-engine.ts` | `persistDatabaseWithIntegrityGuard()`, integración en `saveDatabase()` con opción `skipIntegrityGuard`. |
| `src/hooks/use-remember-store.tsx` | Preservación de los nuevos campos al importar; `saveDatabase(mergedDb, { skipIntegrityGuard: true })` en restauración. |

---

## 7. Verificación Manual (Checklist)

1. **Pérdida local**: con una BD que tenga tareas con comments, forzar un guardado donde todas las tareas activas tengan `comments: []` y el MISMO nº de tareas → debe **bloquearse la escritura** y aparecer en consola:
   ```
   [MigrationEngine] INTEGRITY GUARD: Se bloqueó el guardado para prevenir pérdida de comentarios...
   ```
2. **Subida a la nube**: con `lastDropboxCommentCount > 0` guardado y la BD local con `comments: []`, ejecutar auto-sync → debe cancelarse con `reason: 'comments_lost'` y NO sobrescribir Dropbox.
3. **Restauración**: restaurar un respaldo desde Dropbox/archivo con menos comments → debe permitirse (guarda con `skipIntegrityGuard: true`).
4. **Operaciones legítimas**: borrar una tarea, borrar una nota puntual, crear tareas → deben guardarse con normalidad sin disparar el guard.