# Documentación Técnica de RubeRemember

Esta documentación detalla de manera exhaustiva la arquitectura, los modelos de datos, la gestión de estado y el funcionamiento detallado de cada una de las características de la aplicación **RubeRemember**. Su propósito es servir como una guía de referencia completa y estructurada para futuros desarrollos realizados por asistentes de inteligencia artificial u otros desarrolladores.

---

## 1. Arquitectura y Tecnologías Core

La aplicación está construida sobre el ecosistema **React Native** con **Expo** y utiliza los siguientes componentes tecnológicos clave:

*   **Framework Principal**: React Native (para la renderización nativa multiplataforma) con **Expo Router** v3 (para la gestión de navegación basada en archivos en `src/app/`).
*   **Lenguaje**: TypeScript (tipado estricto en toda la aplicación).
*   **Estilos**: Vanilla CSS con `StyleSheet` de React Native, alimentado por un sistema de temas centralizado en `src/constants/theme.ts`.
*   **Persistencia Local**: `@react-native-async-storage/async-storage` (almacenamiento clave-valor de tipo no relacional para guardar todo el estado localmente).
*   **Notificaciones Locales**: `expo-notifications` (para programar alarmas físicas y recordatorios push).
*   **Interactores del Sistema**: 
    *   `expo-file-system` (lectura y escritura de copias de seguridad e integraciones de calendario).
    *   `expo-sharing` (compartición de archivos `.json` y `.ics` nativamente en Android e iOS).
    *   `expo-intent-launcher` (apertura directa de archivos `.ics` en el calendario nativo de Android).
    *   `expo-image-picker` (selección de imágenes de la galería o captura fotográfica mediante cámara para las listas de tareas).

### Estructura de Directorios

```
/
├── assets/                     # Recursos visuales y fuentes
├── src/
│   ├── app/                    # Pantallas de la aplicación (Expo Router)
│   │   ├── _layout.tsx         # Layout raíz que inicializa el Store Provider
│   │   ├── index.tsx           # Dashboard principal (Chat de recordatorios, timelines y listas)
│   │   ├── slots.tsx           # Configuración de Franjas Horarias
│   │   ├── goals.tsx           # Configuración de Objetivos y Roadmaps
│   │   ├── backup.tsx          # Pantalla de Copias de Seguridad (Exportar/Importar JSON)
│   │   ├── alarms.tsx          # Deprecado (Redireccionado a index.tsx)
│   │   └── gym.tsx             # Deprecado (Redireccionado a index.tsx)
│   ├── components/             # Componentes de UI reutilizables
│   ├── constants/
│   │   └── theme.ts            # Tokens del diseño (colores, fuentes, espaciados)
│   └── hooks/
│       ├── use-remember-store.tsx  # Store global de estado y persistencia (Zustand-like React Context)
│       └── use-color-scheme.ts     # Hook auxiliar para detección de modo claro/oscuro
└── app.json                    # Configuración de permisos, empaquetado y plugins de Expo
```

---

## 2. Modelos de Datos (Interfaces de TypeScript)

Todo el flujo de datos se rige por interfaces definidas en `src/hooks/use-remember-store.tsx`:

```typescript
// Comentario asociado a un recordatorio (diseño similar a hilos de YouTube)
export interface Comment {
  id: string;
  text: string;
  createdAt: string; // Fecha en formato legible "HH:MM"
}

// Estructura principal de un Recordatorio/Tarea
export interface Reminder {
  id: string;
  text: string;
  date: string;              // Fecha principal de ejecución "YYYY-MM-DD"
  startDate?: string;        // Opcional: Fecha de inicio para tareas tipo rango "YYYY-MM-DD"
  endDate?: string;          // Opcional: Fecha de fin para tareas tipo rango "YYYY-MM-DD"
  dates?: string[];          // Listado de fechas específicas marcadas en calendario "YYYY-MM-DD"
  time: string;              // Hora en formato "HH:MM"
  completed: boolean;        // Estado de compleción
  alarmScheduled: boolean;   // Flag para saber si se programó alarma push
  createdAt: string;         // ISO String de creación
  comments?: Comment[];      // Comentarios de seguimiento
  pinned?: boolean;          // Flag de fijado (sección "Importante")
  timeSlotId?: string;       // Asociación a una Franja Horaria (TimeSlot)
  goalId?: string;           // Asociación a un Objetivo principal
  phaseId?: string;          // Asociación a una Fase del Roadmap
  estimatedHours?: number;   // Horas estimadas de trabajo para estimar carga
}

// Franjas Horarias configurables
export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;         // Hora de inicio "HH:MM"
  endTime: string;           // Hora de fin "HH:MM"
}

// Fase dentro de un Objetivo (Roadmap)
export interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;             // Posición secuencial
}

// Objetivo o Hito de Largo Plazo
export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string;         // "YYYY-MM-DD"
  endDate: string;           // "YYYY-MM-DD"
  phases: Phase[];           // Fases secuenciales
  createdAt: string;
  completed?: boolean;
}

// Elemento dentro de una Lista
export interface ListItem {
  id: string;
  text: string;
  imageUri?: string;         // URI local de la imagen adjunta (cámara o galería)
}

// Lista de recordatorios o elementos de notas
export interface ReminderList {
  id: string;
  name: string;
  items: ListItem[];
  collapsed?: boolean;       // Control de visibilidad en acordeón
  createdAt: string;
}
```

