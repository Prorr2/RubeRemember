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

### 4.1 Integración de Texto Enriquecido (Imágenes y Enlaces Clicables)
* **Creación de componente `RichText` (Móvil):** Diseñado un componente React Native reutilizable en `src/components/rich-text.tsx` que detecta y formatea automáticamente URLs absolutas. Si la URL apunta a una imagen, renderiza un bloque de imagen (`Image`); si es un enlace web estándar, renderiza un texto clicable que se abre mediante el navegador nativo con `expo-web-browser`.
* **Creación de componente `RichText` (Web):** Implementado un componente React homólogo en `rube-remember-web/src/RichText.tsx` que proporciona la misma funcionalidad de detección y renderizado visual de enlaces e imágenes enriquecidos en el visor de escritorio de la web compañera.
* **Integración en Checklist y Sublistas:** Sustituido el componente de texto plano en `src/app/lists.tsx` por `<RichText />` para los elementos de lista y sublistas, adaptando la disposición de las filas con `alignItems: 'flex-start'` para que las casillas y botones se alineen correctamente al inicio si el texto incluye imágenes de gran altura.
* **Integración en Tareas, Historial y Memos:**
  * **App Móvil:** Integrado `<RichText />` en `src/app/tasks.tsx` (descripción de tarea, comentarios estilo chat, notas de sesión y pasos siguientes en el modal de progreso/roadmap), en `src/app/memos.tsx` (cuerpo de recordatorios) y en `src/app/activities.tsx` (descripción de hábitos sugeridos).
  * **App Web:** Integrado `<RichText />` en `rube-remember-web/src/App.tsx` en las mismas ubicaciones clave: tarjeta de recomendación cognitiva, lista de tareas, hábitos (ocio), memos (recordatorios), planes a largo plazo e historial de sesiones de progreso/roadmap.

### 4.2 Sincronización Local Automatizada y Segura
* **Historial de IPs Persistente:** Se implementó almacenamiento con `AsyncStorage` en la app móvil para recordar las últimas 5 IPs de servidor utilizadas, mostrándolas como botones rápidos interactivos.
* **Flujo Automatizado (Push/Pull):** Se eliminaron los botones manuales de recibir en web y móvil. Ahora la app móvil realiza un sondeo continuo de salida y, al detectar datos entrantes del PC, levanta un `Alert` nativo con confirmación de sobreescritura. La web realiza un polling similar al revés para la importación fluida desde el móvil.
* **Resumen de Cambios (Changelog):** Antes de confirmar la importación en la app móvil, el sistema compara el JSON recibido con el actual y genera un resumen descriptivo detallando las tareas agregadas, eliminadas y editadas (incluyendo cambios de título, progreso, o estado de completado).
* **Seguridad (Localhost Middleware):** El servidor local de la web implementa una política estricta de puerto y middleware (`418 I'm a teapot`) que deniega conexiones externas no autorizadas a la web de administración desde otros dispositivos, mientras permite las llamadas de sincronización autorizadas del móvil e imprime registros en la consola de React.
* **Habilitación de Tráfico Cleartext (HTTP) en APK Compilada:** Se integró el plugin `expo-build-properties` en `package.json` (`~1.0.10`) y `app.json` configurando `usesCleartextTraffic: true` para Android. Esto soluciona el bloqueo de conexiones HTTP que realiza Android por defecto en compilaciones standalone (APK), permitiendo que la app compilada se conecte al servidor de sincronización local por IP igual que lo hace en Expo Go.

### 4.3 Paridad en el Editor y Tarjetas de Tareas Web
* **Asociación de Tareas:** Se actualizaron `rube-remember-web/src/types.ts` y `rube-remember-web/src/store.ts` para soportar plenamente `goalId`, `phaseId`, `timeSlotId`, `favourite` y `tags`.
* **Desplegables en el Editor Web:** El formulario universal en la web ahora permite seleccionar:
  * **Objetivo:** Relaciona la tarea con objetivos existentes de la base de datos.
  * **Subobjetivo / Fase:** Relaciona con subobjetivos específicos del objetivo seleccionado (filtrado dinámico).
  * **Franja de Ejecución:** Relaciona con franjas horarias configuradas.
  * **Destacado / Favorito:** Checkbox para marcar tareas importantes (destacadas con una estrella dorada `⭐`).
  * **Etiquetas:** Caja de texto para etiquetas separadas por comas.
* **Tarjetas Web:** Se muestran insignias visuales (badges) y emojis correspondientes a los metadatos asignados (Objetivo `🎯`, Subobjetivo `⛓️`, Franja de Ejecución `⏰`, y Etiquetas `#`) en las tarjetas de tareas en el navegador.

