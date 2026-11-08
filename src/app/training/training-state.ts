import { ExerciseId, RoutineId } from './exercise-catalog';

/*
 * Todo lo que se guarda de tus entrenamientos. Es también el formato de la copia de seguridad:
 * si cambias un campo, las copias antiguas tienen que seguir importándose.
 */

/** Valores anotados de cada serie (repeticiones o segundos), por ejercicio. */
export type SetEntries = Partial<Record<ExerciseId, number[]>>;

export interface SessionRecord {
  type: RoutineId;
  /** Cuándo empezó (milisegundos desde 1970). */
  date: number;
  /** Cuándo se guardó. */
  saved?: number;
  entries: SetEntries;
  /** Nivel de cada ejercicio en esa sesión. */
  steps?: Partial<Record<ExerciseId, number>>;
  deload?: boolean;
  /** Ejercicios que subieron de nivel al guardar. */
  ups?: ExerciseId[];
}

export interface MaxTest {
  date: number;
  reps: number;
}

/** Qué pasó la última vez con un ejercicio. */
export type LastResult =
  'up' | 'test' | 'test-up' | 'test-hold' | 'max' | 'fail' | 'hold' | 'manual';

export interface ExerciseProgress {
  /** Nivel actual (0 = el primero). */
  step: number;
  /** Sesiones seguidas al tope en este nivel. */
  hits: number;
  last: LastResult | null;
  prev: number | null;
  /** Toca test de máximo (solo dominadas). */
  testDue: boolean;
  /** Ya se ha entrenado alguna vez. */
  seen: boolean;
  lastTest?: number;
}

/** Sesión en curso: lo que llevas anotado y aún no has guardado. */
export interface Draft {
  type: RoutineId;
  start: number;
  entries: SetEntries;
}

export interface Deload {
  /** Cuándo empezó la última descarga. */
  last: number;
  /** Hasta cuándo dura la descarga actual. */
  until: number;
  /** Hasta cuándo no volver a proponerla. */
  snooze: number;
}

export interface TrainingState {
  v: 2;
  sessions: SessionRecord[];
  tests: MaxTest[];
  prog: Partial<Record<ExerciseId, ExerciseProgress>>;
  draft: Draft | null;
  deload: Deload;
  updatedAt: number;
}

export function emptyState(): TrainingState {
  return {
    v: 2,
    sessions: [],
    tests: [],
    prog: {},
    draft: null,
    deload: { last: 0, until: 0, snooze: 0 },
    updatedAt: 0,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRoutineId(value: unknown): value is RoutineId {
  return value === 'A' || value === 'B';
}

function numberOr0(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/** ¿Tiene pinta de copia de seguridad? */
export function looksLikeBackup(raw: unknown): boolean {
  return isObject(raw) && Array.isArray(raw['sessions']);
}

/**
 * Convierte datos de origen desconocido (localStorage, un archivo importado) en un estado válido.
 * Descarta lo que no encaja y rellena lo que falta, así el resto de la app puede fiarse de los tipos.
 */
export function normalizeState(raw: unknown): TrainingState {
  const state = emptyState();
  if (!isObject(raw)) return state;

  if (Array.isArray(raw['sessions'])) {
    state.sessions = raw['sessions'].filter(
      (s) => isObject(s) && isRoutineId(s['type']) && isObject(s['entries']),
    );
  }
  if (Array.isArray(raw['tests'])) {
    state.tests = raw['tests'].filter((t) => isObject(t) && typeof t['reps'] === 'number');
  }
  state.updatedAt = numberOr0(raw['updatedAt']);

  if (isObject(raw['prog'])) state.prog = raw['prog'] as TrainingState['prog'];
  const draft = raw['draft'];
  if (isObject(draft) && isRoutineId(draft['type']) && isObject(draft['entries'])) {
    state.draft = draft as unknown as Draft;
  }
  const deload = isObject(raw['deload']) ? raw['deload'] : {};
  state.deload = {
    last: numberOr0(deload['last']),
    until: numberOr0(deload['until']),
    snooze: numberOr0(deload['snooze']),
  };
  return state;
}