---

## 3. Motor de Estado: `RememberStore`

La aplicación utiliza un patrón de **Proveedor de Contexto Global** (`RememberStoreProvider`) que centraliza todo el estado en React y sincroniza automáticamente las operaciones de lectura/escritura con `AsyncStorage`.

### Sincronización Automática con `AsyncStorage`
El hook carga todo el estado del almacenamiento del dispositivo en el arranque (`useEffect` con un estado `loading`). Al realizar mutaciones de recordatorios, se ejecuta `saveReminders` el cual realiza los siguientes pasos:
1.  **Recálculo de Tiempos**: Ajusta automáticamente las horas de los recordatorios vinculados a franjas horarias con la función `recalculateSlotTimes`.
2.  **Actualización de Estado**: Modifica el estado reactivo (`setReminders`).
3.  **Persistencia**: Serializa y escribe el nuevo array en AsyncStorage mediante la clave `rube_remember_reminders_v1`.

### Operaciones del Store (Resumen del Contexto)
*   **Recordatorios**: CRUD completo (`addReminder`, `updateReminder`, `deleteReminder`, `toggleReminderCompleted`, `toggleReminderPinned`, `deleteCompleted`).
*   **Comentarios**: Gestión en segundo nivel (`addComment`, `updateComment`, `deleteComment`).
*   **Franjas Horarias**: Configuración y recalibración de slots (`addTimeSlot`, `updateTimeSlot`, `deleteTimeSlot`, `setSlotSeparationMinutes`).
*   **Objetivos**: Gestión de hitos y fases (`addGoal`, `updateGoal`, `deleteGoal`, `toggleGoalCompleted`, `addPhase`, `updatePhase`, `deletePhase`, `reorderPhases`).
*   **Listas**: Listas independientes con soporte multimedia (`addList`, `updateList`, `deleteList`, `toggleListCollapse`, `addListItem`, `updateListItem`, `deleteListItem`).
*   **Backups**: Exportación e importación de la base de datos de AsyncStorage en un string JSON (`exportBackupData`, `importBackupData`).

---

## 4. Implementación Detallada de Funcionalidades

### 4.1 Recordatorios y Barra de Entrada Inteligente (Chat UI)
La interfaz principal de recordatorios simula un chat interactivo.
*   **Barra de Composición (Composer)**: La parte inferior posee un campo de texto con un panel de control deslizable/colapsable. Desde este panel, el usuario puede asignar de manera inmediata un objetivo o franja horaria.
*   **Recordatorios sin fecha ("Cosas que quiero hacer")**: Si se desactiva la opción de programar fecha, el recordatorio se guarda en una categoría atemporal. Se muestran en un grid color turquesa (Teal) en la parte superior.
*   **Zoom Dinámico (Pinch to Zoom)**: La lista de mensajes (`FlatList`) está envuelta en un `PanResponder` adaptado para gestos multitáctiles. Si se detectan 2 dedos en la pantalla, calcula la distancia euclidiana inicial y actualiza el factor de escala `zoomScale` entre `0.55` y `0.9`. Este factor modifica dinámicamente el tamaño de fuente y padding del texto de los recordatorios en tiempo real.

---

### 4.2 Lógica de Franjas Horarias (Time Slots) y Separación Automática
El cálculo de horas automáticas para recordatorios vinculados a franjas horarias es una característica central de la aplicación:

