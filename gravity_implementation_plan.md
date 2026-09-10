Plan de Implementación — Categoría de Nota: Subtarea (Móvil y Web)
Implementar una nueva categoría de nota/tarea denominada Subtarea vinculada a una tarea principal. Se mostrará en la sección de notas de la tarea principal con fondo violeta, posicionada arriba del todo (saltándose el orden cronológico del resto de notas), se podrá crear directamente desde la sección de notas con los campos estándar de una tarea (heredando automáticamente el objetivo y la fase de la tarea principal sin pedirlos), y se listará también en la sección de "Mis Tareas".

1. User Review Required
IMPORTANT

Modelo de Datos Unificado: La subtarea se modela como un Item de tipo ItemType.TASK que contiene un atributo parentTaskId: string. Esto permite que funcione como una tarea con todas sus capacidades (score cognitivo, temporizador, checkbox de completado, peso horario y presencia en "Mis Tareas"), a la vez que se proyecta en la sección de notas de la tarea padre en la cabecera.
Herencia de Objetivo y Fase: Al crear una subtarea desde las notas de una tarea, se copian automáticamente el goalId y el phaseId de la tarea padre. En el formulario de creación de subtarea no se solicitan ni objetivo ni fase.
2. Cambios Propuestos
Componente 1: Modelos y Tipos Compartidos
[MODIFY] 
Task.ts
Añadir parentTaskId?: string; a la interfaz Task.
[MODIFY] 
types.ts
Añadir parentTaskId?: string; a la interfaz Task.
Componente 2: Tienda de Datos y CRUD (Móvil y Web)
[MODIFY] 
use-remember-store.tsx
Actualizar createTask para aceptar opcionalmente el parámetro parentTaskId?: string.
Asignar parentTaskId en el nuevo objeto Task antes de persistirlo.
[MODIFY] 
store.ts
Actualizar el método createTask en rememberStore para aceptar parentTaskId?: string dentro de los datos y guardarlo en el ítem.
Componente 3: App Móvil (src/app/tasks.tsx y src/app/editor.tsx)
[MODIFY] 
tasks.tsx
Sección de Notas / Roadmap (TaskRoadmap):
Obtener las subtareas de la tarea actual: store.items.filter(i => i.type === ItemType.TASK && !i.trash && i.parentTaskId === task.id).
Renderizar las subtareas arriba del todo, antes de las sesiones/notas cronológicas.
Estilo con fondo violeta (backgroundColor: 'rgba(191, 90, 242, 0.15)', borderColor: 'rgba(191, 90, 242, 0.45)'), badge ⚡ Subtarea en color violeta #BF5AF2, checkbox para alternar completado, badges de prioridad/energía/duración, y acciones rápidas.
Formulario Inferior de Nueva Nota / Subtarea:
Añadir selector/pestaña: [ 📝 Nueva Nota ]   [ ⚡ Nueva Subtarea ].
Si se selecciona ⚡ Nueva Subtarea, mostrar formulario simplificado:
Título (requerido)
Descripción / notas (opcional)
Prioridad (Baja, Media, Alta, Urgente)
Duración / Peso (Luna, Terra, Sol, Astra)
Tipo de Energía (Creativa, Analítica, etc.)
Franja horaria / Slot (opcional)
Mensaje informativo: "🎯 Hereda Objetivo y Fase de [Nombre de tarea padre]"
Botón "Crear Subtarea"
Sección "Mis Tareas" (renderTaskItem):
Si item.parentTaskId está presente, mostrar en la tarjeta un badge violeta ⚡ Subtarea con referencia ↳ [Título tarea padre] y borde izquierdo en acento violeta #BF5AF2.
[MODIFY] 
editor.tsx
Si la tarea en edición/creación tiene parentTaskId:
Ocultar o deshabilitar la selección manual de Objetivo y Fase, mostrando que están heredados de la tarea padre.
Componente 4: Web Desktop (App.tsx y TasksView.tsx)
[MODIFY] 
App.tsx
Modal de Roadmap y Notas (showRoadmapModal):
Consultar las subtareas de la tarea seleccionada: db.items.filter(i => i.type === ItemType.TASK && !i.trash && i.parentTaskId === selectedTaskId).
Renderizar las subtareas arriba del todo con fondo violeta (background: rgba(191, 90, 242, 0.15); border: 1px solid rgba(191, 90, 242, 0.4)), checkbox de completado, título, descripción y badges.
En el formulario inferior del modal, alternar entre [ 📝 Nueva Nota ] y [ ⚡ Nueva Subtarea ].
En modo subtarea, mostrar campos de título, descripción, prioridad, peso horario, energía y franja horaria, heredando automáticamente goalId y phaseId.
Editor Universal Web:
Ocultar campos de Objetivo y Fase cuando se edite una subtarea con parentTaskId.
[MODIFY] 
TasksView.tsx
En renderCard: si task.parentTaskId está presente, renderizar el badge violeta ⚡ Subtarea junto al título de la tarea padre y borde izquierdo violeta #BF5AF2.
3. Plan de Verificación
Pruebas Automatizadas
npx tsc --noEmit en rube-remember-web/ para confirmar 0 errores de tipos en la web.
npm run build en rube-remember-web/ para confirmar que el bundle de producción compila correctamente.
Comprobación de tipos en la app móvil con npx tsc --noEmit en la raíz del proyecto.
Verificación Manual
Creación desde Notas:
Abrir una tarea principal en la web y en la app móvil.
En la sección de notas/roadmap, seleccionar "Nueva Subtarea".
Rellenar título, prioridad y duración (verificar que no solicita Objetivo ni Fase).
Crear la subtarea.
Visualización en Notas:
Comprobar que la subtarea aparece arriba del todo con fondo violeta, por encima de las notas/sesiones cronológicas.
Marcar el checkbox de la subtarea desde las notas y verificar que se tacha y marca como completada.
Visualización en "Mis Tareas":
Ir a la lista general de tareas y comprobar que la subtarea aparece en la lista con su indicador violeta ⚡ Subtarea y el enlace a la tarea padre.