### 4.4 Subida e Inserción de Imágenes en el Editor y Tareas
* **Selector de Imágenes Universal:** Integrado `expo-image-picker` para habilitar un selector que permite tomar fotos con la cámara (`📸`) o seleccionar imágenes de la galería (`🖼️`). Se ha desactivado la opción de recortar (`allowsEditing: false`) para que la imagen se suba de forma inmediata al ser capturada o seleccionada.
* **Optimización y Compresión:** Para evitar saturar el almacenamiento y asegurar la sincronización rápida con la versión web, las imágenes se comprimen al 30% (`quality: 0.3`) y se codifican en formato Base64 (`data:image/jpeg;base64,...`).
* **Visualización Optimizada y Pantalla Completa:** Las imágenes inline se muestran con una altura mayor de `240` en lugar de `180`. Al pulsar sobre cualquier imagen dentro de `RichText`, esta se despliega en un visor modal a pantalla completa (`Modal`) con un fondo oscuro y un botón de cierre flotante, permitiendo ver el archivo original perfectamente a gran tamaño.
* **Estrategia de Parsing de Descripción:** Para mantener la caja de entrada limpia y editable sin cadenas Base64 gigantescas:
  * Al cargar el editor, el sistema extrae las URLs de imágenes del campo `description` y las guarda en el estado `attachedImages`, dejando únicamente el texto editable en la caja de texto.
  * Al guardar, el editor vuelve a empaquetar el texto limpio y las URLs de imágenes adjuntas en una única descripción concatenada.
* **Integración en Inputs del Sistema:**
  * **Editor de Items (`editor.tsx`):** Añadido botón "Adjuntar Imagen" y visor de cuadrícula con opción de eliminar imágenes adjuntas.
  * **Listas y Checklist (`lists.tsx`):** Añadidos botones de adjuntar imagen rápidos en las filas de añadir elementos principales y sublistas.
  * **Notas de Sesión (`session.tsx`):** Añadido botón de adjuntar imagen rápido al registrar la nota de fin de sesión.

### 4.5 Pin Secundario de Tareas Activas ("Trabajando en este momento")
* **Extensión de Modelo `Task`:** Añadida la propiedad opcional `active?: boolean` al modelo de tareas para representar si el usuario está trabajando activamente en ella en el momento actual.
* **Segundo Botón de Pin en Tarjetas (`tasks.tsx`):** Añadido un botón con un icono de rayo verde (`#34C759`, `flash` / `flash-outline`) justo debajo del pin de hábito (naranja). Al pulsarlo, el estado de la tarea se alterna entre activa y no activa de manera reactiva e inmediata.
* **Sección "Trabajando en este momento" (`tasks.tsx`):** Creada una nueva sección al principio de la lista de tareas pendientes que renderiza todas las tareas marcadas como activas bajo un divisor con un rayo verde (`⚡ TRABAJANDO EN ESTE MOMENTO`).
* **Filtros e Interfaz Libre de Redundancia:** Las tareas activas se excluyen automáticamente de la lista principal de tareas pendientes cuando están en el filtro principal, evitando la duplicidad en pantalla mientras se mantienen visibles en su sección dedicada superior.

### 4.6 Estabilización de Imágenes en Listas y Correcciones de Referencias/JSX en Tareas
* **Estabilización de Imágenes en Mis Listas:** Implementado desacoplamiento de imágenes base64 en `src/app/lists.tsx` mediante estados de imagen separados (`newItemImages`, `editingItemImages`), agregando previews interactivos y borrado individual en listas y sublistas.
* **Corrección de JSX y Referencia de `Image` en `tasks.tsx`:** Reparado un cierre de etiquetas JSX incorrecto del modal de progreso/roadmap del historial de tareas, e importada la clase `Image` de React Native en `src/app/tasks.tsx` para corregir el error de referencia `Image` (imagen) que provocaba el fallo en la visualización de adjuntos en el roadmap.

### 4.7 Desacoplamiento de Datos de Imagen y Texto para Estabilidad y Rendimiento
* **Propiedades Independientes de Imagen:** Se agregaron campos independientes de imágenes `images?: string[]` a las estructuras de datos de `Task`, `Comment` y `ListItem`, así como `notesImages` y `nextStepImages` en la estructura de `Session` (también reflejadas en la versión web companion `rube-remember-web/src/types.ts`).
* **Actualización del Store Central y Servicios:** Se refactorizaron las acciones `createTask`, `addComment`, `addListItem`, `updateListItem` y `endSession` en el store central `src/hooks/use-remember-store.tsx` y en el servicio `SessionService.ts` para aceptar y guardar las imágenes de forma totalmente desacoplada del texto.
* **Componente RichText Universal:** Se adaptó el componente `<RichText />` para aceptar un prop opcional `images?: string[]`, renderizando automáticamente una cuadrícula de previsualización de imágenes inline con el visualizador a pantalla completa integrado. De este modo, las imágenes ya no se concatenan ni se confunden con texto.
* **Flujos de Entrada de Datos:**
  * **Sesiones de Enfoque (`session.tsx`):** Se modificó la pantalla de cuestionario post-sesión para gestionar la adición y borrado de imágenes de forma visual e independiente en un estado `noteImages`, guardándolas por separado en lugar de agregarlas como cadenas base64 gigantes en la entrada de texto.
  * **Comentarios y Listas:** Se actualizaron los controladores de adición de comentarios de tareas y elementos de listas para persistir los archivos adjuntos en el nuevo array de la base de datos de manera aislada.
* **Sanitizado Dinámico de Base de Datos (Mecanismo de Auto-Migración):** Se incorporó un sanitizador dinámico de base de datos (`sanitizeDatabase`) dentro de `MigrationEngine.getDatabase()` en `src/services/migration-engine.ts` que se ejecuta automáticamente al iniciar la app. Analiza en segundo plano descripciones de tareas, comentarios, elementos de lista y notas de sesión cargados de la base de datos y extrae cualquier imagen base64 concatenada heredada, colocándolas en los nuevos campos de forma limpia y transparente, previniendo crashes y saturaciones en el hilo de la interfaz de usuario.

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