```typescript
function recalculateSlotTimes(
  items: Reminder[],
  slots: TimeSlot[],
  separation: number
): Reminder[] {
  const groupedByDate: Record<string, Reminder[]> = {};
  items.forEach((item) => {
    const activeDate = getReminderActiveDate(item);
    if (!groupedByDate[activeDate]) {
      groupedByDate[activeDate] = [];
    }
    groupedByDate[activeDate].push(item);
  });

  return items.map((item) => {
    if (!item.timeSlotId) return item;

    const slot = slots.find((s) => s.id === item.timeSlotId);
    if (!slot) {
      return { ...item, timeSlotId: undefined };
    }

    const activeDate = getReminderActiveDate(item);
    const dayReminders = (groupedByDate[activeDate] || [])
      .filter((r) => r.timeSlotId === item.timeSlotId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const index = dayReminders.findIndex((r) => r.id === item.id);
    if (index === -1) return item;

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const computedTotal = startTotal + index * separation;
    const computedH = Math.floor(computedTotal / 60) % 24;
    const computedM = computedTotal % 60;

    const formattedTime = `${String(computedH).padStart(2, '0')}:${String(computedM).padStart(2, '0')}`;
    return { ...item, time: formattedTime };
  });
}
```

*   **Capacidad de la Franja**: En la creación/edición, se verifica la capacidad del slot mediante la fórmula:
    $$\text{Capacidad Máxima} = \left\lfloor \frac{\text{Duración de la Franja (minutos)}}{\text{Minutos de Separación}} \right\rfloor$$
    Si la cantidad de tareas agendadas en ese slot y día supera la capacidad máxima, la aplicación muestra una alerta de "Franja horaria llena" y bloquea la creación o traslado.

---

### 4.3 Alarmas del Sistema e Integración con Calendarios Nativo y Google
La función `syncCalendarAndAlarms` interactúa con el sistema operativo para asegurar notificaciones eficientes:

1.  **Notificaciones Físicas Push**:
    *   Usa `expo-notifications`.
    *   Cancela cualquier alarma previa asociada con el ID del recordatorio para evitar duplicados.
    *   Crea alarmas para cada fecha registrada en `dates`. En Android, las notificaciones se canalizan en un canal de prioridad alta (`rube-remember-alarms`) con vibración y sonido personalizado.
2.  **Exportación y Apertura del Calendario Nativo (.ics)**:
    *   Genera un string estructurado en formato **iCalendar (RFC 5545)** con eventos `BEGIN:VEVENT` conteniendo metadatos como el ID del recordatorio, título, fecha de inicio y fin (duración estándar de 30 minutos).
    *   Guarda el archivo en `FileSystem.cacheDirectory` como `rube_remember_reminder_events.ics`.
    *   **En Android**: Pide la URI de contenido de Expo (`FileSystem.getContentUriAsync`) y utiliza `expo-intent-launcher` para enviar un intent con la acción `android.intent.action.VIEW` y tipo `text/calendar`. Esto abre la pantalla nativa de edición/adición de eventos del calendario del dispositivo del usuario. Si falla, hace fallback a `expo-sharing`.
    *   **En iOS / Web Fallback**: Usa `expo-sharing` para lanzar la hoja de compartir nativa (Share Sheet), permitiendo que el usuario lo abra con su aplicación de calendario predeterminada o lo envíe por mensajería.
3.  **Calendario de Google (Web Fallback)**:
    *   Al guardar un recordatorio de manera individual, también calcula el primer evento futuro y genera una URL formateada de Google Calendar (`https://calendar.google.com/calendar/render?action=TEMPLATE...`).
    *   Llama a `Linking.openURL(gcalUrl)` para abrir el navegador e importar el evento rápidamente a la cuenta de Google del usuario.

---

### 4.4 Objetivos, Fases y Líneas de Tiempo (Roadmaps)
*   **Gestión de Fases**: Los objetivos se dividen en fases secuenciales que se ordenan mediante un atributo `order`. Los usuarios pueden usar botones de desplazamiento hacia arriba/abajo para reordenar las fases, lo que dispara una llamada a `store.reorderPhases`.
*   **Creación Rápida de Tareas**: Cada fase cuenta con un input rápido que permite registrar recordatorios sin fecha asociados inmediatamente a dicho objetivo y fase.
*   **Cálculo de Carga e Índice de Prioridad (Timeline)**:
    En la pestaña de Líneas de Tiempo (Roadmaps), se calcula dinámicamente un índice de urgencia diaria basado en las horas estimadas y los días restantes:
    $$\text{Ratio de Prioridad} = \frac{\text{Horas Estimadas}}{\text{Días Disponibles}}$$
    Las tareas se ordenan de mayor a menor urgencia. La UI pinta las tarjetas con colores de prioridad:
    *   **Rojo ($\ge 4$ horas/día)**: Carga crítica.
    *   **Naranja ($\ge 2.5$ horas/día)**: Carga alta.
    *   **Amarillo ($\ge 1$ hora/día)**: Carga moderada.
    *   **Verde ($< 1$ hora/día)**: Carga óptima.

