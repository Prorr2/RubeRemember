export interface DocSection {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
}

export const DOCUMENTATION_DATA: DocSection[] = [
  {
    id: 'cognitive-engine',
    title: '🧠 Motor Cognitivo (Cognitive Engine)',
    category: 'Algoritmo',
    keywords: ['motor cognitivo', 'algoritmo', 'recomendacion', 'como funciona', 'puntuacion', 'score'],
    content: `El **Motor Cognitivo (Cognitive Engine)** es el núcleo de RubeRemember. Su función es calcular y sugerir la mejor tarea para realizar en un momento determinado, eliminando la fatiga de decisión.

### Funcionamiento detallado:
1. **ContextEngine**: Analiza la hora actual, el día de la semana y comprueba si estás en un bloque de tiempo protegido (como sueño o trabajo). También calcula el tiempo disponible hasta el próximo evento importante.
2. **ScoreEngine**: Asigna una puntuación base a cada tarea en función de su prioridad (Baja, Media, Alta), su fecha de vencimiento (las tareas próximas reciben más puntuación) y su urgencia.
3. **EnergyEngine (Fatiga)**: Lleva un registro de los tipos de energía (Creativa, Analítica, Administrativa, Física) de tus últimas 3 sesiones de enfoque. Si repites consecutivamente el mismo tipo de energía, aplica una penalización por fatiga cognitiva para animarte a variar de actividad.
4. **TransitionEngine (Flujos)**: Otorga un bonus de puntuación si la tarea actual coincide con tu secuencia de flujo favorita configurada en Ajustes (ej. hacer una tarea Creativa seguida de una Analítica).
5. **RecommendationEngine**: Filtra las tareas elegibles (que no estén en papelera, archivadas o completadas) y selecciona la que tiene la mayor puntuación cognitiva, junto con 3 alternativas.`
  },
  {
    id: 'focus-tasks',
    title: '🎯 Tareas en Enfoque (Focus Tasks)',
    category: 'Algoritmo',
    keywords: ['tareas enfoque', 'focus tasks', 'fijar tareas', 'focus', 'objetivos del dia', 'prioridad enfoque'],
    content: `El sistema de **Tareas en Enfoque (Focus Tasks)** permite al usuario seleccionar un subconjunto de tareas del día para que el motor les dé prioridad absoluta.

### Características principales:
- **Fijación Manual**: Puedes marcar una tarea como "Focus Task" (En enfoque) en el listado de tareas. Esto le colocará un pin visual.
- **Límite de Enfoque**: Puedes configurar en Ajustes el número máximo de tareas que puedes tener en enfoque simultáneamente (por defecto 3).
- **Prioridad del Algoritmo**: El \`FocusEngine\` otorga automáticamente un importante bonus cognitivo a las tareas en enfoque para asegurar que aparezcan como recomendación principal.
- **Enfoque bloqueado (Locked)**: Estas tareas representan tus objetivos clave del día y no entrarán en cooldown normal a menos que las desmarques o completes.`
  },
  {
    id: 'memos',
    title: '📅 Recordatorios Temporales (Memos)',
    category: 'Gestión',
    keywords: ['recordatorios temporales', 'memos', 'rango de fechas', 'alarmas de recordatorios', 'septiembre', 'dejar barba', 'intervalo'],
    content: `Los **Recordatorios Temporales (Memos)** están diseñados para cosas que necesitas recordar o mantener visibles durante un periodo de tiempo, pero que no constituyen una tarea ejecutable única. 

### Funcionamiento:
- **Franja Temporal**: Tienen una fecha de inicio (Start Date) y una fecha de finalización (End Date). Solo se mostrarán en la interfaz como "Activos" cuando la fecha del sistema esté dentro de este rango.
- **Categorización Automática**: Se dividen en tres pestañas dinámicas en su pantalla:
  1. **Activos**: Cuyo rango de tiempo abarca el día de hoy.
  2. **Programados**: Cuya fecha de inicio es futura.
  3. **Pasados o Completados**: Cuyo rango ya venció o han sido marcados manualmente como listos.
- **Alarma Opcional**: Cada Memo puede tener una alarma asociada (hora del día). El sistema sincronizará esta alarma con el servicio de notificaciones del dispositivo para alertarte el día de inicio a la hora elegida.`
  },
  {
    id: 'reminders',
    title: '🔔 Alarmas y Avisos Críticos (Reminders)',
    category: 'Gestión',
    keywords: ['alarmas', 'reminders', 'avisos criticos', 'notificaciones', 'notificacion expo', 'sincronizacion calendar'],
    content: `Las **Alarmas (Reminders)** representan alertas temporales fijas que deben cumplirse en momentos exactos del día.

### Comportamiento del sistema:
- **Interrupción Crítica**: Si una alarma tiene como fecha el día de hoy y su hora ya ha pasado o está sucediendo ahora, **interrumpe el flujo del motor cognitivo**. La recomendación principal de tareas se pausará y se mostrará la alarma en pantalla de forma obligatoria hasta que sea completada.
- **Fechas Múltiples**: Una alarma puede configurarse para sonar en múltiples fechas seleccionadas en un calendario visual.
- **Notificaciones del Sistema**: Se integran con \`expo-notifications\` para sonar en segundo plano en el dispositivo del usuario, incluso si la app está cerrada.`
  },
  {
    id: 'activities',
    title: '⚽ Ocio y Tiempo Libre (Activities)',
    category: 'Gestión',
    keywords: ['ocio', 'tiempo libre', 'actividades', 'descanso', 'ideas de ocio', 'deporte', 'social'],
    content: `La sección de **Ocio (Activities)** recopila ideas y planes recreativos para desconectar cuando tu jornada de trabajo ha finalizado o tu energía mental está al mínimo.

### Estructura:
- **Categorías**: Salud, Deporte, Social, Entretenimiento, Aprendizaje u Otro.
- **Recomendación Inteligente**: Si el motor detecta que estás en tu horario protegido de descanso/sueño o que has completado todas tus tareas pendientes del día, te sugerirá realizar un plan de ocio en lugar de una tarea de trabajo.
- **Gestión Rápida**: Permite añadir ideas de ocio rápidamente y programarlas para realizarlas más tarde.`
  },
  {
    id: 'sessions',
    title: '⏱️ Sesiones de Enfoque y Feedback',
    category: 'Rendimiento',
    keywords: ['sesiones de enfoque', 'temporizador', 'timer', 'post-sesion', 'hitos', 'habito', 'progreso', 'luna', 'terra', 'sol', 'astra'],
    content: `El **Temporizador** de RubeRemember es la herramienta para ejecutar tus tareas de forma inmersiva. Al iniciar una sesión, se bloquean las distracciones y se inicia la cuenta atrás.

### Feedback Post-Sesión:
Dependiendo del "peso" o tipo de bloque de la tarea finalizada, se te pedirá feedback de forma específica:
- **Bloque Luna (Completar)**: Tareas cortas o puntuales. Simplemente se registran como completadas.
- **Bloque Terra (Progreso)**: Tareas medianas. Se te pregunta el porcentaje de avance (0-100%) para actualizar el estado del proyecto.
- **Bloque Sol (Hitos)**: Tareas largas. El sistema te obliga a definir el *próximo paso concreto* que harás, guardándolo automáticamente en la descripción para la siguiente sesión.
- **Bloque Astra (Hábitos)**: Tareas repetitivas. Registra el cumplimiento y actualiza tu racha consecutiva.`
  },
  {
    id: 'settings',
    title: '⚙️ Configuración y Preferencias',
    category: 'Ajustes',
    keywords: ['configuracion', 'ajustes', 'horas protegidas', 'sueño', 'trabajo', 'secuencia de energia', 'duracion de bloques'],
    content: `El panel de **Ajustes** te da control absoluto sobre el cerebro del sistema.

### Opciones disponibles:
- **Duraciones de Bloques**: Ajusta los minutos asignados a los bloques Luna, Terra, Sol y Astra.
- **Límites**: Define cuántas Focus Tasks puedes tener activas a la vez.
- **Enfriamiento (Cooldown)**: Duración de la penalización cuando rechazas una tarea con "No ahora".
- **Horarios Protegidos**: Configura tu horario de sueño y trabajo. El motor cambiará de modo de sugerencias en base a estas horas.
- **Flujo de Trabajo Secuencial**: Ordena mediante controles arriba/abajo tu flujo idóneo de energías y pesos para ganar bonificaciones cognitivas en tareas que sigan dicho orden.`
  },
  {
    id: 'statistics',
    title: '📊 Estadísticas y Rachas',
    category: 'Rendimiento',
    keywords: ['estadisticas', 'rendimiento', 'racha', 'minutos', 'tiempo enfocado', 'graficos', 'historico'],
    content: `Las **Estadísticas** de la app no reflejan la cantidad de tareas creadas, sino la cantidad de **tiempo real de enfoque de calidad** invertido.

### Métricas calculadas:
- **Tiempo de Enfoque**: Suma de minutos reales en sesiones completadas.
- **Rachas (Streak)**: Días consecutivos completando al menos una sesión de enfoque de cualquier tipo.
- **Distribución de Esfuerzo**: Gráficos de barras que desglosan tus sesiones completadas según su tipo de energía o peso de bloque.
- **Historial Temporal**: Gráficos cronológicos de los últimos 7 y 30 días para evaluar tu constancia semanal.`
  },
  {
    id: 'goals',
    title: '🏆 Objetivos y Hitos (Goals & Roadmaps)',
    category: 'Gestión',
    keywords: ['objetivos', 'goals', 'roadmaps', 'fases', 'hitos', 'proyectos largo plazo'],
    content: `El módulo de **Objetivos (Goals)** te ayuda a estructurar proyectos de gran envergadura a largo plazo.

### Componentes:
- **Objetivo Principal**: El fin general del proyecto (ej. "Lanzar app al App Store").
- **Fases/Hitos**: Divisiones cronológicas del objetivo (ej. Fase 1: Prototipo, Fase 2: Backend, Fase 3: Pruebas).
- **Asociación de Tareas**: Puedes asignar cualquier tarea a un objetivo y fase específicos. Al editar la tarea, se desplegarán las fases disponibles para ese objetivo.`
  },
  {
    id: 'lists',
    title: '📝 Listas de Control (Checklists)',
    category: 'Gestión',
    keywords: ['listas de control', 'listas', 'notas', 'checklist', 'compras', 'tareas rapidas'],
    content: `Las **Listas (Lists)** son bloques de notas estructuradas ideales para cosas rápidas que no requieren el flujo del motor cognitivo (ej. Lista de la compra, ideas rápidas, maleta de viaje).

### Características:
- **Independientes**: No influyen en la puntuación del motor ni se sugieren en la home.
- **Sub-elementos**: Cada lista puede tener infinitos elementos con un interruptor de check/uncheck rápido.
- **Filtro Rápido**: Puedes verlas y editarlas desde la pestaña inferior de Notas y Listas en cualquier momento.`
  },
  {
    id: 'persistence',
    title: '💾 Guardado y Copia de Seguridad',
    category: 'Sistema',
    keywords: ['persistencia', 'copias de seguridad', 'backup', 'json', 'importar', 'exportar', 'guardado local', 'asyncstorage'],
    content: `RubeRemember almacena todos tus datos de forma local y segura en el dispositivo.

### Detalles técnicos:
- **AsyncStorage**: Utilizado como base de datos primaria reactiva para garantizar que la app responda al instante.
- **JSON Backup**: Puedes exportar tu base de datos completa como un archivo JSON comprimido y compartirlo o guardarlo.
- **Restauración**: En caso de cambiar de teléfono o reinstalar, puedes importar tu archivo JSON para recuperar el 100% de tus tareas, objetivos, configuraciones e historial de sesiones.`
  },
  {
    id: 'voice-assistant',
    title: '🎙️ Asistente de Voz Inteligente',
    category: 'Gestión',
    keywords: ['asistente de voz', 'comandos de voz', 'dictado', 'microfono', 'voz a texto', 'crear por voz', 'consultar listas', 'listas por voz'],
    content: `El **Asistente de Voz Inteligente** te permite interactuar con la aplicación y gestionar tus tareas o listas utilizando lenguaje natural y dictado por voz.

### Crear Elementos por Voz:
Para crear tareas, alarmas, recordatorios, ideas de ocio o planes futuros, debes dictar un comando que incluya palabras clave (configurables en Ajustes) para cada campo.
* **Nota importante**: Un elemento solo se creará si el comando incluye palabras clave explícitas que indiquen la acción (como "crear", "tarea", "recordatorio"). Las frases casuales o preguntas no generarán tareas accidentales.
* **Ejemplos de creación**:
  - *"crear tarea comprar café prioridad alta"*
  - *"crear alarma tomar medicina a las 21:00"*
  - *"crear recordatorio entrenar para mañana"*

### Consultar y Modificar Listas por Voz:
Puedes interactuar en tiempo real con tus listas de control y el asistente te responderá por voz y visualmente:
1. **Ver listas disponibles**: Pregunta cuáles son tus listas (ej. *"¿Cuáles son mis listas?"* o *"nombre de todas las listas que tengo"*).
2. **Ver elementos de una lista**: Pregunta por el contenido de una lista concreta (ej. *"¿Qué tiene la lista de la compra?"* o *"ver lista compras"*).
3. **Añadir elementos a una lista**: Puedes insertar nuevos elementos especificando la lista y el texto (ej. *"añade a la lista compras leche"* o *"añadir manzanas a la lista de compras"*). El asistente asociará el elemento a la lista correspondiente y confirmará la acción.

* **Búsqueda Inteligente de Listas (Fuzzy Match)**: El asistente no requiere que dictes el nombre literal exacto de la lista. El motor analiza el comando completo y filtra palabras comunes de relleno (como *lista, de, la, el, del, añade, ver*). De este modo, buscará de forma flexible cualquier coincidencia parcial significativa en tus listas creadas (ej. asociará correctamente *"ver lista compra"* con tu lista *"lista de la compra"*).`
  }
];
