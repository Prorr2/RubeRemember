import { MergeEngine } from './MergeEngine';
import { ItemType, Task } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function runTests() {
  console.log('--- Iniciando Tests de MergeEngine ---');

  // Test 1: Basic Item Merge - Remote more recent
  const localDb1: any = {
    version: 3,
    items: [
      {
        id: 't1',
        type: ItemType.TASK,
        title: 'Tarea Local Antigua',
        updatedAt: '2026-09-01T10:00:00Z',
        comments: [{ id: 'c1', text: 'Nota local 1', createdAt: '2026-09-01T10:00:00Z' }]
      }
    ],
    goals: [],
    lists: [],
    timeSlots: [],
    userSettings: {},
    statistics: { totalWorkedTime: 60, completedTasks: 1, currentStreak: 2, longestStreak: 5 },
    sessions: [],
    activityCategories: [],
    taskCategories: [],
    hourWeights: []
  };

  const remoteDb1: any = {
    version: 3,
    items: [
      {
        id: 't1',
        type: ItemType.TASK,
        title: 'Tarea Remota Reciente',
        updatedAt: '2026-09-05T12:00:00Z',
        comments: [{ id: 'c2', text: 'Nota remota 2', createdAt: '2026-09-05T12:00:00Z' }]
      },
      {
        id: 't2',
        type: ItemType.TASK,
        title: 'Tarea Nueva Remota',
        updatedAt: '2026-09-05T12:00:00Z',
        comments: []
      }
    ],
    goals: [],
    lists: [],
    timeSlots: [],
    userSettings: {},
    statistics: { totalWorkedTime: 120, completedTasks: 2, currentStreak: 3, longestStreak: 4 },
    sessions: [],
    activityCategories: [],
    taskCategories: [],
    hourWeights: []
  };

  const result1 = MergeEngine.mergeDatabases(localDb1, remoteDb1);
  assert(result1.success === true, 'Merge 1 debe ser exitoso');
  assert(!!result1.merged, 'Resultado merged no debe ser nulo');

  const merged1 = result1.merged!;
  assert(merged1.items.length === 2, 'Total de items post-merge debe ser 2');
  const t1 = merged1.items.find(i => i.id === 't1');
  assert(t1?.title === 'Tarea Remota Reciente', 'El item con updatedAt más reciente debe ganar los campos principales');
  assert((t1 as Task)?.comments?.length === 2, 'Los comentarios deben unirse sin pérdida (local c1 + remote c2)');
  assert(merged1.statistics.totalWorkedTime === 120, 'El tiempo trabajado debe ser el máximo (120)');
  assert(merged1.statistics.longestStreak === 5, 'La mejor racha debe ser el máximo (5)');

  // Test 2: Trash preservation - trash never revives
  const localDb2: any = {
    ...localDb1,
    items: [
      {
        id: 't_trash',
        type: ItemType.TASK,
        title: 'Tarea Borrada en Local',
        trash: true,
        updatedAt: '2026-09-02T10:00:00Z'
      }
    ]
  };

  const remoteDb2: any = {
    ...remoteDb1,
    items: [
      {
        id: 't_trash',
        type: ItemType.TASK,
        title: 'Tarea Activa en Remoto con updatedAt mayor',
        trash: false,
        updatedAt: '2026-09-05T10:00:00Z'
      }
    ]
  };

  const result2 = MergeEngine.mergeDatabases(localDb2, remoteDb2);
  assert(result2.success === true, 'Merge 2 debe ser exitoso');
  const t_trash = result2.merged!.items.find(i => i.id === 't_trash');
  assert(t_trash?.trash === true, 'Regla anti-resurrección: si trash es true en cualquiera, debe preservarse como true');

  // Test 3: Pre-merge Zero Task Safety
  const emptyDb: any = {
    version: 3,
    items: [],
    goals: [],
    lists: [],
    timeSlots: [],
    userSettings: {},
    statistics: {},
    sessions: [],
    activityCategories: [],
    taskCategories: [],
    hourWeights: []
  };

  const preMergeValidation = MergeEngine.validatePreMerge(remoteDb1, emptyDb);
  assert(!preMergeValidation.ok, 'Zero-task safety check debe bloquear merge si el origen remoto tiene 0 tareas y el local tiene tareas');
  assert(preMergeValidation.reason?.includes('Zero-task safety') === true, 'El error debe indicar Zero-task safety');

  // Test 4: Post-merge validation integrity
  const postMergeOk = MergeEngine.validatePostMerge(merged1, localDb1, remoteDb1);
  assert(postMergeOk.ok === true, 'Validación post-merge debe pasar cuando no hay pérdida de items o comentarios');

  // Corrupted merged database (loss of comments)
  const corruptedMerged: any = {
    ...merged1,
    items: [
      {
        id: 't1',
        type: ItemType.TASK,
        title: 'Tarea',
        comments: [] // Missing comments!
      }
    ]
  };
  const postMergeFail = MergeEngine.validatePostMerge(corruptedMerged, localDb1, remoteDb1);
  assert(!postMergeFail.ok, 'Validación post-merge debe fallar si se detecta pérdida de comentarios');
  assert(postMergeFail.reason?.includes('integridad de comentarios') === true, 'Debe indicar violación de integridad de comentarios');

  console.log('\n🎉 TODOS LOS TESTS DE MERGEENGINE COMPLETADOS CON ÉXITO.');
}

runTests();
