import {
  describeLevel,
  EXERCISES,
  ExerciseId,
  lastLevelIndex,
  Level,
  levelAt,
  RoutineId,
  ROUTINES,
} from './exercise-catalog';
import { ExerciseProgress, SessionRecord, TrainingState } from './training-state';

/*
 * Reglas de entrenamiento: qué toca hoy, cuándo se sube de nivel y qué pasa al guardar.
 *
 * Son funciones puras: reciben el estado y devuelven un resultado sin tocar nada más
 * (ni pantalla, ni localStorage). Así se pueden probar con tests sin arrancar la app.
 * Las que cambian algo devuelven un estado NUEVO en lugar de modificar el que reciben.
 */

const DAY = 86_400_000;
/** Repeticiones del test de máximo para pasar a dominadas con lastre. */
const TEST_PASS_REPS = 8;
/** Nivel de dominadas en el que se hace 5 × 5 y toca test para subir. */
const PULL_TEST_STEP = 2;
/** Nivel de dominadas en el que empieza el lastre. */
const PULL_WEIGHTED_STEP = 3;

const DEFAULT_PROGRESS: Readonly<ExerciseProgress> = Object.freeze({
  step: 0,
  hits: 0,
  last: null,
  prev: null,
  testDue: false,
  seen: false,
});

export function progressOf(state: TrainingState, id: ExerciseId): Readonly<ExerciseProgress> {
  return state.prog[id] ?? DEFAULT_PROGRESS;
}

/** Progreso modificable dentro de una copia del estado (lo crea si no existe). */
function editableProgress(state: TrainingState, id: ExerciseId): ExerciseProgress {
  return (state.prog[id] ??= { ...DEFAULT_PROGRESS });
}

export function isDeloadActive(state: TrainingState, now: number): boolean {
  return state.deload.until > now;
}

export function lastSession(state: TrainingState): SessionRecord | null {
  return state.sessions.at(-1) ?? null;
}

/** Días de calendario entre dos fechas (0 = mismo día, 1 = ayer → hoy). */
export function dayDiff(from: number, to: number): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Qué rutina toca: la de la sesión en curso, la elegida a mano o la contraria a la última. */
export function nextRoutine(state: TrainingState, chosen: RoutineId | null): RoutineId {
  if (state.draft) return state.draft.type;
  if (chosen) return chosen;
  return lastSession(state)?.type === 'A' ? 'B' : 'A';
}

/** Ejercicios de una rutina. Las negativas desaparecen al llegar a 5 × 5 en dominadas. */
export function visibleExercises(state: TrainingState, routine: RoutineId): ExerciseId[] {
  return ROUTINES[routine].exerciseIds.filter(
    (id) => id !== 'neg' || progressOf(state, 'pull').step < PULL_TEST_STEP,
  );
}

/** El objetivo de hoy para un ejercicio. */
export interface Plan extends Level {
  isTest: boolean;
}

export function planFor(state: TrainingState, id: ExerciseId, now: number): Plan {
  const progress = progressOf(state, id);
  const deload = isDeloadActive(state, now);
  if (id === 'pull' && progress.testDue && !deload) {
    return {
      sets: 1,
      min: 0,
      max: 0,
      variant: 'Una serie al fallo',
      perSide: false,
      extraKg: 0,
      isTest: true,
    };
  }
  const step = levelAt(id, progress.step);
  // En semana de descarga se hace la mitad de series.
  return { ...step, sets: deload ? Math.ceil(step.sets / 2) : step.sets, isTest: false };
}

/** Mejor marca de dominadas o chin-ups sin lastre, contando tests y sesiones. */
export function bestPullUps(state: TrainingState): number {
  let best = 0;
  for (const test of state.tests) best = Math.max(best, test.reps);
  for (const session of state.sessions) {
    for (const id of ['pull', 'chin'] as const) {
      const values = session.entries[id];
      if (!values) continue;
      const step = session.steps?.[id];
      if (step != null && step >= PULL_WEIGHTED_STEP) continue; // con lastre no cuenta
      for (const value of values) best = Math.max(best, value);
    }
  }
  return best;
}

/** Lo que hiciste en esa misma serie la última vez, si estabas en el mismo nivel. */
export function lastValue(
  state: TrainingState,
  id: ExerciseId,
  setIndex: number,
): number | undefined {
  const step = progressOf(state, id).step;
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const session = state.sessions[i];
    const values = session.entries[id];
    if (!values) continue;
    if (session.steps && session.steps[id] !== step) return undefined;
    return values[setIndex];
  }
  return undefined;
}

export type StatusKind = 'plain' | 'test' | 'up' | 'fail' | 'hold' | 'edge';