---

### 4.5 Módulo de Listas Multimedia
El segundo tab inferior de la aplicación sustituye la vista de chat por un gestor de listas dinámico.
*   **Estructura de la Lista**: Las listas son colapsables (`collapsed` booleano). Al estar expandidas, muestran inputs rápidos para agregar elementos de texto o multimedia.
*   **Doble Entrada Multimedia**:
    *   **Cámara**: Usa `ImagePicker.launchCameraAsync` para tomar una foto y guardarla localmente.
    *   **Galería**: Usa `ImagePicker.launchImageLibraryAsync` para seleccionar una imagen existente.
    *   La URI de la imagen seleccionada se almacena en el `imageUri` del `ListItem` de la lista y se renderiza con un componente `Image` de React Native con redimensionamiento `cover`.

---

### 4.6 Pantalla de Copias de Seguridad (Backup & Restore)
Esta pantalla implementa un motor de recuperación local robusto:
*   **Exportación**:
    *   `store.exportBackupData` empaqueta todas las claves del almacén (`reminders`, `timeSlots`, `goals`, `lists`, `slotSeparationMinutes`, `proximityDays`) en un único objeto JSON serializado.
    *   Se escribe el JSON en un archivo temporal en la memoria caché del sistema.
    *   Llama a `Sharing.shareAsync` con tipo MIME `application/json` y UTI `public.json` para abrir la hoja de distribución nativa.
*   **Importación**:
    *   Permite al usuario examinar archivos locales usando `DocumentPicker.getDocumentAsync`.
    *   Verifica la extensión del archivo (`.json`).
    *   Lee el contenido y ejecuta `store.importBackupData`.
    *   **Validación de Datos**: Durante la restauración, se valida la estructura interna del JSON. Si es correcta, se sobrescriben las respectivas claves de `AsyncStorage` y se actualiza el estado global de React. La aplicación informa con alertas si la importación fue completamente exitosa o parcial (indicando errores puntuales).

---

### 4.7 Interfaz Adaptativa y Sliding Split Pane
*   **Temas Claro y Oscuro**: La aplicación evalúa el esquema de color del sistema con `useColorScheme()`. Mapea los estilos usando la paleta de colores de `src/constants/theme.ts`:
    *   *Modo Oscuro*: Fondo `#000000`, elementos de tarjeta `#212225`, texto principal `#ffffff`.
    *   *Modo Claro*: Fondo `#ffffff`, elementos de tarjeta `#F0F0F3`, texto principal `#000000`.
*   **Sliding Split Pane (Panel Deslizable Superior)**:
    *   Para dar una sensación fluida en pantallas móviles, el panel superior (que contiene las Líneas de Tiempo, Eventos Próximos e Importantes) está controlado por un valor de animación `headerHeightAnim`.
    *   Cuando el usuario desliza la lista de chat hacia abajo (`FlatList` detecta el evento de scroll con `onScrollBeginDrag` y llama a `minimizeHeader`), el panel superior colapsa mediante una animación de resorte (`Animated.spring`) reduciendo su altura de `450` a `50`. Esto minimiza la sobrecarga visual, dejando un resumen en miniatura de la cantidad de eventos pendientes.
    *   Un botón tipo chevron centrado permite expandir y contraer manualmente el panel con rebotes naturales del motor de física nativa de React Native.

---

## 5. Resumen de Flujos Críticos para Mantenimiento de IA

> [!WARNING]
> **Modificación del Recálculo de Horas**: Cualquier cambio en la duración de las franjas horarias o los minutos de separación afectará la propiedad `time` de los recordatorios vinculados. La función `recalculateSlotTimes` se ejecuta en bloque dentro de `saveReminders`, por lo que cambios en esta función deben probarse minuciosamente para evitar loops infinitos o asignaciones horarias corruptas en `AsyncStorage`.

> [!IMPORTANT]
> **Permisos Nativos en Android**: Para que las alarmas y notificaciones funcionen correctamente en compilaciones de producción (APK/AAB), deben mantenerse los permisos declarados en `app.json` relacionados con `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM`, y la configuración del canal de notificaciones en el setup nativo.

> [!TIP]
> **Integración Multimedia**: En futuras actualizaciones que impliquen subir imágenes de las listas a la nube, se debe mapear la propiedad `imageUri` (que actualmente apunta a la memoria caché local de Expo `ph://` o `file://`) y procesar su carga a través de un servicio de almacenamiento (como Firebase Storage o S3) antes de persistir la dirección pública en la base de datos local.
