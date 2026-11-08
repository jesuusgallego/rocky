import { computed, Service, signal } from '@angular/core';
import { ExerciseId, RoutineId } from './exercise-catalog';
import {
  discardDraft,
  ExerciseResult,
  finishSession,
  nextRoutine,
  recordMaxTest,
  recordSet,
  removeSet,
  SessionSummary,
} from './progression';
import { looksLikeBackup, normalizeState, TrainingState } from './training-state';

const STORAGE_KEY = 'rocky.training';

/**
 * Único sitio que guarda y cambia el estado de los entrenamientos.
 * Las reglas están en progression.ts; este servicio las aplica, guarda el resultado
 * y avisa a la pantalla a través de signals.
 */
@Service()
export class TrainingStore {
  private readonly stateSignal = signal<TrainingState>(loadState());
  /** Rutina elegida a mano con el selector A/B. No se guarda: es solo para hoy. */
  private readonly chosenRoutine = signal<RoutineId | null>(null);

  readonly state = this.stateSignal.asReadonly();
  readonly routine = computed(() => nextRoutine(this.stateSignal(), this.chosenRoutine()));

  chooseRoutine(routine: RoutineId): void {
    if (this.stateSignal().draft) return;
    const natural = nextRoutine(this.stateSignal(), null);
    this.chosenRoutine.set(routine === natural ? null : routine);
  }

  recordSet(id: ExerciseId, setIndex: number, value: number): void {
    this.commit(recordSet(this.stateSignal(), this.routine(), id, setIndex, value, Date.now()));
  }

  removeSet(id: ExerciseId, setIndex: number): void {
    this.commit(removeSet(this.stateSignal(), id, setIndex));
  }

  discardSession(): void {
    this.chosenRoutine.set(null);
    this.commit(discardDraft(this.stateSignal()));
  }

  finishSession(): SessionSummary | null {
    const result = finishSession(this.stateSignal(), Date.now());
    if (!result) return null;
    this.chosenRoutine.set(null);
    this.commit(result.state);
    return result.summary;
  }

  recordMaxTest(reps: number): ExerciseResult | null {
    const { state, result } = recordMaxTest(this.stateSignal(), reps, Date.now());
    this.commit(state);
    return result;
  }

  /** Texto JSON con todos los datos. */
  exportBackup(): string {
    return JSON.stringify(this.stateSignal(), null, 2);
  }

  /** Sustituye todos los datos por los de una copia. Lanza un error si el archivo no es válido. */
  importBackup(json: string): { sessions: number; tests: number } {
    const raw: unknown = JSON.parse(json);
    if (!looksLikeBackup(raw)) throw new Error('No es una copia de seguridad de Rocky');
    const state = normalizeState(raw);
    this.chosenRoutine.set(null);
    this.commit(state);
    return { sessions: state.sessions.length, tests: state.tests.length };
  }

  private commit(next: TrainingState): void {
    if (next === this.stateSignal()) return;
    next.updatedAt = Date.now();
    this.stateSignal.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin espacio o almacenamiento bloqueado: los datos siguen en memoria mientras la app esté abierta.
    }
  }
}

function loadState(): TrainingState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : null);
  } catch {
    // Datos corruptos: empezamos de cero.
    return normalizeState(null);
  }
}
