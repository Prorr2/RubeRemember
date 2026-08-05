# Guía Completa de RubeRemember V3 — Motor Cognitivo e Interfaz

Bienvenido a **RubeRemember V3**. Esta aplicación ha evolucionado para convertirse en un asistente inteligente de enfoque y productividad personal. La inteligencia de la aplicación no reside en las pantallas, sino en su **Cognitive Engine**, un motor lógico secuencial que decide qué debes hacer a continuación en función de tu energía, fatiga, horarios y objetivos.

Aquí tienes una explicación detallada de todo lo que puedes hacer con la aplicación y cómo funciona cada sección:

---

## 🧠 1. El Cerebro: Cognitive Engine

El motor decide la mejor tarea para ti evaluando continuamente las siguientes variables:
- **Disponibilidad de Tiempo**: Estima el tiempo libre disponible antes del próximo bloque protegido (como horas de sueño o trabajo) para sugerirte tareas que encajen exactamente en ese espacio.
- **Historial de Fatiga (Energy Engine)**: Penaliza las tareas que requieren tipos de energía similares a las que has usado recientemente para evitar el agotamiento mental y mantener el flujo.
- **Transiciones Óptimas (Transition Engine)**: Premia la realización de tareas que sigan tu orden preferido de energías y pesos (configurado en Ajustes).
- **Enfriamiento por Rechazo (Cooldown)**: Si decides rechazar una tarea usando el botón **"No ahora"**, esta entra en un periodo de enfriamiento temporal (por defecto 2 horas) y no volverá a sugerirse en ese lapso.

---

## 📱 2. Pantalla Principal: Panel de Control Inteligente

La pantalla principal se organiza en torno a las sugerencias automáticas del motor cognitivo:

### 🎯 Recomendación Principal
- **Qué muestra**: La mejor tarea recomendada con su título, su peso (Luna, Terra, Sol, Astra) y su tipo de energía.
- **Porcentaje de Coincidencia (Match %)**: Te indica cuán óptima es la sugerencia. Si la sesión recomendada se acorta por falta de tiempo o la tarea está en cooldown, el porcentaje disminuye.
- **Razonamiento Lógico**: El motor te explica explícitamente *por qué* te recomienda esa tarea (ej. *"Se adapta a tu ventana de tiempo de 45 minutos"* o *"Sigue tu secuencia de flujo preferida"*).
- **Acciones**:
  - **Botón de Enfoque (Play)**: Inicia de inmediato una sesión de trabajo de la duración sugerida.
  - **Botón "No ahora"**: Aplica un cooldown a la tarea y recalcula instantáneamente una nueva recomendación.

### 📌 Tareas en Enfoque (Focus Tasks)
- Permite fijar de forma permanente tus tareas de mayor prioridad. El motor asigna automáticamente bonuses cognitivos para sugerir preferentemente estas tareas.

### 🔄 Otras Opciones (Alternativas)
- Si no deseas hacer la recomendación principal ni rechazarla, la aplicación te muestra 3 alternativas viables ordenadas por puntuación cognitiva para que elijas otra opción.

---

## ⏱️ 3. Sistema de Sesiones y Temporizador

Cuando inicias una sesión, la aplicación entra en un modo de enfoque inmersivo:
- **Temporizador**: Muestra una cuenta atrás con controles de pausa, reanudación y finalización manual o cancelación.
- **Cuestionario Post-Sesión**: Al terminar o completar la sesión, se te pide feedback para alimentar el motor:
  - **Bloques Terra (Avanzar)**: Te pregunta *"¿Has avanzado?"* y te permite actualizar el porcentaje de progreso ($0\% - 100\%$).
  - **Bloques Sol (Hitos)**: Te pide definir el próximo paso concreto para mantener el ritmo en tu próximo bloque.
  - **Bloques Astra (Hábitos)**: Registra el hábito y actualiza de forma transparente tu racha de cumplimiento.
  - **Bloques Luna (Completar)**: Registra la compleción de la tarea.

---

## ⚙️ 4. Configuración Avanzada

En el panel de configuración puedes ajustar al milímetro el comportamiento del algoritmo:
- **Duración de Bloques**: Define cuántos minutos dura cada tipo de bloque de trabajo (Luna, Terra, Sol, Astra).
- **Máximo de Focus**: Configura el límite de tareas que puedes fijar en el panel de Focus simultáneamente.
- **Duración del Cooldown**: Controla cuántos minutos dura la penalización al presionar "No ahora".
- **Horarios Protegidos**: Configura tus horas de sueño/descanso y trabajo. Durante las horas protegidas de sueño, el motor bloqueará sugerencias demandantes y priorizará tareas rápidas o descanso.
- **Notificaciones inteligentes**: Activa o desactiva alertas y recordatorios.
- **Orden Secuencial de Energías y Pesos (Drag & Drop con controles Up/Down)**: Define tu flujo de trabajo ideal ordenando qué energías (Creativa, Analítica, Administrativa, etc.) o qué pesos de bloque prefieres realizar uno detrás de otro. El motor premiará con bonuses a las tareas que sigan este patrón.

---

## 📊 5. Estadísticas de Rendimiento

Las estadísticas se generan de forma dinámica **únicamente analizando tu historial de sesiones de enfoque reales** (nunca del estado estático de las tareas):
- **Tiempo Enfocado**: Suma total de minutos reales de trabajo estructurado.
- **Contador de Sesiones**: Cuántos bloques de enfoque has completado con éxito.
- **Rachas (Streak)**: Registra tu racha actual y tu récord histórico de días consecutivos completando al menos una sesión de enfoque.
- **Distribución de Bloques (Pesos)**: Gráficos de barra que muestran en qué tipo de tareas (Luna, Terra, Sol, Astra) inviertes tu energía.
- **Distribución de Energías**: Frecuencia de sesiones realizadas por tipo de esfuerzo mental.
- **Actividad Semanal y Mensual**: Desglose diario de minutos trabajados para los últimos 7 días y los últimos 30 días.

---

## 📁 6. Gestión de Tareas, Alarmas y Ocio
- **Tareas**: Creación y edición con campos detallados de estimación de horas, fecha límite y tipo de energía requerida.
- **Alarmas y Recordatorios (Reminders)**: Se gestionan de manera independiente. Si configuras un recordatorio crítico para la hora actual, este **interrumpirá automáticamente el motor de recomendaciones**, mostrándose como la tarea obligatoria a resolver en ese momento.
- **Ocio y Actividades**: Crea listas de actividades de ocio personalizadas y categorizadas para que el motor te sugiera opciones recreativas cuando hayas completado tu jornada laboral o estés cansado.
