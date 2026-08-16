# PROJECT_CONTEXT — RubeRemember

> Documento de contexto para el siguiente modelo de IA que intervenga en este proyecto.
> Léelo completo antes de tocar código. Mantenlo actualizado al final de cada sesión.

---

## 1. Qué es el proyecto

RubeRemember es una app de **productividad / memoria** que gestiona tareas, recordatorios,
actividades, memos, planes, objetivos, listas, franjas horarias, sesiones de enfoque y más.

Está compuesta por **dos aplicaciones**:

| App | Ubicación | Stack | Puerto |
|-----|-----------|-------|--------|
| **App móvil** (principal) | raíz del repo (`/`) | Expo ~54, React Native 0.81, expo-router, TypeScript | túnel via `npm start` |
| **App web** (compañera) | `rube-remember-web/` | Vite + React + TypeScript | `3001` |

El móvil es el producto real. La web sirve como **visor/editor de escritorio** y es la pieza
central de la **sincronización por red local**.

---

## 2. Arquitectura móvil (carpeta `src/`)

```
src/
  app/            # Pantallas (una por ruta de expo-router)
  components/     # Componentes UI compartidos
  constants/      # theme.ts (colores claro/oscuro), documentation.ts
  engines/        # Motores de lógica (score, energía, transiciones, recomendaciones, contexto, foco, sesión, cognitivo)
  hooks/          # Stores de estado
  models/         # Tipos / modelos
  repositories/   # Acceso a datos
  services/       # Servicios (notificaciones, voz, etc.)
```

### Stores (estado persistido en AsyncStorage)
- `src/hooks/use-remember-store.tsx` → store principal. Contiene:
  - `items` (tareas, recordatorios, actividades, memos, planes unificados con `type`).
  - `goals`, `lists`, `timeSlots`, `activityCategories`, `hourWeights`,
    `sessions`, `recommendations`, `userSettings`, `statistics`, `proximityDays`,
    `slotSeparationMinutes`.
  - **`exportBackupData(): Promise<string>`** → serializa todo el estado a JSON
    (`DatabaseV3`, `version: 3`).
  - **`importBackupData(json: string)`** → parsea y restaura el estado. Detecta y
    **migra backups antiguos** V1 (claves `rube_remember_*_v1`) usando
    `MigrationEngine.migrateV1ToV2()`. Devuelve `{ success, errors, importedKeys }`.
- `src/hooks/use-fitness-store.tsx` → store de entrenamiento/gimnasio.

### Pantallas (`src/app/`)
`index` (home), `tasks`, `reminders`, `activities`, `memos`, `plans`, `goals`,
`lists`, `slots`, `session` (enfoque), `statistics`, `search`, `settings`,
`help`, `trash`, `alarms`, `gym`, `editor`, **`backup`** (copias de seguridad + sync).

### Temas
`src/constants/theme.ts` expone `Colors` con variantes `light`/`dark`. Cada pantalla
usa `useColorScheme()` + `Colors[scheme]`.

---

## 3. Sincronización por Red Local (móvil ↔ ordenador)

### Concepto
El móvil y la web se sincronizan intercambiando el **JSON completo** (`exportBackupData`)
a través del servidor local de Vite de la web, **sin pasar por Internet** (misma red Wi-Fi).

### Servidor (`rube-remember-web/server.ts`)
Es un **plugin de middleware de Vite** (`localSyncPlugin`) que mantiene en memoria:
- `devices` (Map deviceId → info, TTL 60 s).
- `pendingRequests` (peticiones del PC al móvil, TTL 120 s).
- `receivedData` (JSON subido por el móvil, se consume una sola vez).
- `outgoingData` (JSON subido por la web, se consume una sola vez).

### Endpoints API
| Método + Ruta | Origen → Destino | Descripción |
|---|---|---|
| `GET /api/health` | ambos | Estado: `received`, `outgoing`, `devices` conectados |
| `POST /api/connect` | móvil → web | Registra el dispositivo (`deviceId`, `name`) |
| `POST /api/disconnect` | móvil → web | Desregistra el dispositivo |
| `POST /api/request` | web → web | Marca una petición pendiente hacia un `deviceId` |
| `GET /api/request?deviceId=` | móvil → web | Poll (cada 3 s): el servidor responde `request: true` una vez y la borra |
| `GET /api/devices` | web | Lista de dispositivos conectados |
| `POST /api/backup` | móvil → web | El móvil sube su JSON (`receivedData`) |
| `GET /api/backup/latest` | web | La web recoge el JSON del móvil (consumo único) |
| `POST /api/outgoing` | web → web | La web sube su JSON para el móvil (`outgoingData`) |
| `GET /api/outgoing` | móvil → web | El móvil recoge el JSON de la web (consumo único) |

> Flujo clave “PC solicita datos”: la web llama `POST /api/request` → el móvil lo detecta
> en su poll → hace `POST /api/backup` → la web hace `GET /api/backup/latest` → importa.

### Lado móvil (`src/app/backup.tsx`)
- Exportar a Google Drive / JSON (compartir archivo) y **importar** desde JSON.
- Sincronización local:
  - Campo editable con la dirección del ordenador (por defecto se deduce de
    `Constants.expoConfig.hostUri` → `http://<IP>:3001`, fallback `192.168.1.100`).
  - **Conectar/Desconectar**: el móvil se registra como dispositivo. Mientras está
    conectado, **polla `GET /api/request` cada 3 s** y, si el PC lo pide, sube sus datos.
  - **Enviar al Ordenador**: `POST /api/backup` directo.
  - **Recibir del Ordenador**: `GET /api/outgoing` + confirmación + `importBackupData`.