export interface ExerciseStatus {
  kind: StatusKind;
  label: string;
  text: string;
  /** Sesiones al tope que llevas de las que hacen falta. */
  dots?: { done: number; total: number };
}

export function exerciseStatus(state: TrainingState, id: ExerciseId, now: number): ExerciseStatus {
  const exercise = EXERCISES[id];
  const progress = progressOf(state, id);
  const need = exercise.sessionsToLevelUp;
  const dots = { done: progress.hits, total: need };

  if (isDeloadActive(state, now)) {
    return {
      kind: 'plain',
      label: 'Descarga',
      text: 'Mitad de series. Esta semana no cuenta para subir.',
    };
  }
  if (id === 'neg') return { kind: 'plain', label: 'Remate', text: 'No cuenta para subir.' };
  if (progress.testDue) {
    return {
      kind: 'test',
      label: 'Test hoy',
      text: `Calienta bien y haz una sola serie hasta el fallo. Con ${TEST_PASS_REPS} o más, pasas a lastre.`,
    };
  }
  switch (progress.last) {
    case 'up': {
      const previous = progress.prev ?? Math.max(0, progress.step - 1);
      return {
        kind: 'up',
        label: '↑ Subes hoy',
        text: `Nivel nuevo. Antes: ${describeLevel(id, previous)}.`,
      };
    }
    case 'test-up':
      return { kind: 'up', label: '↑ Subes hoy', text: 'Test superado: empiezas con lastre.' };
    case 'max':
      return {
        kind: 'plain',
        label: 'Tope',
        text: exercise.lastLevelNote ?? 'Último nivel de la escalera. Mantenlo.',
      };
    case 'fail':
      return {
        kind: 'fail',
        label: 'Repite',
        text: 'La última vez no llegaste al tope. Mismo objetivo.',
        dots,
      };
    case 'test-hold':
      return {
        kind: 'hold',
        label: 'Mantén',
        text: `Test de ${progress.lastTest ?? '?'}: sigues en 5 × 5 hasta el próximo test.`,
        dots,
      };
    case 'manual':
      return {
        kind: 'hold',
        label: 'Mantén',
        text: 'Nivel cambiado a mano. Contador a cero.',
        dots,
      };
  }
  if (need && progress.hits === need - 1) {
    const text =
      id === 'pull' && progress.step === PULL_TEST_STEP
        ? 'Si hoy completas todo al tope, la próxima A es test.'
        : 'Si hoy completas todo al tope, subes.';
    return { kind: 'edge', label: 'A un paso', text, dots };
  }
  if (!progress.seen)
    return { kind: 'plain', label: 'Empieza', text: `Subes tras ${need} sesiones al tope.`, dots };
  return {
    kind: 'hold',
    label: 'Mantén',
    text: `${progress.hits} de ${need} sesiones al tope.`,
    dots,
  };
}

/** Anota (o corrige) una serie de la sesión en curso. La crea si no había ninguna. */
export function recordSet(
  state: TrainingState,
  routine: RoutineId,
  id: ExerciseId,
  setIndex: number,
  value: number,
  now: number,
): TrainingState {
  const next = structuredClone(state);
  next.draft ??= { type: routine, start: now, entries: {} };
  const values = (next.draft.entries[id] ??= []);
  values[Math.min(setIndex, values.length)] = value;
  return next;
}

/** Quita una serie de la sesión en curso. Si no queda ninguna, la sesión desaparece. */
export function removeSet(state: TrainingState, id: ExerciseId, setIndex: number): TrainingState {
  const next = structuredClone(state);
  const values = next.draft?.entries[id];
  if (!next.draft || !values) return state;
  values.splice(setIndex, 1);
  if (!values.length) delete next.draft.entries[id];
  if (!Object.keys(next.draft.entries).length) next.draft = null;
  return next;
}

export function discardDraft(state: TrainingState): TrainingState {
  return { ...state, draft: null };
}

export type ResultKind = StatusKind | 'skip';

export interface ExerciseResult {
  id: ExerciseId;
  kind: ResultKind;
  text: string;
}

export interface SessionSummary {
  title: string;
  subtitle: string;
  results: ExerciseResult[];
}