- `deviceId` estable se guarda en AsyncStorage (`rube_sync_device_id`).

### Lado web (`rube-remember-web/`)
- `src/store.ts` → `rememberStore` (mismo modelo de datos), `importBackupData`.
- `src/App.tsx` → botones de sync (Solicitar datos del Móvil, Enviar al Móvil, etc.),
  banner de estado, y UI completa (igual que el móvil).

---

## 4. Cambios recientes (sesión actual)

### 4.1 Sincronización Local Automatizada y Segura
* **Historial de IPs Persistente:** Se implementó almacenamiento con `AsyncStorage` en la app móvil para recordar las últimas 5 IPs de servidor utilizadas, mostrándolas como botones rápidos interactivos.
* **Flujo Automatizado (Push/Pull):** Se eliminaron los botones manuales de recibir en web y móvil. Ahora la app móvil realiza un sondeo continuo de salida y, al detectar datos entrantes del PC, levanta un `Alert` nativo con confirmación de sobreescritura. La web realiza un polling similar al revés para la importación fluida desde el móvil.
* **Resumen de Cambios (Changelog):** Antes de confirmar la importación en la app móvil, el sistema compara el JSON recibido con el actual y genera un resumen descriptivo detallando las tareas agregadas, eliminadas y editadas (incluyendo cambios de título, progreso, o estado de completado).
* **Seguridad (Localhost Middleware):** El servidor local de la web implementa una política estricta de puerto y middleware (`418 I'm a teapot`) que deniega conexiones externas no autorizadas a la web de administración desde otros dispositivos, mientras permite las llamadas de sincronización autorizadas del móvil e imprime registros en la consola de React.
* **Habilitación de Tráfico Cleartext (HTTP) en APK Compilada:** Se integró el plugin `expo-build-properties` en `package.json` (`~1.0.10`) y `app.json` configurando `usesCleartextTraffic: true` para Android. Esto soluciona el bloqueo de conexiones HTTP que realiza Android por defecto en compilaciones standalone (APK), permitiendo que la app compilada se conecte al servidor de sincronización local por IP igual que lo hace en Expo Go.

### 4.2 Paridad en el Editor y Tarjetas de Tareas Web
* **Asociación de Tareas:** Se actualizaron `rube-remember-web/src/types.ts` y `rube-remember-web/src/store.ts` para soportar plenamente `goalId`, `phaseId`, `timeSlotId`, `favourite` y `tags`.
* **Desplegables en el Editor Web:** El formulario universal en la web ahora permite seleccionar:
  * **Objetivo:** Relaciona la tarea con objetivos existentes de la base de datos.
  * **Subobjetivo / Fase:** Relaciona con subobjetivos específicos del objetivo seleccionado (filtrado dinámico).
  * **Franja de Ejecución:** Relaciona con franjas horarias configuradas.
  * **Destacado / Favorito:** Checkbox para marcar tareas importantes (destacadas con una estrella dorada `⭐`).
  * **Etiquetas:** Caja de texto para etiquetas separadas por comas.
* **Tarjetas Web:** Se muestran insignias visuales (badges) y emojis correspondientes a los metadatos asignados (Objetivo `🎯`, Subobjetivo `⛓️`, Franja de Ejecución `⏰`, y Etiquetas `#`) en las tarjetas de tareas en el navegador.

---

## 5. Tareas pendientes / ideas de mejora

- [ ] **Commitear la sincronización**: revisar `git diff`, asegurarse de no subir secretos, y hacer commit (incluye la web como nuevo directorio).
- [ ] **Fusión parcial de datos**: Actualmente la sincronización sobrescribe los datos completos con el cambio más reciente. Evaluar la fusión de colecciones por `updatedAt`.
- [ ] **Optimización del motor de recomendaciones en la Web**: Refinar el motor de puntuación en el cliente web para asegurar consistencia exacta en las sugerencias con respecto al cliente nativo.

---

## 6. Cómo ejecutar

```bash
# App móvil (Expo, en la raíz del repo)
npm install
npm start              # → expo start --tunnel (qr en el móvil con Expo Go)

# App web (en rube-remember-web)
cd rube-remember-web
npm install
npm run dev            # → Vite en http://localhost:3001 (sirve también la API de sync)
npm run build          # producción
```

---

## 7. Documentación existente (raíz del repo)

- `docs_rube_remember.md` — docs generales de la app.
- `new_concept.md`, `new_concept_implementation.md`, `new_implementation_guide.md`,
  `new_cognitive_arquitecture.md` — documentos de diseño/arquitectura (concepto nuevo,
  arquitectura cognitiva, guías de implementación).
- `rube_remember_v3_user_guide.md` — guía de usuario v3.
- `PROJECT_CONTEXT.md` — este archivo (contexto + historial de cambios).

> Regla: cada vez que un modelo haga cambios en este repo, debe **actualizar este
> documento** (sección 4 “Cambios recientes” y 5 “Tareas pendientes”) para que el
> siguiente modelo tenga el contexto al día.