/** Aplica un test de máximo dentro de una copia del estado. Devuelve el resultado si cambia la progresión. */
function applyMaxTest(
  state: TrainingState,
  reps: number,
  now: number,
): (ExerciseResult & { levelUp: boolean }) | null {
  state.tests.push({ date: now, reps });
  const progress = state.prog.pull;
  if (!progress?.testDue) return null;
  progress.testDue = false;
  progress.hits = 0;
  progress.seen = true;
  if (reps >= TEST_PASS_REPS) {
    progress.prev = progress.step;
    progress.step = PULL_WEIGHTED_STEP;
    progress.last = 'test-up';
    return {
      id: 'pull',
      kind: 'up',
      levelUp: true,
      text: `Test: ${reps}. La próxima empiezas con lastre: ${describeLevel('pull', PULL_WEIGHTED_STEP)}.`,
    };
  }
  progress.last = 'test-hold';
  progress.lastTest = reps;
  return {
    id: 'pull',
    kind: 'hold',
    levelUp: false,
    text: 'Test: ' + reps + '. Sigues en 5 × 5 y repites el test tras 3 sesiones completas.',
  };
}

/** Anota un test de máximo de dominadas fuera de una sesión. */
export function recordMaxTest(
  state: TrainingState,
  reps: number,
  now: number,
): { state: TrainingState; result: ExerciseResult | null } {
  const next = structuredClone(state);
  const result = applyMaxTest(next, reps, now);
  return { state: next, result: result && { id: result.id, kind: result.kind, text: result.text } };
}

/**
 * Guarda la sesión en curso y decide qué ejercicios suben de nivel:
 * - Todas las series al tope → suma una sesión. Con las necesarias, subes.
 * - Alguna por debajo → el contador vuelve a cero.
 * - Sin anotar → no cuenta ni a favor ni en contra.
 */
export function finishSession(
  state: TrainingState,
  now: number,
): { state: TrainingState; summary: SessionSummary } | null {
  if (!state.draft) return null;
  const next = structuredClone(state);
  const draft = next.draft!;
  const deload = isDeloadActive(next, now);
  const record: SessionRecord = {
    type: draft.type,
    date: draft.start || now,
    saved: now,
    entries: draft.entries,
    steps: {},
    deload,
    ups: [],
  };
  const results: ExerciseResult[] = [];

  for (const id of visibleExercises(next, draft.type)) {
    const values = draft.entries[id];
    record.steps![id] = progressOf(next, id).step;

    if (!values?.length) {
      results.push({ id, kind: 'skip', text: 'Sin anotar. No cuenta ni a favor ni en contra.' });
      continue;
    }
    if (deload) {
      results.push({ id, kind: 'plain', text: 'Descarga: no cuenta para subir.' });
      continue;
    }
    if (id === 'neg') {
      results.push({ id, kind: 'plain', text: 'Remate hecho.' });
      continue;
    }

    const progress = editableProgress(next, id);
    if (id === 'pull' && progress.testDue) {
      const test = applyMaxTest(next, Math.max(...values), now)!;
      if (test.levelUp) record.ups!.push(id);
      results.push({ id, kind: test.kind, text: test.text });
      continue;
    }

    const step = levelAt(id, progress.step);
    const need = EXERCISES[id].sessionsToLevelUp;
    const allAtTop =
      values.length >= step.sets && values.slice(0, step.sets).every((v) => v >= step.max);
    progress.seen = true;

    if (!allAtTop) {
      progress.hits = 0;
      progress.last = 'fail';
      results.push({
        id,
        kind: 'fail',
        text: `Sin llegar al tope. La próxima repites ${describeLevel(id, progress.step)}.`,
      });
      continue;
    }

    progress.hits++;
    if (progress.hits < need) {
      progress.last = 'hold';
      const left = need - progress.hits;
      results.push({
        id,
        kind: left === 1 ? 'edge' : 'hold',
        text:
          `Al tope. Llevas ${progress.hits} de ${need}` +
          (left === 1 ? ': la próxima completa y subes.' : '.'),
      });
      continue;
    }

    progress.hits = 0;
    if (id === 'pull' && progress.step === PULL_TEST_STEP) {
      progress.testDue = true;
      progress.last = 'test';
      results.push({
        id,
        kind: 'test',
        text: '5 × 5 dominado. La próxima A empieza con test de máximo.',
      });
    } else if (progress.step >= lastLevelIndex(id)) {
      progress.last = 'max';
      results.push({ id, kind: 'plain', text: 'Último nivel de la escalera completado.' });
    } else {
      progress.prev = progress.step;
      progress.step++;
      progress.last = 'up';
      record.ups!.push(id);
      results.push({ id, kind: 'up', text: `Subes a ${describeLevel(id, progress.step)}.` });
    }
  }

  next.sessions.push(record);
  next.draft = null;

  const ups = record.ups!.length;
  const subtitle = deload
    ? 'Semana de descarga.'
    : ups === 0
      ? 'Esta vez no sube nada.'
      : ups === 1
        ? 'Subes de nivel en 1 ejercicio.'
        : `Subes de nivel en ${ups} ejercicios.`;
  return {
    state: next,
    summary: { title: `${ROUTINES[record.type].name} guardada`, subtitle, results },
  };
}
